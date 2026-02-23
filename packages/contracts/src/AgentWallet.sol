// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentWallet V2 (With Lobster Trap Security)
 * @dev The Durable Financial OS for the Agentic Economy.
 */
contract AgentWallet {
    address public owner;
    address public aiAgent;
    bool public isPaused;

    // 🦞 THE LOBSTER TRAP: 15 minutes mandatory delay
    uint256 public constant TRAP_DELAY = 15 minutes;
    uint256 public proposalCount;

    struct Proposal {
        address[] targets;
        uint256[] values;
        bytes[] datas;
        uint256 unlockTime;
        bool executed;
        bool canceled;
    }

    mapping(uint256 => Proposal) public proposals;

    event SystemPaused(address indexed by);
    event SystemUnpaused(address indexed by);
    event ProposalCreated(uint256 indexed id, uint256 unlockTime);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);

    modifier onlyOwner() {
        require(msg.sender == owner, "Security: Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == aiAgent, "Security: Not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "CRITICAL: System is currently PAUSED");
        _;
    }

    constructor(address _aiAgent) {
        owner = msg.sender;
        aiAgent = _aiAgent;
    }

    // --- GOVERNANCE ---
    function pauseSystem() external onlyOwner {
        isPaused = true;
        emit SystemPaused(msg.sender);
    }

    function unpauseSystem() external onlyOwner {
        isPaused = false;
        emit SystemUnpaused(msg.sender);
    }

    // --- 🦞 STEP 1: PROPOSE (Put money in the trap) ---
    // FIXED: Changed 'calldata' to 'memory' to safely copy complex arrays to storage
    function proposeBatch(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory datas
    ) external onlyAuthorized whenNotPaused returns (uint256) {
        require(targets.length == values.length && targets.length == datas.length, "Batch: Length mismatch");

        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        
        p.targets = targets;
        p.values = values;
        p.datas = datas;
        
        // Lock the transaction for 15 minutes from NOW
        p.unlockTime = block.timestamp + TRAP_DELAY;

        emit ProposalCreated(id, p.unlockTime);
        return id;
    }

    // --- 🦞 STEP 2: EXECUTE (Release the trap after delay) ---
    function executeProposal(uint256 id) external onlyAuthorized whenNotPaused {
        Proposal storage p = proposals[id];
        
        require(!p.executed, "Trap: Already executed");
        require(!p.canceled, "Trap: Proposal was canceled by Admin");
        require(block.timestamp >= p.unlockTime, "Trap: Still locked. Wait 15 minutes.");

        p.executed = true;

        for (uint i = 0; i < p.targets.length; i++) {
            (bool success, ) = p.targets[i].call{value: p.values[i]}(p.datas[i]);
            require(success, "Batch: Execution failed on-chain");
        }

        emit ProposalExecuted(id);
    }

    // --- 🚨 EMERGENCY: CANCEL (Human overrides the AI) ---
    function cancelProposal(uint256 id) external onlyOwner {
        require(!proposals[id].executed, "Too late: Already executed");
        proposals[id].canceled = true;
        emit ProposalCanceled(id);
    }

    receive() external payable {}
}