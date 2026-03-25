// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentDiscoveryRegistry — "LinkedIn for AI Agents" (Privacy-Preserving)
 * @notice Decentralized registry where agents register capabilities and
 *         merchants discover agents by reputation — all without revealing identity.
 *
 * Problem (from a16z "Open Agentic Commerce"):
 *   Discovery is the biggest unsolved problem. x402scan.com and mppscan.com
 *   are static lists. Merchants can't query "find me agents with 100+ txs."
 *
 * Solution:
 *   Agents register with ZK reputation commitments. Merchants query by
 *   minimum requirements. Identity stays private. Reputation is verifiable.
 *
 * Features:
 *   - Register agent with capabilities (tags), endpoint, ZK commitments
 *   - Query by capability + minimum reputation
 *   - Reputation-gated tiers (Basic, Verified, Premium)
 *   - Pay-per-listing fee model (optional)
 */

interface IReputationRegistry {
    function meetsRequirements(uint256 agentCommitment, uint256 requiredTxCount, uint256 requiredVolume)
        external view returns (bool);
}

interface IComplianceRegistry {
    function isCompliant(uint256 commitment) external view returns (bool);
}

contract AgentDiscoveryRegistry {

    // ═══════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════

    enum Tier { Basic, Verified, Premium }

    struct AgentListing {
        uint256 reputationCommitment;    // ZK reputation ID (anonymous)
        uint256 complianceCommitment;    // ZK compliance ID
        string  endpoint;                // API endpoint URL
        string  capabilities;            // Comma-separated capability tags
        string  description;             // Human-readable description
        string  pricingModel;            // "per-call:0.001" or "session:0.05/min"
        Tier    tier;                     // Reputation tier
        uint256 registeredAt;
        uint256 lastActiveAt;
        bool    active;
    }

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;
    IReputationRegistry public reputationRegistry;
    IComplianceRegistry public complianceRegistry;

    /// @notice listingId => AgentListing
    mapping(bytes32 => AgentListing) public listings;

    /// @notice All listing IDs (for iteration)
    bytes32[] public allListingIds;

    /// @notice capability tag => listing IDs
    mapping(string => bytes32[]) public capabilityIndex;

    /// @notice Registration fee (in wei, 0 = free)
    uint256 public registrationFee;

    /// @notice Tier thresholds
    uint256 public verifiedMinTx;
    uint256 public verifiedMinVolume;
    uint256 public premiumMinTx;
    uint256 public premiumMinVolume;

    /// @notice listingId => registrant address
    mapping(bytes32 => address) public listingOwner;

    uint256 public totalListings;
    uint256 public totalActive;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event AgentRegistered(
        bytes32 indexed listingId,
        uint256 reputationCommitment,
        string capabilities,
        Tier tier,
        uint256 timestamp
    );

    event AgentUpdated(bytes32 indexed listingId, string endpoint, string capabilities);
    event AgentDeactivated(bytes32 indexed listingId);
    event AgentPinged(bytes32 indexed listingId, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(
        address _reputationRegistry,
        address _complianceRegistry
    ) {
        owner = msg.sender;
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        complianceRegistry = IComplianceRegistry(_complianceRegistry);

        // Default tier thresholds
        verifiedMinTx = 10;
        verifiedMinVolume = 10000_000000;   // $10K
        premiumMinTx = 100;
        premiumMinVolume = 100000_000000;   // $100K

        registrationFee = 0; // Free on testnet
    }

    // ═══════════════════════════════════════════════
    // CORE: Register & Discover
    // ═══════════════════════════════════════════════

    /**
     * @notice Register an agent in the discovery registry
     * @param _reputationCommitment ZK reputation commitment
     * @param _complianceCommitment ZK compliance commitment
     * @param _endpoint API endpoint URL
     * @param _capabilities Comma-separated tags (e.g., "research,data,nlp")
     * @param _description Human-readable description
     * @param _pricingModel Pricing info (e.g., "per-call:0.001")
     */
    function registerAgent(
        uint256 _reputationCommitment,
        uint256 _complianceCommitment,
        string calldata _endpoint,
        string calldata _capabilities,
        string calldata _description,
        string calldata _pricingModel
    ) external payable returns (bytes32 listingId) {
        require(msg.value >= registrationFee, "Discovery: insufficient fee");
        require(bytes(_endpoint).length > 0, "Discovery: empty endpoint");
        require(bytes(_capabilities).length > 0, "Discovery: empty capabilities");

        // Refund excess fee
        if (msg.value > registrationFee) {
            (bool refundOk, ) = msg.sender.call{value: msg.value - registrationFee}("");
            require(refundOk, "Discovery: refund failed");
        }

        // Determine tier based on reputation
        Tier tier = Tier.Basic;
        if (_reputationCommitment != 0) {
            if (reputationRegistry.meetsRequirements(
                _reputationCommitment, premiumMinTx, premiumMinVolume
            )) {
                tier = Tier.Premium;
            } else if (reputationRegistry.meetsRequirements(
                _reputationCommitment, verifiedMinTx, verifiedMinVolume
            )) {
                tier = Tier.Verified;
            }
        }

        // Generate listing ID
        listingId = keccak256(abi.encodePacked(
            _reputationCommitment,
            _complianceCommitment,
            block.timestamp,
            totalListings
        ));

        listings[listingId] = AgentListing({
            reputationCommitment: _reputationCommitment,
            complianceCommitment: _complianceCommitment,
            endpoint: _endpoint,
            capabilities: _capabilities,
            description: _description,
            pricingModel: _pricingModel,
            tier: tier,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp,
            active: true
        });

        allListingIds.push(listingId);
        listingOwner[listingId] = msg.sender;
        totalListings++;
        totalActive++;

        emit AgentRegistered(listingId, _reputationCommitment, _capabilities, tier, block.timestamp);
    }

    /**
     * @notice Heartbeat — agent pings to show it's alive
     */
    function ping(bytes32 _listingId) external {
        require(listings[_listingId].active, "Discovery: not active");
        require(listingOwner[_listingId] == msg.sender, "Discovery: not listing owner");
        listings[_listingId].lastActiveAt = block.timestamp;
        emit AgentPinged(_listingId, block.timestamp);
    }

    /**
     * @notice Deactivate a listing (by listing owner or contract owner)
     */
    function deactivate(bytes32 _listingId) external {
        AgentListing storage listing = listings[_listingId];
        require(listing.active, "Discovery: already inactive");
        require(msg.sender == owner || msg.sender == listingOwner[_listingId], "Discovery: not authorized");
        listing.active = false;
        totalActive--;
        emit AgentDeactivated(_listingId);
    }

    // ═══════════════════════════════════════════════
    // QUERY: Discover agents
    // ═══════════════════════════════════════════════

    /**
     * @notice Get total number of listings
     */
    function getListingCount() external view returns (uint256) {
        return allListingIds.length;
    }

    /**
     * @notice Get count of active listings only
     */
    function getActiveListingCount() external view returns (uint256) {
        return totalActive;
    }

    /**
     * @notice Get listing by ID
     */
    function getListing(bytes32 _listingId) external view returns (AgentListing memory) {
        return listings[_listingId];
    }

    /**
     * @notice Get listing ID by index (for pagination)
     */
    function getListingIdByIndex(uint256 _index) external view returns (bytes32) {
        require(_index < allListingIds.length, "Discovery: index out of bounds");
        return allListingIds[_index];
    }

    /**
     * @notice Check if an agent meets specific reputation requirements
     */
    function agentMeetsRequirements(
        bytes32 _listingId,
        uint256 _minTxCount,
        uint256 _minVolume
    ) external view returns (bool) {
        AgentListing memory listing = listings[_listingId];
        if (!listing.active) return false;
        if (listing.reputationCommitment == 0) return false;

        return reputationRegistry.meetsRequirements(
            listing.reputationCommitment,
            _minTxCount,
            _minVolume
        );
    }

    /**
     * @notice Check if an agent is compliant
     */
    function agentIsCompliant(bytes32 _listingId) external view returns (bool) {
        AgentListing memory listing = listings[_listingId];
        if (!listing.active) return false;
        if (listing.complianceCommitment == 0) return false;

        return complianceRegistry.isCompliant(listing.complianceCommitment);
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setRegistrationFee(uint256 _fee) external {
        require(msg.sender == owner, "Discovery: not owner");
        registrationFee = _fee;
    }

    function setTierThresholds(
        uint256 _verifiedTx, uint256 _verifiedVol,
        uint256 _premiumTx, uint256 _premiumVol
    ) external {
        require(msg.sender == owner, "Discovery: not owner");
        verifiedMinTx = _verifiedTx;
        verifiedMinVolume = _verifiedVol;
        premiumMinTx = _premiumTx;
        premiumMinVolume = _premiumVol;
    }

    function withdraw() external {
        require(msg.sender == owner, "Discovery: not owner");
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Discovery: withdraw failed");
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Discovery: not owner");
        require(_newOwner != address(0), "Discovery: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
