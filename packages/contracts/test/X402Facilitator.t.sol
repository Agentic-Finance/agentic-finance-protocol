// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/X402Facilitator.sol";

/// @dev Minimal ERC20 for testing
contract MockToken {
    string public name = "AlphaUSD";
    string public symbol = "AUSD";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() { balanceOf[msg.sender] = 1_000_000e6; }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

contract X402FacilitatorTest is Test {
    X402Facilitator facilitator;
    MockToken token;

    uint256 payerPk = 0xA11CE;
    address payer;
    address payee = address(0xBEEF);
    address owner;

    bytes32 resourceId;

    function setUp() public {
        owner = address(this);
        payer = vm.addr(payerPk);

        facilitator = new X402Facilitator();
        token = new MockToken();

        // Fund payer
        token.mint(payer, 100_000e6);
        vm.prank(payer);
        token.approve(address(facilitator), type(uint256).max);

        // Register a resource
        vm.prank(payee);
        resourceId = facilitator.registerResource("https://api.example.com/data", 100e6, address(token));
    }

    function testRegisterResource() public view {
        (address rOwner, uint256 price, address rToken, bool active,,) = facilitator.resources(resourceId);
        assertEq(rOwner, payee);
        assertEq(price, 100e6);
        assertEq(rToken, address(token));
        assertTrue(active);
    }

    function testSettlePayment() public {
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer,
            payee: payee,
            token: address(token),
            amount: 100e6,
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            resourceId: resourceId
        });

        // Sign EIP-712
        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        uint256 payeeBalBefore = token.balanceOf(payee);

        bytes32 receiptId = facilitator.settlePayment(auth, v, r, s);

        // Verify receipt
        (bool valid, address rPayer, address rPayee, uint256 rAmount,,) = facilitator.verifyReceipt(receiptId);
        assertTrue(valid);
        assertEq(rPayer, payer);
        assertEq(rPayee, payee);
        assertEq(rAmount, 100e6);

        // Verify payee received funds (minus 1% fee)
        uint256 fee = (100e6 * facilitator.protocolFeeBps()) / 10000;
        assertEq(token.balanceOf(payee) - payeeBalBefore, 100e6 - fee);

        // Verify stats
        assertEq(facilitator.totalPayments(), 1);
        assertEq(facilitator.totalVolume(), 100e6);
    }

    function testCannotReplayNonce() public {
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 100e6, nonce: 0, deadline: block.timestamp + 1 hours, resourceId: resourceId
        });

        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        facilitator.settlePayment(auth, v, r, s);

        // Try replay
        vm.expectRevert("Nonce already used");
        facilitator.settlePayment(auth, v, r, s);
    }

    function testExpiredPaymentFails() public {
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 100e6, nonce: 0, deadline: block.timestamp - 1, resourceId: resourceId
        });

        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        vm.expectRevert("Payment expired");
        facilitator.settlePayment(auth, v, r, s);
    }

    function testInvalidSignatureFails() public {
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 100e6, nonce: 0, deadline: block.timestamp + 1 hours, resourceId: resourceId
        });

        // Sign with wrong key
        uint256 wrongPk = 0xDEAD;
        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPk, digest);

        vm.expectRevert("Invalid signature");
        facilitator.settlePayment(auth, v, r, s);
    }

    function testInsufficientPaymentFails() public {
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 50e6, // Under resource price of 100e6
            nonce: 0, deadline: block.timestamp + 1 hours, resourceId: resourceId
        });

        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        vm.expectRevert("Insufficient payment");
        facilitator.settlePayment(auth, v, r, s);
    }

    function testUpdateResource() public {
        vm.prank(payee);
        facilitator.updateResource(resourceId, 200e6, true);

        (, uint256 price,, bool active,,) = facilitator.resources(resourceId);
        assertEq(price, 200e6);
        assertTrue(active);
    }

    function testDeactivateResource() public {
        vm.prank(payee);
        facilitator.updateResource(resourceId, 100e6, false);

        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 100e6, nonce: 0, deadline: block.timestamp + 1 hours, resourceId: resourceId
        });

        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        vm.expectRevert("Resource not active");
        facilitator.settlePayment(auth, v, r, s);
    }

    function testWithdrawFees() public {
        // First settle a payment to generate fees
        X402Facilitator.PaymentAuthorization memory auth = X402Facilitator.PaymentAuthorization({
            payer: payer, payee: payee, token: address(token),
            amount: 100e6, nonce: 0, deadline: block.timestamp + 1 hours, resourceId: resourceId
        });

        bytes32 structHash = keccak256(abi.encode(
            facilitator.PAYMENT_TYPEHASH(),
            auth.payer, auth.payee, auth.token, auth.amount, auth.nonce, auth.deadline, auth.resourceId
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", facilitator.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPk, digest);

        facilitator.settlePayment(auth, v, r, s);

        uint256 fee = (100e6 * facilitator.protocolFeeBps()) / 10000;
        assertEq(facilitator.protocolFees(address(token)), fee);

        // Withdraw
        address treasury = address(0x7777);
        facilitator.withdrawFees(address(token), treasury);
        assertEq(token.balanceOf(treasury), fee);
        assertEq(facilitator.protocolFees(address(token)), 0);
    }
}
