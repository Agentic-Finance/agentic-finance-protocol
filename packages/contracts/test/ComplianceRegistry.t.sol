// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ComplianceRegistry.sol";

/// @dev Mock verifier that tracks calls and returns configurable result
contract MockComplianceVerifier is IComplianceVerifier {
    bool public shouldPass = true;
    uint256 public callCount;

    function setResult(bool _pass) external { shouldPass = _pass; }

    function verifyProof(uint256[24] calldata, uint256[4] calldata) external view returns (bool) {
        return shouldPass;
    }
}

contract ComplianceRegistryTest is Test {
    ComplianceRegistry registry;
    MockComplianceVerifier verifier;

    address owner = address(this);
    uint256 constant SANCTIONS_ROOT = 111111111111;
    uint256 constant AMOUNT_THRESHOLD = 10_000_000000; // $10K
    uint256 constant VOLUME_THRESHOLD = 100_000_000000; // $100K
    uint256 constant COMMITMENT = 99887766554433221100;

    function setUp() public {
        verifier = new MockComplianceVerifier();
        registry = new ComplianceRegistry(
            address(verifier),
            SANCTIONS_ROOT,
            AMOUNT_THRESHOLD,
            VOLUME_THRESHOLD,
            7 days // certificate max age
        );
    }

    function testInitialState() public view {
        assertEq(registry.sanctionsRoot(), SANCTIONS_ROOT);
        assertEq(registry.amountThreshold(), AMOUNT_THRESHOLD);
        assertEq(registry.volumeThreshold(), VOLUME_THRESHOLD);
        assertEq(registry.totalCertificates(), 0);
    }

    function testVerifyCertify() public {
        uint256[24] memory proof;
        uint256[4] memory pubSignals = [SANCTIONS_ROOT, COMMITMENT, AMOUNT_THRESHOLD, VOLUME_THRESHOLD];

        bool success = registry.verifyCertify(proof, pubSignals);
        assertTrue(success, "verifyCertify should succeed");
        assertTrue(registry.isCompliant(COMMITMENT), "Commitment should be compliant");
        assertEq(registry.totalCertificates(), 1, "Should have 1 certificate");
    }

    function testIsCompliantReturnsFalseForUnknown() public view {
        assertFalse(registry.isCompliant(12345), "Unknown commitment should not be compliant");
    }

    function testVerifyFailsWithBadProof() public {
        verifier.setResult(false);

        uint256[24] memory proof;
        uint256[4] memory pubSignals = [SANCTIONS_ROOT, COMMITMENT, AMOUNT_THRESHOLD, VOLUME_THRESHOLD];

        vm.expectRevert();
        registry.verifyCertify(proof, pubSignals);
    }

    function testCertificateExpiry() public {
        uint256[24] memory proof;
        uint256[4] memory pubSignals = [SANCTIONS_ROOT, COMMITMENT, AMOUNT_THRESHOLD, VOLUME_THRESHOLD];

        registry.verifyCertify(proof, pubSignals);
        assertTrue(registry.isCompliant(COMMITMENT));

        // Advance past certificate max age
        vm.warp(block.timestamp + 8 days);
        assertFalse(registry.isCompliant(COMMITMENT), "Expired certificate should not be compliant");
    }

    function testUpdateSanctionsRoot() public {
        uint256 newRoot = 222222222222;
        registry.updateSanctionsRoot(newRoot);
        assertEq(registry.sanctionsRoot(), newRoot);
    }

    function testOnlyOwnerCanUpdateRoot() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.updateSanctionsRoot(999);
    }

    function testUpdateThresholds() public {
        registry.updateThresholds(50_000_000000, 500_000_000000);
        assertEq(registry.amountThreshold(), 50_000_000000);
        assertEq(registry.volumeThreshold(), 500_000_000000);
    }
}
