// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CrossChainVC.sol";

contract CrossChainVCTest is Test {
    CrossChainVC vc;

    address owner = address(this);
    address agent = address(0xA1);
    address issuer2 = address(0xB2);

    function setUp() public {
        vc = new CrossChainVC();
    }

    function testIssueCredential() public {
        bytes32 dataHash = keccak256("compliance-data");
        bytes32 credId = vc.issueCredential(
            agent,
            vc.TYPE_COMPLIANCE(),
            block.timestamp + 30 days,
            dataHash
        );

        (bool valid, address subject, bytes32 credType, address issuer, uint256 issuedAt, uint256 expiresAt) = vc.verifyCredential(credId);
        assertTrue(valid);
        assertEq(subject, agent);
        assertEq(credType, vc.TYPE_COMPLIANCE());
        assertEq(issuer, owner);
        assertTrue(issuedAt > 0);
        assertTrue(expiresAt > block.timestamp);
    }

    function testHasValidCredential() public {
        bytes32 dataHash = keccak256("rep-data");
        vc.issueCredential(agent, vc.TYPE_REPUTATION(), block.timestamp + 30 days, dataHash);

        assertTrue(vc.hasValidCredential(agent, vc.TYPE_REPUTATION()));
        assertFalse(vc.hasValidCredential(agent, vc.TYPE_TEE()));
    }

    function testExpiredCredentialInvalid() public {
        bytes32 dataHash = keccak256("data");
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_COMPLIANCE(), block.timestamp + 1 hours, dataHash);

        assertTrue(vc.hasValidCredential(agent, vc.TYPE_COMPLIANCE()));

        // Advance past expiry
        vm.warp(block.timestamp + 2 hours);

        (bool valid,,,,,) = vc.verifyCredential(credId);
        assertFalse(valid);
        assertFalse(vc.hasValidCredential(agent, vc.TYPE_COMPLIANCE()));
    }

    function testNeverExpiringCredential() public {
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_KYA(), 0, keccak256("kya")); // expiresAt = 0

        vm.warp(block.timestamp + 365 days * 100); // 100 years later

        (bool valid,,,,,) = vc.verifyCredential(credId);
        assertTrue(valid); // Still valid
    }

    function testRevokeCredential() public {
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_COMPLIANCE(), 0, keccak256("data"));

        assertTrue(vc.hasValidCredential(agent, vc.TYPE_COMPLIANCE()));

        vc.revokeCredential(credId);

        (bool valid,,,,,) = vc.verifyCredential(credId);
        assertFalse(valid);
    }

    function testCannotRevokeIfNotIssuer() public {
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_COMPLIANCE(), 0, keccak256("data"));

        vm.prank(address(0xBAD));
        vm.expectRevert("Not authorized to revoke");
        vc.revokeCredential(credId);
    }

    function testUnapprovedIssuerFails() public {
        address badActor = address(0xBAD);
        bytes32 compType = vc.TYPE_COMPLIANCE(); // Cache before prank
        vm.startPrank(badActor);
        vm.expectRevert("Not approved issuer");
        vc.issueCredential(agent, compType, 0, keccak256("data"));
        vm.stopPrank();
    }

    function testAddIssuer() public {
        vc.addIssuer(issuer2);

        vm.startPrank(issuer2);
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_TEE(), 0, keccak256("tee-data"));
        vm.stopPrank();

        (bool valid,,, address credIssuer,,) = vc.verifyCredential(credId);
        assertTrue(valid);
        assertEq(credIssuer, issuer2);
    }

    function testRemoveIssuer() public {
        vc.addIssuer(issuer2);

        vm.startPrank(issuer2);
        bytes32 credId = vc.issueCredential(agent, vc.TYPE_TEE(), 0, keccak256("tee"));
        vm.stopPrank();

        // Remove issuer — existing credentials become invalid
        vc.removeIssuer(issuer2);

        (bool valid,,,,,) = vc.verifyCredential(credId);
        assertFalse(valid); // Issuer no longer approved
    }

    function testAnchorForeignCredential() public {
        bytes32 foreignHash = keccak256("foreign-chain-credential-hash");
        vc.anchorForeignCredential(foreignHash, 1, agent);

        assertTrue(vc.isAnchored(foreignHash));
        assertEq(vc.totalAnchored(), 1);
    }

    function testCannotDoubleAnchor() public {
        bytes32 foreignHash = keccak256("foreign");
        vc.anchorForeignCredential(foreignHash, 1, agent);

        vm.expectRevert("Already anchored");
        vc.anchorForeignCredential(foreignHash, 1, agent);
    }

    function testMultipleCredentialTypes() public {
        vc.issueCredential(agent, vc.TYPE_COMPLIANCE(), 0, keccak256("c"));
        vc.issueCredential(agent, vc.TYPE_REPUTATION(), 0, keccak256("r"));
        vc.issueCredential(agent, vc.TYPE_TEE(), 0, keccak256("t"));
        vc.issueCredential(agent, vc.TYPE_INFERENCE(), 0, keccak256("i"));
        vc.issueCredential(agent, vc.TYPE_KYA(), 0, keccak256("k"));
        vc.issueCredential(agent, vc.TYPE_X402(), 0, keccak256("x"));

        assertEq(vc.getCredentialCount(agent), 6);
        assertEq(vc.totalCredentials(), 6);

        assertTrue(vc.hasValidCredential(agent, vc.TYPE_COMPLIANCE()));
        assertTrue(vc.hasValidCredential(agent, vc.TYPE_REPUTATION()));
        assertTrue(vc.hasValidCredential(agent, vc.TYPE_TEE()));
        assertTrue(vc.hasValidCredential(agent, vc.TYPE_INFERENCE()));
        assertTrue(vc.hasValidCredential(agent, vc.TYPE_KYA()));
        assertTrue(vc.hasValidCredential(agent, vc.TYPE_X402()));
    }

    function testSignedCredential() public {
        uint256 issuerPk = 0xBEEF;
        address issuerAddr = vm.addr(issuerPk);
        vc.addIssuer(issuerAddr);

        bytes32 dataHash = keccak256("signed-data");
        uint256 expiresAt = block.timestamp + 30 days;

        // Build EIP-712 digest
        bytes32 structHash = keccak256(abi.encode(
            vc.VC_TYPEHASH(),
            agent,
            vc.TYPE_COMPLIANCE(),
            block.timestamp,
            expiresAt,
            block.chainid,
            dataHash
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", vc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerPk, digest);

        bytes32 credId = vc.issueSignedCredential(agent, vc.TYPE_COMPLIANCE(), expiresAt, dataHash, v, r, s);

        (bool valid,,, address issuer,,) = vc.verifyCredential(credId);
        assertTrue(valid);
        assertEq(issuer, issuerAddr);
    }
}
