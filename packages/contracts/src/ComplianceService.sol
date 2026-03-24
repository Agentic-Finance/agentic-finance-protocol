// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ComplianceService — Enterprise ZK Compliance-as-a-Service
 * @notice Turnkey compliance for agent developers.
 *
 * Developer integration: ONE API call → agent is compliant.
 *
 * Services provided:
 *   1. KYA (Know Your Agent) — verify agent owner identity via ZK
 *   2. OFAC Screening — real-time sanctions check via ZK proof
 *   3. AML Monitoring — cumulative volume tracking via ZK range proofs
 *   4. EU AI Act — agent identity binding + audit trail
 *   5. Compliance Certificate — portable proof of compliance
 *
 * Business model:
 *   - Free tier: 100 compliance checks/month
 *   - Pro: $0.01 per check (pay-per-use)
 *   - Enterprise: custom pricing + SLA
 *
 * Why this is a moat:
 *   - ZK circuits are 6-12 months to build from scratch
 *   - Compliance data accumulates over time (can't be forked)
 *   - Regulatory relationships + licenses take years
 *   - First platform agents integrate with → switching costs
 */

interface IComplianceRegistry {
    function isCompliant(uint256 commitment) external view returns (bool);
    function verifyCertify(uint256[24] calldata _proof, uint256[4] calldata _pubSignals) external payable returns (bool);
}

contract ComplianceService {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;
    IComplianceRegistry public complianceRegistry;

    /// @notice API key => developer account
    struct DeveloperAccount {
        address wallet;
        string  name;
        uint256 tier;           // 0=free, 1=pro, 2=enterprise
        uint256 checksUsed;     // Total compliance checks used
        uint256 checksLimit;    // Monthly limit (0 = unlimited)
        uint256 createdAt;
        uint256 lastResetAt;    // Last monthly reset timestamp
        bool    active;
    }

    /// @notice Compliance check result
    struct ComplianceCheck {
        bytes32 checkId;
        bytes32 apiKeyHash;         // Which developer requested
        uint256 agentCommitment;    // Which agent was checked
        uint256 checkedAt;
        bool    isCompliant;
        string  checkType;          // "ofac", "aml", "kyc", "full"
        uint256 expiresAt;
    }

    /// @notice apiKeyHash => DeveloperAccount
    mapping(bytes32 => DeveloperAccount) public developers;

    /// @notice checkId => ComplianceCheck
    mapping(bytes32 => ComplianceCheck) public checks;

    /// @notice agentCommitment => latest checkId
    mapping(uint256 => bytes32) public latestCheck;

    /// @notice Tier limits
    uint256 public freeTierLimit;
    uint256 public proTierFee;        // Fee per check (wei)
    uint256 public checkValidity;     // How long a check result is valid

    uint256 public totalDevelopers;
    uint256 public totalChecks;
    uint256 public totalRevenue;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event DeveloperRegistered(bytes32 indexed apiKeyHash, address wallet, string name, uint256 tier);
    event ComplianceChecked(bytes32 indexed checkId, uint256 indexed agentCommitment, bool isCompliant, string checkType);
    event TierUpgraded(bytes32 indexed apiKeyHash, uint256 newTier);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(address _complianceRegistry) {
        owner = msg.sender;
        complianceRegistry = IComplianceRegistry(_complianceRegistry);
        freeTierLimit = 100;           // 100 free checks/month
        proTierFee = 0.00001 ether;    // ~$0.01 per check
        checkValidity = 86400;         // 24 hours
    }

    // ═══════════════════════════════════════════════
    // DEVELOPER REGISTRATION
    // ═══════════════════════════════════════════════

    /**
     * @notice Register as a developer
     * @param apiKeyHash Hash of the API key (key stored off-chain)
     * @param name Developer/company name
     */
    function registerDeveloper(bytes32 apiKeyHash, string calldata name) external {
        require(!developers[apiKeyHash].active, "ComplianceService: already registered");

        developers[apiKeyHash] = DeveloperAccount({
            wallet: msg.sender,
            name: name,
            tier: 0,                    // Start at free tier
            checksUsed: 0,
            checksLimit: freeTierLimit,
            createdAt: block.timestamp,
            lastResetAt: block.timestamp,
            active: true
        });

        totalDevelopers++;
        emit DeveloperRegistered(apiKeyHash, msg.sender, name, 0);
    }

    /**
     * @notice Upgrade to Pro tier
     */
    function upgradeToPro(bytes32 apiKeyHash) external payable {
        DeveloperAccount storage dev = developers[apiKeyHash];
        require(dev.active, "ComplianceService: not registered");
        require(msg.sender == dev.wallet, "ComplianceService: not authorized");

        dev.tier = 1;
        dev.checksLimit = 0; // Unlimited (pay-per-use)
        emit TierUpgraded(apiKeyHash, 1);
    }

    // ═══════════════════════════════════════════════
    // CORE: Compliance Checks
    // ═══════════════════════════════════════════════

    /**
     * @notice Check if an agent is compliant
     * @param apiKeyHash Developer's API key hash
     * @param agentCommitment Agent's ZK identity
     * @param checkType Type of check: "ofac", "aml", "kyc", "full"
     * @return isCompliant Whether the agent passed compliance
     * @return checkId Unique ID for this check result
     */
    function checkCompliance(
        bytes32 apiKeyHash,
        uint256 agentCommitment,
        string calldata checkType
    ) external payable returns (bool isCompliant, bytes32 checkId) {
        DeveloperAccount storage dev = developers[apiKeyHash];
        require(dev.active, "ComplianceService: developer not registered");

        // Monthly reset check
        if (block.timestamp > dev.lastResetAt + 30 days) {
            dev.checksUsed = 0;
            dev.lastResetAt = block.timestamp;
        }

        // Tier enforcement
        if (dev.tier == 0) {
            // Free tier: check limit
            require(dev.checksUsed < dev.checksLimit, "ComplianceService: free tier limit reached - upgrade to Pro");
        } else if (dev.tier == 1) {
            // Pro tier: pay per check
            require(msg.value >= proTierFee, "ComplianceService: insufficient fee");
            totalRevenue += msg.value;
        }
        // Enterprise (tier 2): no limits, custom billing

        // Perform compliance check via registry
        isCompliant = complianceRegistry.isCompliant(agentCommitment);

        // Generate check ID
        checkId = keccak256(abi.encodePacked(
            apiKeyHash,
            agentCommitment,
            block.timestamp,
            totalChecks
        ));

        checks[checkId] = ComplianceCheck({
            checkId: checkId,
            apiKeyHash: apiKeyHash,
            agentCommitment: agentCommitment,
            checkedAt: block.timestamp,
            isCompliant: isCompliant,
            checkType: checkType,
            expiresAt: block.timestamp + checkValidity
        });

        latestCheck[agentCommitment] = checkId;
        dev.checksUsed++;
        totalChecks++;

        emit ComplianceChecked(checkId, agentCommitment, isCompliant, checkType);
    }

    /**
     * @notice Verify a previous check result is still valid
     */
    function isCheckValid(bytes32 checkId) external view returns (bool valid, bool compliant) {
        ComplianceCheck memory check = checks[checkId];
        valid = check.checkedAt > 0 && block.timestamp < check.expiresAt;
        compliant = check.isCompliant;
    }

    /**
     * @notice Quick check — is agent compliant (uses cached result if valid)
     */
    function isAgentCompliant(uint256 agentCommitment) external view returns (bool) {
        bytes32 checkId = latestCheck[agentCommitment];
        if (checkId == bytes32(0)) return false;

        ComplianceCheck memory check = checks[checkId];
        if (block.timestamp >= check.expiresAt) return false;
        return check.isCompliant;
    }

    // ═══════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════

    function getDeveloper(bytes32 apiKeyHash) external view returns (DeveloperAccount memory) {
        return developers[apiKeyHash];
    }

    function getStats() external view returns (
        uint256 _totalDevelopers,
        uint256 _totalChecks,
        uint256 _totalRevenue
    ) {
        return (totalDevelopers, totalChecks, totalRevenue);
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setFreeTierLimit(uint256 _limit) external {
        require(msg.sender == owner, "ComplianceService: not owner");
        freeTierLimit = _limit;
    }

    function setProTierFee(uint256 _fee) external {
        require(msg.sender == owner, "ComplianceService: not owner");
        proTierFee = _fee;
    }

    function setCheckValidity(uint256 _validity) external {
        require(msg.sender == owner, "ComplianceService: not owner");
        checkValidity = _validity;
    }

    function withdrawRevenue() external {
        require(msg.sender == owner, "ComplianceService: not owner");
        payable(owner).transfer(address(this).balance);
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "ComplianceService: not owner");
        owner = _newOwner;
    }
}
