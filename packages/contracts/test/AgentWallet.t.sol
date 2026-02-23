// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentWallet
 * @dev A smart contract wallet designed for AI Agents with Batch Payment capabilities.
 */
contract AgentWallet {
    address public owner;       // The human owner
    address public agent;       // The AI agent
    uint256 public dailyLimit;  // Max spending per day (in wei)
    uint256 public lastDay;     // Timestamp of the last reset
    uint256 public spentToday;  // Amount spent today

    event Executed(address indexed target, uint256 value, bytes data);
    event BatchExecuted(uint256 count, uint256 totalValue);

    constructor(address _owner, address _agent, uint256 _dailyLimit) {
        owner = _owner;
        agent = _agent;
        dailyLimit = _dailyLimit;
        lastDay = block.timestamp / 1 days;
    }

    /**
     * @dev Check and update the daily spending limit.
     */
    function _checkLimit(uint256 amount) internal {
        if (msg.sender == agent) {
            uint256 currentDay = block.timestamp / 1 days;
            if (currentDay > lastDay) {
                lastDay = currentDay;
                spentToday = 0;
            }
            require(spentToday + amount <= dailyLimit, "Over daily limit");
            spentToday += amount;
        }
    }

    /**
     * @dev Executes a single transaction.
     */
    function execute(address target, uint256 value, bytes calldata data) external returns (bytes memory) {
        require(msg.sender == owner || msg.sender == agent, "Not authorized");
        
        _checkLimit(value);

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Execution failed");
        
        emit Executed(target, value, data);
        return result;
    }

    /**
     * @dev Executes multiple transactions in a single call (Batch Payment).
     * Greatly reduces gas costs for payroll.
     */
    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external {
        require(msg.sender == owner || msg.sender == agent, "Not authorized");
        require(targets.length == values.length && values.length == datas.length, "Length mismatch");

        uint256 totalValue = 0;
        
        // 1. Calculate total value for daily limit check
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }

        // 2. Check limit once for the whole batch
        _checkLimit(totalValue);

        // 3. Execute all transactions
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "Batch execution failed at index");
            emit Executed(targets[i], values[i], datas[i]);
        }
        
        emit BatchExecuted(targets.length, totalValue);
    }

    receive() external payable {}
}