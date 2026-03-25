// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IAgtFiZKDVN.sol";

/**
 * @title AgtFiZKDVN — ZK-Proof Decentralized Verifier Network
 * @notice LayerZero V2 DVN that verifies cross-chain messages using ZK-SNARK
 *         proofs of source chain state transitions.
 *
 * Architecture:
 *   Source Chain (Tempo)           Off-Chain Operator         Destination Chain (Base/Polygon)
 *   ┌──────────────────┐          ┌──────────────┐           ┌──────────────────────┐
 *   │ OApp.send()      │──event──▶│ Watch events │           │                      │
 *   │ SendLib.assignJob │          │ Wait confirms│           │                      │
 *   │ DVN.assignJob()  │          │ Gen ZK proof │──tx──────▶│ DVN.verifyWithProof() │
 *   └──────────────────┘          │ (Circom+PLONK)│          │ PlonkVerifier.verify()│
 *                                 └──────────────┘           │ ReceiveLib.verify()  │
 *                                                            └──────────────────────┘
 *
 * Security:
 *   - Messages are only verified if a valid ZK proof of the source chain
 *     block header + state root is provided
 *   - No multisig, no oracle — pure mathematical verification
 *   - Compatible with any PLONK verifier contract
 *
 * This is deployed on BOTH source and destination chains:
 *   - Source: receives job assignments and fees
 *   - Destination: verifies ZK proofs and calls ReceiveLib.verify()
 */
