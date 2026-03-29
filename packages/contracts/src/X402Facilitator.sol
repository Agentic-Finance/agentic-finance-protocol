// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  X402Facilitator
 * @notice On-chain settlement for x402 HTTP Payment Protocol (Coinbase standard).
 *
 *         x402 enables machine-to-machine payments over HTTP using the 402 Payment Required
 *         status code. This contract handles the on-chain settlement component:
 *
 *         Flow:
 *           1. Client requests resource → Server returns 402 + payment requirements
 *           2. Client signs EIP-712 payment authorization
 *           3. Client re-sends request with signed payment in header
 *           4. Server's facilitator calls this contract to settle payment
 *           5. Server delivers resource
 *
 *         EIP-712 Domain:
 *           name: "AgtFi-X402"
 *           version: "1"
 *           chainId: 42431
 *           verifyingContract: this
 *
 *         Supports:
 *           - EIP-712 signed payment authorizations
 *           - Nonce-based replay protection
 *           - Resource-specific pricing
 *           - Revenue splits (resource owner + protocol fee)
 *           - Payment receipt verification
 *
 * @dev    Implements the x402 "exact" payment scheme for EVM chains.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract X402Facilitator {
    // ── EIP-712 ───────────────────────────────────────────

    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "X402Payment(address payer,address payee,address token,uint256 amount,uint256 nonce,uint256 deadline,bytes32 resourceId)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;

    // ── Structs ───────────────────────────────────────────

    struct PaymentAuthorization {
        address payer;           // Agent paying for the resource
        address payee;           // Resource owner receiving payment
        address token;           // Payment token (AlphaUSD)
        uint256 amount;          // Payment amount
        uint256 nonce;           // Unique nonce (prevents replay)
        uint256 deadline;        // Expiry timestamp
        bytes32 resourceId;      // Hash of the resource URL/endpoint
    }

    struct Resource {
        address owner;           // Who receives payment
        uint256 price;           // Price per access
        address token;           // Required payment token
        bool active;             // Whether resource is available
        uint256 totalPaid;       // Total revenue collected
        uint256 totalAccesses;   // Total access count
    }

    struct Receipt {
        address payer;
        address payee;
        uint256 amount;
        bytes32 resourceId;
        uint256 settledAt;
        bytes32 txHash;
    }

    // ── State ─────────────────────────────────────────────

    address public owner;
    uint256 public protocolFeeBps = 100; // 1% default

    /// @notice Payer → nonce used tracking
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    /// @notice Registered resources (resourceId → Resource)
    mapping(bytes32 => Resource) public resources;

    /// @notice Payment receipts (receiptId → Receipt)
    mapping(bytes32 => Receipt) public receipts;

    /// @notice Accumulated protocol fees per token
    mapping(address => uint256) public protocolFees;

    /// @notice Total payments settled through this facilitator
    uint256 public totalPayments;
    uint256 public totalVolume;

    // ── Events ────────────────────────────────────────────

    event PaymentSettled(
        bytes32 indexed receiptId,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );

    event ResourceRegistered(
        bytes32 indexed resourceId,
        address indexed owner,
        uint256 price,
        address token
    );

    event ResourceUpdated(bytes32 indexed resourceId, uint256 newPrice, bool active);

    // ── Constructor ───────────────────────────────────────

    constructor() {
        owner = msg.sender;
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("AgtFi-X402"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // ── Resource Management ───────────────────────────────

    /**
     * @notice Register a resource (API endpoint, data feed, etc.) for x402 payments
     * @param resourceUrl The URL or identifier of the resource
     * @param price Price per access in token's smallest unit
     * @param token Payment token address
     */
    function registerResource(
        string calldata resourceUrl,
        uint256 price,
        address token
    ) external returns (bytes32 resourceId) {
        resourceId = keccak256(abi.encodePacked(resourceUrl, msg.sender));
        require(!resources[resourceId].active || resources[resourceId].owner == msg.sender, "Resource exists");

        resources[resourceId] = Resource({
            owner: msg.sender,
            price: price,
            token: token,
            active: true,
            totalPaid: 0,
            totalAccesses: 0
        });

        emit ResourceRegistered(resourceId, msg.sender, price, token);
    }

    /**
     * @notice Update resource pricing or status
     */
    function updateResource(bytes32 resourceId, uint256 newPrice, bool active) external {
        require(resources[resourceId].owner == msg.sender, "Not resource owner");
        resources[resourceId].price = newPrice;
        resources[resourceId].active = active;
        emit ResourceUpdated(resourceId, newPrice, active);
    }

    // ── Payment Settlement ────────────────────────────────

    /**
     * @notice Settle a payment using a signed EIP-712 authorization.
     *         Called by the resource server (facilitator) after receiving a valid payment header.
     *
     * @param auth The payment authorization details
     * @param v EIP-712 signature v
     * @param r EIP-712 signature r
     * @param s EIP-712 signature s
     * @return receiptId Unique receipt identifier
     */
    function settlePayment(
        PaymentAuthorization calldata auth,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bytes32 receiptId) {
        // 1. Verify deadline
        require(block.timestamp <= auth.deadline, "Payment expired");

        // 2. Verify nonce not used
        require(!usedNonces[auth.payer][auth.nonce], "Nonce already used");
        usedNonces[auth.payer][auth.nonce] = true;

        // 3. Verify resource exists and is active
        Resource storage resource = resources[auth.resourceId];
        require(resource.active, "Resource not active");
        require(auth.amount >= resource.price, "Insufficient payment");
        require(auth.payee == resource.owner, "Payee mismatch");
        require(auth.token == resource.token, "Token mismatch");

        // 4. Verify EIP-712 signature
        bytes32 structHash = keccak256(abi.encode(
            PAYMENT_TYPEHASH,
            auth.payer,
            auth.payee,
            auth.token,
            auth.amount,
            auth.nonce,
            auth.deadline,
            auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ecrecover(digest, v, r, s);
        require(signer == auth.payer, "Invalid signature");

        // 5. Calculate fee
        uint256 fee = (auth.amount * protocolFeeBps) / 10000;
        uint256 payeeAmount = auth.amount - fee;

        // 6. Transfer tokens (CEI: effects before interactions)
        receiptId = keccak256(abi.encodePacked(auth.payer, auth.nonce, block.timestamp));

        receipts[receiptId] = Receipt({
            payer: auth.payer,
            payee: auth.payee,
            amount: auth.amount,
            resourceId: auth.resourceId,
            settledAt: block.timestamp,
            txHash: bytes32(0) // Filled by indexer
        });

        resource.totalPaid += auth.amount;
        resource.totalAccesses += 1;
        protocolFees[auth.token] += fee;
        totalPayments += 1;
        totalVolume += auth.amount;

        // 7. Execute transfers
        IERC20 token = IERC20(auth.token);
        require(token.transferFrom(auth.payer, auth.payee, payeeAmount), "Payee transfer failed");
        if (fee > 0) {
            require(token.transferFrom(auth.payer, address(this), fee), "Fee transfer failed");
        }

        emit PaymentSettled(receiptId, auth.payer, auth.payee, auth.amount);
    }

    /**
     * @notice Verify a payment receipt exists and is valid
     */
    function verifyReceipt(bytes32 receiptId) external view returns (
        bool valid,
        address payer,
        address payee,
        uint256 amount,
        bytes32 resourceId,
        uint256 settledAt
    ) {
        Receipt memory r = receipts[receiptId];
        valid = r.settledAt > 0;
        return (valid, r.payer, r.payee, r.amount, r.resourceId, r.settledAt);
    }

    /**
     * @notice Get the next available nonce for a payer
     */
    function nextNonce(address payer) external view returns (uint256) {
        for (uint256 i = 0; i < type(uint256).max; i++) {
            if (!usedNonces[payer][i]) return i;
        }
        revert("No nonce available");
    }

    // ── Admin ─────────────────────────────────────────────

    function setProtocolFee(uint256 newFeeBps) external {
        require(msg.sender == owner, "Not owner");
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        protocolFeeBps = newFeeBps;
    }

    function withdrawFees(address token, address to) external {
        require(msg.sender == owner, "Not owner");
        uint256 amount = protocolFees[token];
        require(amount > 0, "No fees");
        protocolFees[token] = 0;
        IERC20(token).transfer(to, amount);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }
}
