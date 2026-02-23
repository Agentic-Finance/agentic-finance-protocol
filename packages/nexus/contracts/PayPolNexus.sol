// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Custom Interface definition to avoid OpenZeppelin dependency
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract PayPolNexus {
    struct Job {
        address employer;
        address worker;
        address judge;
        address token;
        uint256 budget;
        uint256 released;
        bool isClosed;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;

    event JobCreated(uint256 indexed jobId, address indexed employer, uint256 budget);
    event PaymentReleased(uint256 indexed jobId, uint256 amount);

    function createJob(address _worker, address _judge, address _token, uint256 _amount) external {
        require(_amount > 0, "Budget must be > 0");
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        jobs[nextJobId] = Job(msg.sender, _worker, _judge, _token, _amount, 0, false);
        emit JobCreated(nextJobId, msg.sender, _amount);
        nextJobId++;
    }

    function releasePayment(uint256 _jobId, uint256 _amount, bytes calldata _signature) external {
        Job storage job = jobs[_jobId];
        require(!job.isClosed, "Job already closed");
        require(job.released + _amount <= job.budget, "Amount exceeds budget");

        // Off-chain Signature Verification (AI/Judge Authentication)
        bytes32 messageHash = keccak256(abi.encodePacked(_jobId, _amount, "APPROVED"));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        address signer = ecrecover(ethSignedMessageHash, v, r, s);

        require(signer == job.judge, "Invalid AI/Judge Signature");

        job.released += _amount;
        IERC20(job.token).transfer(job.worker, _amount);
        emit PaymentReleased(_jobId, _amount);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}