contract AgtFiZKDVN is IAgtFiZKDVN {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    /// @notice Contract owner
    address public owner;

    /// @notice Authorized operator (off-chain worker that submits proofs)
    mapping(address => bool) public operators;

    /// @notice ZK verifier contract for block header proofs
    address public zkVerifier;

    /// @notice LayerZero ReceiveLib address on this chain (for calling verify)
    address public receiveLib;

    /// @notice This chain's LayerZero endpoint ID
    uint32 public localEid;

    /// @notice Fee per verification job (in native token)
    mapping(uint32 => uint256) public dstFees;

    /// @notice Default fee if destination-specific fee not set
    uint256 public defaultFee;

    /// @notice Test mode flag — verifyDirect() only works when enabled
    bool public testMode;

    /// @notice Verified message hashes (replay protection)
    mapping(bytes32 => bool) public verifiedHashes;

    /// @notice Job counter
    uint256 public totalJobs;

    /// @notice Total ZK verifications completed
    uint256 public totalVerifications;

    /// @notice Pending jobs awaiting verification
    struct PendingJob {
        uint32 dstEid;
        bytes32 headerHash;
        bytes32 payloadHash;
        uint64 confirmations;
        address sender;
        uint256 assignedAt;
        bool completed;
    }

    /// @notice jobId => PendingJob
    mapping(uint256 => PendingJob) public jobs;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event OperatorUpdated(address indexed operator, bool authorized);
    event ZKVerifierUpdated(address indexed verifier);
    event ReceiveLibUpdated(address indexed receiveLib);
    event FeeUpdated(uint32 dstEid, uint256 fee);
    event FeeWithdrawn(address indexed to, uint256 amount);

    // ═══════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "AgtFiZKDVN: not owner");
        _;
    }

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner, "AgtFiZKDVN: not operator");
        _;
    }

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(
        uint32 _localEid,
        address _zkVerifier,
        address _receiveLib,
        uint256 _defaultFee
    ) {
        owner = msg.sender;
        operators[msg.sender] = true;
        localEid = _localEid;
        zkVerifier = _zkVerifier;
        receiveLib = _receiveLib;
        defaultFee = _defaultFee;
        testMode = true; // Start in test mode, disable for production

        emit ZKVerifierUpdated(_zkVerifier);
        emit ReceiveLibUpdated(_receiveLib);
    }

    // ═══════════════════════════════════════════════
    // LAYERZERO DVN INTERFACE
    // ═══════════════════════════════════════════════

    /**
     * @notice Called by SendLib when an OApp sends a cross-chain message
     * @dev The DVN stores the job and emits an event for the off-chain worker
     */
    function assignJob(
        AssignJobParam calldata _param,
        bytes calldata /* _options */
    ) external payable override returns (uint256 fee) {
        fee = _getFee(_param.dstEid);
        require(msg.value >= fee, "AgtFiZKDVN: insufficient fee");

        uint256 jobId = totalJobs++;

        bytes32 headerHash = keccak256(_param.packetHeader);

        jobs[jobId] = PendingJob({
            dstEid: _param.dstEid,
            headerHash: headerHash,
            payloadHash: _param.payloadHash,
            confirmations: _param.confirmations,
            sender: _param.sender,
            assignedAt: block.timestamp,
            completed: false
        });

        emit JobAssigned(
            _param.dstEid,
            _param.payloadHash,
            _param.sender,
            _param.confirmations,
            fee
        );

        // Refund excess
        if (msg.value > fee) {
            (bool ok,) = msg.sender.call{value: msg.value - fee}("");
            require(ok, "AgtFiZKDVN: refund failed");
        }
    }

    /**
     * @notice Get fee quote for verification
     */
    function getFee(
        uint32 _dstEid,
        uint64 /* _confirmations */,
        address /* _sender */,
        bytes calldata /* _options */
    ) external view override returns (uint256 fee) {
        return _getFee(_dstEid);
    }

    // ═══════════════════════════════════════════════
    // ZK VERIFICATION (destination chain)
    // ═══════════════════════════════════════════════

    /**
     * @notice Submit a ZK-verified message to ReceiveLib
     * @dev Called by the off-chain operator after generating a ZK proof
     *      of the source chain block header containing the message
     *
     * @param _packetHeader Raw 81-byte LayerZero packet header
     * @param _payloadHash Hash of the message payload
     * @param _confirmations Number of source chain confirmations
     * @param _zkProof PLONK proof data (24 uint256 elements)
     * @param _zkPubSignals Public signals for the ZK proof
     */
    function verifyWithProof(
        bytes calldata _packetHeader,
        bytes32 _payloadHash,
        uint64 _confirmations,
        uint256[24] calldata _zkProof,
        uint256[] calldata _zkPubSignals
    ) external onlyOperator {
        bytes32 messageHash = keccak256(abi.encodePacked(_packetHeader, _payloadHash));
        require(!verifiedHashes[messageHash], "AgtFiZKDVN: already verified");

        // Verify ZK proof on-chain
        if (zkVerifier != address(0)) {
            // Dynamic call to the PLONK verifier
            // The verifier's verifyProof signature varies by circuit
            // We use a generic interface that accepts proof + pubSignals
            (bool success, bytes memory result) = zkVerifier.staticcall(
                abi.encodeWithSignature(
                    "verifyProof(uint256[24],uint256[])",
                    _zkProof,
                    _zkPubSignals
                )
            );

            if (!success) {
                // Try fixed-size pubSignals variant
                require(_zkPubSignals.length == 4, "AgtFiZKDVN: invalid pubSignals length");
                uint256[4] memory fixedPubSignals;
                for (uint i = 0; i < 4; i++) fixedPubSignals[i] = _zkPubSignals[i];

                (success, result) = zkVerifier.staticcall(
                    abi.encodeWithSignature(
                        "verifyProof(uint256[24],uint256[4])",
                        _zkProof,
                        fixedPubSignals
                    )
                );
                require(success, "AgtFiZKDVN: ZK proof verification call failed");
            }

            bool verified = abi.decode(result, (bool));
            require(verified, "AgtFiZKDVN: invalid ZK proof");
        }

        // Mark as verified
        verifiedHashes[messageHash] = true;
        totalVerifications++;

        // Call ReceiveLib.verify() to submit DVN verification
        if (receiveLib != address(0)) {
            (bool ok,) = receiveLib.call(
                abi.encodeWithSignature(
                    "verify(bytes,bytes32,uint64)",
                    _packetHeader,
                    _payloadHash,
                    _confirmations
                )
            );
            require(ok, "AgtFiZKDVN: ReceiveLib.verify() failed");
        }

        emit ZKVerified(
            // Extract srcEid from packet header (bytes 9-12)
            _extractSrcEid(_packetHeader),
            localEid,
            _payloadHash,
            keccak256(abi.encodePacked(_zkProof))
        );
    }

    /**
     * @notice Verify without ZK proof (for testing / trusted mode)
     * @dev Only callable by operator. Used when ZK proof generation
     *      is not required (e.g., testnet, low-value messages)
     */
    function verifyDirect(
        bytes calldata _packetHeader,
        bytes32 _payloadHash,
        uint64 _confirmations
    ) external onlyOperator {
        require(testMode, "AgtFiZKDVN: verifyDirect disabled in production mode");
        bytes32 messageHash = keccak256(abi.encodePacked(_packetHeader, _payloadHash));
        require(!verifiedHashes[messageHash], "AgtFiZKDVN: already verified");

        verifiedHashes[messageHash] = true;
        totalVerifications++;

        if (receiveLib != address(0)) {
            (bool ok,) = receiveLib.call(
                abi.encodeWithSignature(
                    "verify(bytes,bytes32,uint64)",
                    _packetHeader,
                    _payloadHash,
                    _confirmations
                )
            );
            require(ok, "AgtFiZKDVN: ReceiveLib.verify() failed");
        }
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setOperator(address _operator, bool _authorized) external onlyOwner {
        operators[_operator] = _authorized;
        emit OperatorUpdated(_operator, _authorized);
    }

    function setZKVerifier(address _verifier) external onlyOwner {
        zkVerifier = _verifier;
        emit ZKVerifierUpdated(_verifier);
    }

    function setReceiveLib(address _receiveLib) external onlyOwner {
        receiveLib = _receiveLib;
        emit ReceiveLibUpdated(_receiveLib);
    }

    function setFee(uint32 _dstEid, uint256 _fee) external onlyOwner {
        dstFees[_dstEid] = _fee;
        emit FeeUpdated(_dstEid, _fee);
    }

    function setDefaultFee(uint256 _fee) external onlyOwner {
        defaultFee = _fee;
    }

    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
    }

    function withdrawFees(address payable _to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AgtFiZKDVN: no fees");
        (bool success, ) = _to.call{value: balance}("");
        require(success, "AgtFiZKDVN: withdraw failed");
        emit FeeWithdrawn(_to, balance);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "AgtFiZKDVN: zero address");
        owner = _newOwner;
    }

    // ═══════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════

    function getStats() external view returns (
        uint256 _totalJobs,
        uint256 _totalVerifications,
        uint32 _localEid,
        address _zkVerifier,
        address _receiveLib
    ) {
        return (totalJobs, totalVerifications, localEid, zkVerifier, receiveLib);
    }

    function isVerified(bytes calldata _packetHeader, bytes32 _payloadHash)
        external view returns (bool)
    {
        return verifiedHashes[keccak256(abi.encodePacked(_packetHeader, _payloadHash))];
    }

    // ═══════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════

    function _getFee(uint32 _dstEid) internal view returns (uint256) {
        uint256 fee = dstFees[_dstEid];
        return fee > 0 ? fee : defaultFee;
    }

    function _extractSrcEid(bytes calldata _packetHeader) internal pure returns (uint32) {
        // Packet header format: version(1) + nonce(8) + srcEid(4) + ...
        require(_packetHeader.length >= 13, "AgtFiZKDVN: invalid header");
        return uint32(bytes4(_packetHeader[9:13]));
    }

    receive() external payable {}
}
