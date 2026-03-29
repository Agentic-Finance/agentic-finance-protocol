// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";

/// @dev Mock reputation verifier
contract MockReputationVerifier {
    bool public shouldPass = true;
    function setResult(bool _pass) external { shouldPass = _pass; }
    function verifyProof(uint256[24] calldata, uint256[4] calldata) external view returns (bool) {
        return shouldPass;
    }
}

contract ReputationRegistryTest is Test {
    AgentReputationRegistry registry;
    MockReputationVerifier verifier;

    address owner = address(this);
    address daemon = address(0xDA);
    uint256 constant AGENT_COMMITMENT = 11223344556677889900;
    uint256 constant ACCUMULATOR_HASH = 99887766554433221100;

    function setUp() public {
        verifier = new MockReputationVerifier();
        registry = new AgentReputationRegistry(address(verifier), daemon);
    }

    function testRegisterAccumulator() public {
        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        (uint256 accHash,,,,, bool active) = registry.getReputation(AGENT_COMMITMENT);
        assertEq(accHash, ACCUMULATOR_HASH, "Accumulator hash mismatch");
        assertTrue(active, "Should be active");
    }

    function testOnlyDaemonCanRegister() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);
    }

    function testVerifyReputation() public {
        // Register accumulator first
        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        // Verify reputation proof
        uint256[24] memory proof;
        uint256[4] memory pubSignals = [AGENT_COMMITMENT, ACCUMULATOR_HASH, 10, 50_000_000000];

        bool success = registry.verifyReputation(proof, pubSignals);
        assertTrue(success, "verifyReputation should succeed");
    }

    function testMeetsRequirements() public {
        // Register + verify
        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        uint256[24] memory proof;
        uint256[4] memory pubSignals = [AGENT_COMMITMENT, ACCUMULATOR_HASH, 10, 50_000_000000];
        registry.verifyReputation(proof, pubSignals);

        // Check requirements
        assertTrue(
            registry.meetsRequirements(AGENT_COMMITMENT, 5, 25_000_000000),
            "Should meet lower requirements"
        );
    }

    function testDoesNotMeetHigherRequirements() public {
        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        uint256[24] memory proof;
        uint256[4] memory pubSignals = [AGENT_COMMITMENT, ACCUMULATOR_HASH, 10, 50_000_000000];
        registry.verifyReputation(proof, pubSignals);

        // Requirements higher than proven
        assertFalse(
            registry.meetsRequirements(AGENT_COMMITMENT, 100, 1_000_000_000000),
            "Should NOT meet higher requirements"
        );
    }

    function testUnregisteredAgentFailsRequirements() public view {
        assertFalse(
            registry.meetsRequirements(99999, 1, 1),
            "Unregistered agent should not meet any requirements"
        );
    }

    function testVerifyFailsWithBadProof() public {
        verifier.setResult(false);

        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        uint256[24] memory proof;
        uint256[4] memory pubSignals = [AGENT_COMMITMENT, ACCUMULATOR_HASH, 10, 50_000_000000];

        vm.expectRevert();
        registry.verifyReputation(proof, pubSignals);
    }

    function testGetStats() public {
        vm.prank(daemon);
        registry.registerAccumulator(AGENT_COMMITMENT, ACCUMULATOR_HASH);

        (uint256 totalAgents, uint256 totalProofs) = registry.getStats();
        assertEq(totalAgents, 1, "Should have 1 agent");
        assertEq(totalProofs, 0, "Should have 0 proofs before verification");
    }
}
