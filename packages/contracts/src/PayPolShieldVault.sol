// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PlonkVerifier.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PayPolShieldVault {
    PlonkVerifier public immutable verifier;
    IERC20 public immutable paymentToken;
    address public masterDaemon;

    event ShieldedPayoutExecuted(uint256 indexed commitment, address indexed recipient, uint256 amount);
    event PublicPayoutExecuted(address indexed recipient, uint256 amount);

    constructor(address _verifierAddress, address _paymentToken, address _masterDaemon) {
        verifier = PlonkVerifier(_verifierAddress);
        paymentToken = IERC20(_paymentToken);
        masterDaemon = _masterDaemon;
    }

    modifier onlyDaemon() {
        require(msg.sender == masterDaemon, "Unauthorized: Only Master Daemon can trigger");
        _;
    }

    function executePublicPayout(address recipient, uint256 amount) external onlyDaemon {
        require(paymentToken.transfer(recipient, amount), "ERC20: Transfer failed");
        emit PublicPayoutExecuted(recipient, amount);
    }

    // 🌟 CHUẨN HÓA 100%: Sử dụng uint256[24] để khớp với PlonkVerifier
    function executeShieldedPayout(
        uint256[24] calldata proof, 
        uint256[2] calldata pubSignals, 
        uint256 exactAmount
    ) external onlyDaemon {
        bool isValid = verifier.verifyProof(proof, pubSignals);
        require(isValid, "ZK: Invalid cryptographic proof");

        address recipient = address(uint160(pubSignals[1]));
        
        require(paymentToken.transfer(recipient, exactAmount), "ERC20: Shielded transfer failed");

        emit ShieldedPayoutExecuted(pubSignals[0], recipient, exactAmount);
    }
}