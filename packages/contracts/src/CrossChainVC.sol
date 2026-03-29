// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  CrossChainVC
 * @notice Cross-Protocol Verifiable Credential Bridge.
 *
 *         Enables portable trust credentials across chains and protocols:
 *           - Issue VCs on Tempo L1 that can be verified on any EVM chain
 *           - Bridge trust scores from external protocols (ERC-8004, Polygon ID, etc.)
 *           - Compact credential format for gas-efficient cross-chain messaging
 *
 *         Credential Types:
 *           - COMPLIANCE: Agent passed ZK compliance check (OFAC + AML)
 *           - REPUTATION: Agent meets reputation thresholds
 *           - TEE_ATTESTED: Agent runs in verified hardware enclave
 *           - INFERENCE_VERIFIED: Agent's AI model execution verified
 *           - KYA_TIER: Agent's KYA trust tier (0-4)
 *
 *         Verification:
 *           - On-chain: Call verifyCredential() on any chain with the signed VC
 *           - Off-chain: Verify EIP-712 signature using the issuer's public key
 *           - Cross-chain: Relay VC hash via messaging protocol (LayerZero, Hyperlane)
 *
 * @dev    EIP-712 signed credentials with chain-agnostic verification
 */

contract CrossChainVC {
    // ── EIP-712 ───────────────────────────────────────────

    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant VC_TYPEHASH = keccak256(
        "VerifiableCredential(address subject,bytes32 credentialType,uint256 issuedAt,uint256 expiresAt,uint256 sourceChainId,bytes32 dataHash)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;

    // ── Enums ─────────────────────────────────────────────

    bytes32 public constant TYPE_COMPLIANCE = keccak256("COMPLIANCE");
    bytes32 public constant TYPE_REPUTATION = keccak256("REPUTATION");
    bytes32 public constant TYPE_TEE = keccak256("TEE_ATTESTED");
    bytes32 public constant TYPE_INFERENCE = keccak256("INFERENCE_VERIFIED");
    bytes32 public constant TYPE_KYA = keccak256("KYA_TIER");
    bytes32 public constant TYPE_X402 = keccak256("X402_PAYMENT_HISTORY");

    // ── Structs ───────────────────────────────────────────

    struct Credential {
        address subject;          // The agent this credential is about
        bytes32 credentialType;   // One of the TYPE_* constants
        uint256 issuedAt;
        uint256 expiresAt;
        uint256 sourceChainId;    // Chain where the proof was generated
        bytes32 dataHash;         // Hash of the credential data payload
        address issuer;           // Who issued this credential
        bool revoked;
    }

    struct CredentialData {
        // For COMPLIANCE
        uint256 complianceCommitment;
        // For REPUTATION
        uint256 minTxCount;
        uint256 minVolume;
        // For KYA
        uint8 trustTier;
        // For X402
        uint256 paymentCount;
        uint256 paymentVolume;
    }

    // ── State ─────────────────────────────────────────────

    address public owner;

    /// @notice Approved issuers (can issue credentials)
    mapping(address => bool) public approvedIssuers;

    /// @notice Credential storage: credentialId → Credential
    mapping(bytes32 => Credential) public credentials;

    /// @notice Subject → credentialType → latest credentialId
    mapping(address => mapping(bytes32 => bytes32)) public latestCredential;

    /// @notice Subject → list of all credential IDs
    mapping(address => bytes32[]) public subjectCredentials;

    /// @notice Cross-chain credential anchors (foreign chain credential hash → local verification)
    mapping(bytes32 => bool) public anchoredCredentials;

    /// @notice Statistics
    uint256 public totalCredentials;
    uint256 public totalAnchored;

    // ── Events ────────────────────────────────────────────

    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed subject,
        bytes32 indexed credentialType,
        address issuer,
        uint256 expiresAt
    );

    event CredentialRevoked(bytes32 indexed credentialId, address indexed revoker);

    event CredentialAnchored(
        bytes32 indexed foreignCredentialHash,
        uint256 sourceChainId,
        address indexed subject
    );

    // ── Constructor ───────────────────────────────────────

    constructor() {
        owner = msg.sender;
        approvedIssuers[msg.sender] = true;

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("AgtFi-CrossChainVC"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // ── Issue Credentials ─────────────────────────────────

    /**
     * @notice Issue a new Verifiable Credential
     * @param subject Agent address the credential is about
     * @param credentialType Type of credential (use TYPE_* constants)
     * @param expiresAt Expiry timestamp (0 = never expires)
     * @param dataHash Hash of the credential data payload
     * @return credentialId Unique credential identifier
     */
    function issueCredential(
        address subject,
        bytes32 credentialType,
        uint256 expiresAt,
        bytes32 dataHash
    ) external returns (bytes32 credentialId) {
        require(approvedIssuers[msg.sender], "Not approved issuer");

        credentialId = keccak256(abi.encodePacked(
            subject, credentialType, block.timestamp, msg.sender
        ));

        credentials[credentialId] = Credential({
            subject: subject,
            credentialType: credentialType,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            sourceChainId: block.chainid,
            dataHash: dataHash,
            issuer: msg.sender,
            revoked: false
        });

        latestCredential[subject][credentialType] = credentialId;
        subjectCredentials[subject].push(credentialId);
        totalCredentials++;

        emit CredentialIssued(credentialId, subject, credentialType, msg.sender, expiresAt);
    }

    /**
     * @notice Issue credential with EIP-712 signed data (for off-chain verification)
     */
    function issueSignedCredential(
        address subject,
        bytes32 credentialType,
        uint256 expiresAt,
        bytes32 dataHash,
        uint8 v, bytes32 r, bytes32 s
    ) external returns (bytes32 credentialId) {
        // Verify issuer signature
        bytes32 structHash = keccak256(abi.encode(
            VC_TYPEHASH,
            subject,
            credentialType,
            block.timestamp,
            expiresAt,
            block.chainid,
            dataHash
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address issuer = ecrecover(digest, v, r, s);
        require(approvedIssuers[issuer], "Signer not approved issuer");

        credentialId = keccak256(abi.encodePacked(subject, credentialType, block.timestamp, issuer));

        credentials[credentialId] = Credential({
            subject: subject,
            credentialType: credentialType,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            sourceChainId: block.chainid,
            dataHash: dataHash,
            issuer: issuer,
            revoked: false
        });

        latestCredential[subject][credentialType] = credentialId;
        subjectCredentials[subject].push(credentialId);
        totalCredentials++;

        emit CredentialIssued(credentialId, subject, credentialType, issuer, expiresAt);
    }

    // ── Verify Credentials ────────────────────────────────

    /**
     * @notice Verify a credential is valid (not expired, not revoked)
     */
    function verifyCredential(bytes32 credentialId) external view returns (
        bool valid,
        address subject,
        bytes32 credentialType,
        address issuer,
        uint256 issuedAt,
        uint256 expiresAt
    ) {
        Credential storage vc = credentials[credentialId];
        subject = vc.subject;
        credentialType = vc.credentialType;
        issuer = vc.issuer;
        issuedAt = vc.issuedAt;
        expiresAt = vc.expiresAt;

        valid = vc.issuedAt > 0
            && !vc.revoked
            && (vc.expiresAt == 0 || block.timestamp <= vc.expiresAt)
            && approvedIssuers[vc.issuer];
    }

    /**
     * @notice Check if a subject has a valid credential of a specific type
     */
    function hasValidCredential(
        address subject,
        bytes32 credentialType
    ) external view returns (bool) {
        bytes32 credId = latestCredential[subject][credentialType];
        if (credId == bytes32(0)) return false;

        Credential storage vc = credentials[credId];
        return vc.issuedAt > 0
            && !vc.revoked
            && (vc.expiresAt == 0 || block.timestamp <= vc.expiresAt);
    }

    // ── Cross-Chain Anchoring ─────────────────────────────

    /**
     * @notice Anchor a credential from another chain
     *         Called by a bridge/relayer with the foreign credential hash
     */
    function anchorForeignCredential(
        bytes32 foreignCredentialHash,
        uint256 sourceChainId,
        address subject
    ) external {
        require(approvedIssuers[msg.sender], "Not approved anchor");
        require(!anchoredCredentials[foreignCredentialHash], "Already anchored");

        anchoredCredentials[foreignCredentialHash] = true;
        totalAnchored++;

        emit CredentialAnchored(foreignCredentialHash, sourceChainId, subject);
    }

    /**
     * @notice Check if a foreign credential has been anchored
     */
    function isAnchored(bytes32 foreignCredentialHash) external view returns (bool) {
        return anchoredCredentials[foreignCredentialHash];
    }

    // ── Revocation ────────────────────────────────────────

    /**
     * @notice Revoke a credential (only issuer or owner)
     */
    function revokeCredential(bytes32 credentialId) external {
        Credential storage vc = credentials[credentialId];
        require(
            msg.sender == vc.issuer || msg.sender == owner,
            "Not authorized to revoke"
        );
        require(!vc.revoked, "Already revoked");

        vc.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    // ── Queries ───────────────────────────────────────────

    /**
     * @notice Get all credential IDs for a subject
     */
    function getCredentialCount(address subject) external view returns (uint256) {
        return subjectCredentials[subject].length;
    }

    /**
     * @notice Get credential ID at index for a subject
     */
    function getCredentialAt(address subject, uint256 index) external view returns (bytes32) {
        return subjectCredentials[subject][index];
    }

    // ── Admin ─────────────────────────────────────────────

    function addIssuer(address issuer) external {
        require(msg.sender == owner, "Not owner");
        approvedIssuers[issuer] = true;
    }

    function removeIssuer(address issuer) external {
        require(msg.sender == owner, "Not owner");
        approvedIssuers[issuer] = false;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }
}
