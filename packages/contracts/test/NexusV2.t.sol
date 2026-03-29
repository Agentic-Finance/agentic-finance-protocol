// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SimpleERC20.sol";
import "../src/PayPolNexusV2.sol";

contract NexusV2Test is Test {
    PayPolNexusV2 nexus;
    SimpleERC20 token;

    address owner = address(this);
    address employer = address(0x1);
    address worker = address(0x2);
    address judge = address(0x3);

    uint256 constant BUDGET = 1000e6; // 1000 AUSD

    function setUp() public {
        token = new SimpleERC20("AlphaUSD", "AUSD", 6);
        nexus = new PayPolNexusV2();

        // Fund employer
        token.transfer(employer, 10_000e6);
        vm.prank(employer);
        token.approve(address(nexus), type(uint256).max);
    }

    function testCreateJob() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        (address e, address w, address j, address t, uint256 b,,,, ) = nexus.jobs(jobId);
        assertEq(e, employer, "Employer mismatch");
        assertEq(w, worker, "Worker mismatch");
        assertEq(j, judge, "Judge mismatch");
        assertEq(t, address(token), "Token mismatch");
        assertEq(b, BUDGET, "Budget mismatch");
    }

    function testCreateJobTransfersFunds() public {
        uint256 balBefore = token.balanceOf(employer);
        vm.prank(employer);
        nexus.createJob(worker, judge, address(token), BUDGET, 7 days);
        uint256 balAfter = token.balanceOf(employer);

        assertEq(balBefore - balAfter, BUDGET, "Funds not escrowed");
        assertEq(token.balanceOf(address(nexus)), BUDGET, "Nexus balance wrong");
    }

    function testStartJob() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(worker);
        nexus.startJob(jobId);

        (,,,,,,,PayPolNexusV2.JobStatus status, ) = nexus.jobs(jobId);
        assertEq(uint256(status), uint256(PayPolNexusV2.JobStatus.Executing));
    }

    function testOnlyWorkerCanStart() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(employer);
        vm.expectRevert();
        nexus.startJob(jobId);
    }

    function testCompleteJob() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(worker);
        nexus.startJob(jobId);

        vm.prank(worker);
        nexus.completeJob(jobId);

        (,,,,,,,PayPolNexusV2.JobStatus status, ) = nexus.jobs(jobId);
        assertEq(uint256(status), uint256(PayPolNexusV2.JobStatus.Completed));
    }

    function testSettleJob() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(worker);
        nexus.startJob(jobId);

        vm.prank(worker);
        nexus.completeJob(jobId);

        uint256 workerBalBefore = token.balanceOf(worker);
        vm.prank(judge);
        nexus.settleJob(jobId);

        // Worker should receive budget minus platform fee
        uint256 fee = (BUDGET * nexus.platformFeeBps()) / 10_000;
        uint256 expectedPay = BUDGET - fee;
        assertEq(token.balanceOf(worker) - workerBalBefore, expectedPay, "Worker pay incorrect");
    }

    function testDisputeJob() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(worker);
        nexus.startJob(jobId);

        vm.prank(worker);
        nexus.completeJob(jobId);

        vm.prank(employer);
        nexus.disputeJob(jobId);

        (,,,,,,,PayPolNexusV2.JobStatus status, ) = nexus.jobs(jobId);
        assertEq(uint256(status), uint256(PayPolNexusV2.JobStatus.Disputed));
    }

    function testRefundAfterTimeout() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        // Advance time past deadline
        vm.warp(block.timestamp + 8 days);

        uint256 balBefore = token.balanceOf(employer);
        vm.prank(employer);
        nexus.claimTimeout(jobId);

        assertEq(token.balanceOf(employer) - balBefore, BUDGET, "Refund amount wrong");
    }

    function testCannotDoubleSettle() public {
        vm.prank(employer);
        uint256 jobId = nexus.createJob(worker, judge, address(token), BUDGET, 7 days);

        vm.prank(worker);
        nexus.startJob(jobId);
        vm.prank(worker);
        nexus.completeJob(jobId);
        vm.prank(judge);
        nexus.settleJob(jobId);

        // Try to settle again
        vm.prank(judge);
        vm.expectRevert();
        nexus.settleJob(jobId);
    }
}
