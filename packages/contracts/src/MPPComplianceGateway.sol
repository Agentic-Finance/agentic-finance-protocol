// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MPPComplianceGateway — MPP Sessions + ZK Compliance
 * @notice Bridges the Machine Payments Protocol (MPP) with ZK compliance.
 *
 * Problem:
 *   MPP session keys authorize agents to spend, but have NO compliance layer.
 *   All MPP payments are public on-chain with no privacy or OFAC checks.
 *
 * Solution:
 *   This gateway enforces that every MPP session must have a valid
 *   ZK compliance certificate BEFORE the session can be activated.
 *   The session key is bound to the compliance commitment.
 *
 * Flow:
 *   1. Agent generates ZK compliance proof (OFAC + AML checks)
 *   2. Agent calls createCompliantSession() with proof + session params
 *   3. Gateway verifies compliance → creates session key
 *   4. Agent uses session key for MPP payments (streaming micropayments)
 *   5. At settlement: compliance certificate is attached to the batch
 *
 * This is the MISSING LAYER between MPP (payment) and compliance (trust).
 * Neither Tempo nor Stripe have built this. We're first.
 */

interface IComplianceRegistry {
    function isCompliant(uint256 commitment) external view returns (bool);
}

interface IReputationRegistry {
    function meetsRequirements(uint256 agentCommitment, uint256 requiredTxCount, uint256 requiredVolume)
        external view returns (bool);
}

