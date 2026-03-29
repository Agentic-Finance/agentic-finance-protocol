// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SimpleERC20.sol";
import "../src/PayPolShieldVaultV2.sol";

/// @dev Mock verifier that always returns true (for unit testing without real ZK proofs)
contract MockPlonkVerifier {
    function verifyProof(uint256[24] calldata, uint256[3] calldata) external pure returns (bool) {
        return true;
    }
}

/// @dev Mock verifier that always returns false
contract MockFailVerifier {
    function verifyProof(uint256[24] calldata, uint256[3] calldata) external pure returns (bool) {
        return false;
    }
}

contract ShieldVaultV2Test is Test {
    PayPolShieldVaultV2 vault;
    SimpleERC20 token;
    MockPlonkVerifier verifier;

    address owner = address(this);
    address daemon = address(0xDA);
    address depositor = address(0x1);
    address recipient = address(0x2);

    uint256 constant AMOUNT = 500e6;
    uint256 constant COMMITMENT = 12345678901234567890;
    uint256 constant NULLIFIER_HASH = 98765432109876543210;

    function setUp() public {
        token = new SimpleERC20("AlphaUSD", "AUSD", 6);
        verifier = new MockPlonkVerifier();
        vault = new PayPolShieldVaultV2(address(verifier), address(token), daemon);

        // Fund depositor
        token.transfer(depositor, 10_000e6);
        vm.prank(depositor);
        token.approve(address(vault), type(uint256).max);
    }

    function testDeposit() public {
        vm.prank(depositor);
        vault.deposit(COMMITMENT, AMOUNT);

        assertTrue(vault.commitments(COMMITMENT), "Commitment not registered");
        assertEq(vault.commitmentAmounts(COMMITMENT), AMOUNT, "Amount mismatch");
        assertEq(token.balanceOf(address(vault)), AMOUNT, "Vault balance wrong");
    }

    function testDepositEmitsEvent() public {
        vm.prank(depositor);
        vm.expectEmit(true, true, false, true);
        emit PayPolShieldVaultV2.Deposited(COMMITMENT, depositor, AMOUNT);
        vault.deposit(COMMITMENT, AMOUNT);
    }

    function testCannotDepositSameCommitmentTwice() public {
        vm.prank(depositor);
        vault.deposit(COMMITMENT, AMOUNT);

        vm.prank(depositor);
        vm.expectRevert();
        vault.deposit(COMMITMENT, AMOUNT);
    }

    function testCannotDepositZeroAmount() public {
        vm.prank(depositor);
        vm.expectRevert();
        vault.deposit(COMMITMENT, 0);
    }

    function testWithdrawWithValidProof() public {
        // Deposit first
        vm.prank(depositor);
        vault.deposit(COMMITMENT, AMOUNT);

        // Withdraw with mock proof
        uint256[24] memory proof;
        uint256[3] memory pubSignals = [COMMITMENT, NULLIFIER_HASH, uint256(uint160(recipient))];

        uint256 balBefore = token.balanceOf(recipient);

        vm.prank(daemon);
        vault.withdraw(proof, pubSignals, AMOUNT);

        assertEq(token.balanceOf(recipient) - balBefore, AMOUNT, "Recipient didn't receive funds");
        assertTrue(vault.usedNullifiers(NULLIFIER_HASH), "Nullifier not marked used");
    }

    function testCannotDoubleSpendNullifier() public {
        vm.prank(depositor);
        vault.deposit(COMMITMENT, AMOUNT);

        uint256[24] memory proof;
        uint256[3] memory pubSignals = [COMMITMENT, NULLIFIER_HASH, uint256(uint160(recipient))];

        vm.prank(daemon);
        vault.withdraw(proof, pubSignals, AMOUNT);

        // Try to withdraw again with same nullifier
        vm.prank(daemon);
        vm.expectRevert();
        vault.withdraw(proof, pubSignals, AMOUNT);
    }

    function testWithdrawFailsWithInvalidProof() public {
        // Deploy with fail verifier
        MockFailVerifier failVerifier = new MockFailVerifier();
        PayPolShieldVaultV2 failVault = new PayPolShieldVaultV2(
            address(failVerifier), address(token), daemon
        );

        token.transfer(depositor, 10_000e6);
        vm.prank(depositor);
        token.approve(address(failVault), type(uint256).max);

        vm.prank(depositor);
        failVault.deposit(COMMITMENT, AMOUNT);

        uint256[24] memory proof;
        uint256[3] memory pubSignals = [COMMITMENT, NULLIFIER_HASH, uint256(uint160(recipient))];

        vm.prank(daemon);
        vm.expectRevert();
        failVault.withdraw(proof, pubSignals, AMOUNT);
    }
}
