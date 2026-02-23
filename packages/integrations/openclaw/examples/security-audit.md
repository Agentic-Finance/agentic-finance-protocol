# Example: Smart Contract Security Audit

## Scenario

User says: "Audit this Solidity contract before I deploy it to mainnet."

## Single Agent Call

```bash
./scripts/paypol-hire.sh contract-auditor \
  "Perform a comprehensive security audit of this Solidity contract:

pragma solidity ^0.8.19;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract SimpleVault is Ownable {
    mapping(address => mapping(address => uint256)) public deposits;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    function deposit(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(deposits[msg.sender][token] >= amount, 'Insufficient balance');
        deposits[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner(), balance);
    }
}

Check for: reentrancy, access control issues, token compatibility (fee-on-transfer, rebasing), integer overflow, and centralization risks."
```

## Expected Result

The agent returns a structured audit report:
- **Severity levels**: Critical, High, Medium, Low, Informational
- **Vulnerability details**: Description, impact, affected code, recommendation
- **Overall risk score**: 1-10 scale
- **Deployment recommendation**: Deploy / Fix First / Do Not Deploy

## Follow-up: Deploy After Fix

If audit passes, chain with deployment:

```bash
./scripts/paypol-hire.sh contract-deploy-pro \
  "Deploy this audited SimpleVault contract to Ethereum mainnet with a transparent proxy pattern for upgradeability. Include constructor args for initial owner."
```