contract MPPComplianceGateway {

    /*//////////////////////////////////////////////////////////////
                            STATE
    //////////////////////////////////////////////////////////////*/

    address public owner;
    IComplianceRegistry public complianceRegistry;
    IReputationRegistry public reputationRegistry;

    /// @notice MPP-compliant session
    struct CompliantSession {
        address agent;                // Agent address
        uint256 complianceCommitment; // ZK compliance commitment
        uint256 reputationCommitment; // ZK reputation commitment (optional, 0 if none)
        address token;                // Payment token
        uint256 maxBudget;            // Maximum spend for this session
        uint256 spent;                // Amount spent so far
        uint256 expiresAt;            // Session expiry timestamp
        uint256 createdAt;            // Session creation timestamp
        bool    active;               // Is session active
        bool    compliant;            // Was compliance verified at creation
        bool    reputationVerified;   // Was reputation verified at creation
    }

    /// @notice sessionId => CompliantSession
    mapping(bytes32 => CompliantSession) public sessions;

    /// @notice agent => active session IDs
    mapping(address => bytes32[]) public agentSessions;

    /// @notice Stats
    uint256 public totalSessions;
    uint256 public totalCompliantSessions;
    uint256 public totalVolume;

    /// @notice Minimum reputation requirements for premium sessions
    uint256 public minReputationTxCount;
    uint256 public minReputationVolume;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed agent,
        uint256 complianceCommitment,
        uint256 maxBudget,
        uint256 expiresAt,
        bool reputationVerified
    );

    event SessionPayment(
        bytes32 indexed sessionId,
        uint256 amount,
        uint256 totalSpent,
        uint256 remaining
    );

    event SessionClosed(
        bytes32 indexed sessionId,
        uint256 totalSpent,
        string reason
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _complianceRegistry, address _reputationRegistry) {
        owner = msg.sender;
        complianceRegistry = IComplianceRegistry(_complianceRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        minReputationTxCount = 5;
        minReputationVolume = 10000_000000; // $10K minimum
    }

    /*//////////////////////////////////////////////////////////////
                            CORE: Create compliant MPP session
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new MPP session with ZK compliance verification
     * @param _complianceCommitment ZK compliance commitment (from ComplianceRegistry)
     * @param _reputationCommitment ZK reputation commitment (optional, 0 to skip)
     * @param _token Payment token address
     * @param _maxBudget Maximum budget for this session
     * @param _duration Session duration in seconds
     * @return sessionId The unique session identifier
     *
     * Requirements:
     *   - Compliance commitment must be verified in ComplianceRegistry
     *   - If reputation commitment provided, must meet minimum requirements
     *   - Budget must be > 0
     *   - Duration must be reasonable (1 min to 30 days)
     */
    function createCompliantSession(
        uint256 _complianceCommitment,
        uint256 _reputationCommitment,
        address _token,
        uint256 _maxBudget,
        uint256 _duration
    ) external returns (bytes32 sessionId) {
        require(_maxBudget > 0, "Gateway: zero budget");
        require(_duration >= 60 && _duration <= 30 days, "Gateway: invalid duration");

        // Verify ZK compliance
        bool compliant = complianceRegistry.isCompliant(_complianceCommitment);
        require(compliant, "Gateway: compliance not verified - submit ZK proof first");

        // Optional: verify reputation
        bool repVerified = false;
        if (_reputationCommitment != 0) {
            repVerified = reputationRegistry.meetsRequirements(
                _reputationCommitment,
                minReputationTxCount,
                minReputationVolume
            );
        }

        // Generate session ID
        sessionId = keccak256(abi.encodePacked(
            msg.sender,
            _complianceCommitment,
            _maxBudget,
            block.timestamp,
            totalSessions
        ));

        uint256 expiresAt = block.timestamp + _duration;

        sessions[sessionId] = CompliantSession({
            agent: msg.sender,
            complianceCommitment: _complianceCommitment,
            reputationCommitment: _reputationCommitment,
            token: _token,
            maxBudget: _maxBudget,
            spent: 0,
            expiresAt: expiresAt,
            createdAt: block.timestamp,
            active: true,
            compliant: true,
            reputationVerified: repVerified
        });

        agentSessions[msg.sender].push(sessionId);
        totalSessions++;
        totalCompliantSessions++;

        emit SessionCreated(
            sessionId,
            msg.sender,
            _complianceCommitment,
            _maxBudget,
            expiresAt,
            repVerified
        );
    }

    /**
     * @notice Record a payment within a session
     * @dev Called by the settlement layer when an MPP payment is processed
     */
    function recordPayment(bytes32 _sessionId, uint256 _amount) external {
        CompliantSession storage session = sessions[_sessionId];
        require(session.active, "Gateway: session not active");
        require(block.timestamp < session.expiresAt, "Gateway: session expired");
        require(session.spent + _amount <= session.maxBudget, "Gateway: budget exceeded");
        require(
            msg.sender == session.agent || msg.sender == owner,
            "Gateway: not authorized"
        );

        session.spent += _amount;
        totalVolume += _amount;

        emit SessionPayment(
            _sessionId,
            _amount,
            session.spent,
            session.maxBudget - session.spent
        );

        // Auto-close if budget fully used
        if (session.spent >= session.maxBudget) {
            session.active = false;
            emit SessionClosed(_sessionId, session.spent, "budget_exhausted");
        }
    }

    /**
     * @notice Close a session
     */
    function closeSession(bytes32 _sessionId) external {
        CompliantSession storage session = sessions[_sessionId];
        require(session.active, "Gateway: already closed");
        require(
            msg.sender == session.agent || msg.sender == owner,
            "Gateway: not authorized"
        );

        session.active = false;
        emit SessionClosed(_sessionId, session.spent, "manual_close");
    }

    /*//////////////////////////////////////////////////////////////
                            QUERY
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if a session is valid for payment
     * @return valid Whether the session can process payments
     * @return remaining Budget remaining in the session
     */
    function isSessionValid(bytes32 _sessionId)
        external view returns (bool valid, uint256 remaining)
    {
        CompliantSession memory s = sessions[_sessionId];
        valid = s.active && block.timestamp < s.expiresAt && s.compliant;
        remaining = s.maxBudget > s.spent ? s.maxBudget - s.spent : 0;
    }

    /**
     * @notice Get all sessions for an agent
     */
    function getAgentSessions(address _agent)
        external view returns (bytes32[] memory)
    {
        return agentSessions[_agent];
    }

    /**
     * @notice Get gateway stats
     */
    function getStats() external view returns (
        uint256 _totalSessions,
        uint256 _totalCompliant,
        uint256 _totalVolume
    ) {
        return (totalSessions, totalCompliantSessions, totalVolume);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN
    //////////////////////////////////////////////////////////////*/

    function setMinReputation(uint256 _txCount, uint256 _volume) external {
        require(msg.sender == owner, "Gateway: not owner");
        minReputationTxCount = _txCount;
        minReputationVolume = _volume;
    }

    function setRegistries(address _compliance, address _reputation) external {
        require(msg.sender == owner, "Gateway: not owner");
        complianceRegistry = IComplianceRegistry(_compliance);
        reputationRegistry = IReputationRegistry(_reputation);
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Gateway: not owner");
        require(_newOwner != address(0), "Gateway: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
