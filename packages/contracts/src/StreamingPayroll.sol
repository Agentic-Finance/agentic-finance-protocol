// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StreamingPayroll — Continuous Per-Second Salary Streaming
 * @notice Employer deposits funds, employees accrue salary per-second and can claim anytime
 * @dev Part of Agentic Finance — Built for Tempo L1
 *
 * Flow:
 *   1. Employer calls createStream(employee, token, ratePerSecond, duration, deposit)
 *   2. Employee accrues tokens every second
 *   3. Employee calls claim(streamId) to withdraw accrued amount
 *   4. Employer can topUp(streamId, amount) or cancelStream(streamId)
 */
contract StreamingPayroll {
    struct Stream {
        address employer;
        address employee;
        address token;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 stopTime;       // 0 = indefinite
        uint256 totalDeposited;
        uint256 totalClaimed;
        bool active;
    }

    uint256 public streamCount;
    mapping(uint256 => Stream) public streams;

    event StreamCreated(uint256 indexed streamId, address indexed employer, address indexed employee, uint256 ratePerSecond, address token, uint256 deposit);
    event StreamClaimed(uint256 indexed streamId, address indexed employee, uint256 amount);
    event StreamCancelled(uint256 indexed streamId, uint256 refundedToEmployer, uint256 paidToEmployee);
    event StreamTopUp(uint256 indexed streamId, uint256 amount);

    function createStream(
        address employee,
        address token,
        uint256 ratePerSecond,
        uint256 duration,
        uint256 depositAmount
    ) external returns (uint256 streamId) {
        require(employee != address(0), "Invalid employee");
        require(ratePerSecond > 0, "Rate must be > 0");
        require(depositAmount > 0, "Must deposit funds");

        require(IERC20(token).transferFrom(msg.sender, address(this), depositAmount), "StreamingPayroll: deposit transfer failed");

        streamId = ++streamCount;
        streams[streamId] = Stream({
            employer: msg.sender,
            employee: employee,
            token: token,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            stopTime: duration > 0 ? block.timestamp + duration : 0,
            totalDeposited: depositAmount,
            totalClaimed: 0,
            active: true
        });

        emit StreamCreated(streamId, msg.sender, employee, ratePerSecond, token, depositAmount);
    }

    function getAccrued(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        if (!s.active || s.startTime == 0) return 0;

        uint256 endTime = s.stopTime > 0 && s.stopTime < block.timestamp
            ? s.stopTime
            : block.timestamp;
        uint256 elapsed = endTime > s.startTime ? endTime - s.startTime : 0;
        uint256 totalAccrued = elapsed * s.ratePerSecond;

        if (totalAccrued > s.totalDeposited) totalAccrued = s.totalDeposited;
        return totalAccrued - s.totalClaimed;
    }

    function claim(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.employee, "Not employee");
        require(s.active, "Stream not active");

        uint256 claimable = getAccrued(streamId);
        require(claimable > 0, "Nothing to claim");

        s.totalClaimed += claimable;
        require(IERC20(s.token).transfer(s.employee, claimable), "StreamingPayroll: claim transfer failed");

        emit StreamClaimed(streamId, s.employee, claimable);
    }

    function topUp(uint256 streamId, uint256 amount) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.employer, "Not employer");
        require(s.active, "Stream not active");
        require(amount > 0, "Amount must be > 0");

        // CEI: Update state BEFORE external call
        s.totalDeposited += amount;

        // Interaction: External call LAST
        require(IERC20(s.token).transferFrom(msg.sender, address(this), amount), "StreamingPayroll: topUp transfer failed");

        emit StreamTopUp(streamId, amount);
    }

    function cancelStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.employer, "Not employer");
        require(s.active, "Already cancelled");

        uint256 employeePortion = getAccrued(streamId);
        uint256 remaining = s.totalDeposited - s.totalClaimed;
        uint256 employerRefund = remaining > employeePortion ? remaining - employeePortion : 0;

        s.active = false;

        if (employeePortion > 0) {
            s.totalClaimed += employeePortion;
            require(IERC20(s.token).transfer(s.employee, employeePortion), "StreamingPayroll: employee transfer failed");
        }
        if (employerRefund > 0) {
            require(IERC20(s.token).transfer(s.employer, employerRefund), "StreamingPayroll: refund transfer failed");
        }

        emit StreamCancelled(streamId, employerRefund, employeePortion);
    }

    function getStream(uint256 streamId) external view returns (
        address employer, address employee, address token,
        uint256 ratePerSecond, uint256 startTime, uint256 stopTime,
        uint256 totalDeposited, uint256 totalClaimed, bool active
    ) {
        Stream storage s = streams[streamId];
        return (s.employer, s.employee, s.token, s.ratePerSecond,
                s.startTime, s.stopTime, s.totalDeposited, s.totalClaimed, s.active);
    }
}
