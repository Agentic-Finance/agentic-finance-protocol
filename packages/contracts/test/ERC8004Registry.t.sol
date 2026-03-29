// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ERC8004Registry.sol";

contract ERC8004RegistryTest is Test {
    ERC8004Registry registry;

    address owner = address(this);
    address agentAddr = address(0xA1);
    address client = address(0xC1);
    address validator = address(0xD1);

    address token1 = address(0xE1);

    function setUp() public {
        registry = new ERC8004Registry();
        registry.addValidator(validator);
    }

    function testRegisterAgent() public {
        bytes32[] memory caps = new bytes32[](2);
        caps[0] = keccak256("payments");
        caps[1] = keccak256("escrow");

        address[] memory tokens = new address[](1);
        tokens[0] = token1;

        uint256 tokenId = registry.registerAgent(
            agentAddr,
            "https://agent.agt.finance/a2a",
            caps,
            tokens,
            1 // payment type
        );

        assertEq(tokenId, 1);
        assertEq(registry.totalSupply(), 1);
        assertEq(registry.ownerOf(tokenId), owner);
        assertEq(registry.agentToTokenId(agentAddr), tokenId);

        (string memory endpoint, uint8 agentType, address controller, uint256 registeredAt, bool active, uint256 capCount) = registry.getAgent(tokenId);
        assertEq(endpoint, "https://agent.agt.finance/a2a");
        assertEq(agentType, 1);
        assertEq(controller, owner);
        assertTrue(registeredAt > 0);
        assertTrue(active);
        assertEq(capCount, 2);
    }

    function testCannotRegisterSameAgentTwice() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);

        registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.expectRevert("Agent already registered");
        registry.registerAgent(agentAddr, "https://b.com", caps, tokens, 1);
    }

    function testSubmitFeedback() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.prank(client);
        registry.submitFeedback(tokenId, 5, "Excellent agent!", 1000e6);

        (uint256 totalJobs, uint256 successRate, uint256 avgRating, uint256 disputes, uint256 volume) = registry.getReputation(tokenId);
        assertEq(totalJobs, 1);
        assertEq(successRate, 10000); // 100%
        assertEq(avgRating, 500); // 5.00
        assertEq(disputes, 0);
        assertEq(volume, 1000e6);
    }

    function testMultipleFeedback() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.prank(client);
        registry.submitFeedback(tokenId, 5, "Great", 100e6);

        vm.prank(address(0xC2));
        registry.submitFeedback(tokenId, 3, "OK", 200e6);

        vm.prank(address(0xC3));
        registry.submitFeedback(tokenId, 1, "Bad", 50e6);

        (uint256 totalJobs, uint256 successRate, uint256 avgRating,, uint256 volume) = registry.getReputation(tokenId);
        assertEq(totalJobs, 3);
        assertEq(successRate, 6666); // 66.66% (2 of 3 rated >= 3)
        assertEq(avgRating, 300); // (5+3+1)/3 = 3.00
        assertEq(volume, 350e6);
    }

    function testCannotSelfRate() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.expectRevert("Cannot rate own agent");
        registry.submitFeedback(tokenId, 5, "Self rate", 0);
    }

    function testInvalidRatingFails() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.prank(client);
        vm.expectRevert("Rating must be 1-5");
        registry.submitFeedback(tokenId, 0, "Zero", 0);

        vm.prank(client);
        vm.expectRevert("Rating must be 1-5");
        registry.submitFeedback(tokenId, 6, "Six", 0);
    }

    function testRecordValidation() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        bytes32 proofHash = keccak256("proof-data");
        vm.prank(validator);
        registry.recordValidation(tokenId, "zk-compliance", true, proofHash);

        assertTrue(registry.hasValidation(tokenId, "zk-compliance"));
        assertEq(registry.getValidationCount(tokenId), 1);
    }

    function testUnapprovedValidatorFails() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.prank(address(0xBAD));
        vm.expectRevert("Not approved validator");
        registry.recordValidation(tokenId, "zk-compliance", true, bytes32(0));
    }

    function testTransferAgent() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        address newOwner = address(0xF1);
        registry.transferFrom(owner, newOwner, tokenId);

        assertEq(registry.ownerOf(tokenId), newOwner);
        (,, address controller,,,) = registry.getAgent(tokenId);
        assertEq(controller, newOwner);
    }

    function testReportDispute() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        registry.reportDispute(tokenId);
        registry.reportDispute(tokenId);

        (,,, uint256 disputes,) = registry.getReputation(tokenId);
        assertEq(disputes, 2);
    }

    function testGetFeedbackDetails() public {
        bytes32[] memory caps = new bytes32[](0);
        address[] memory tokens = new address[](0);
        uint256 tokenId = registry.registerAgent(agentAddr, "https://a.com", caps, tokens, 1);

        vm.prank(client);
        registry.submitFeedback(tokenId, 4, "Good work", 500e6);

        assertEq(registry.getFeedbackCount(tokenId), 1);

        (address reviewer, uint256 rating, string memory comment, uint256 ts) = registry.getFeedback(tokenId, 0);
        assertEq(reviewer, client);
        assertEq(rating, 4);
        assertEq(comment, "Good work");
        assertTrue(ts > 0);
    }
}
