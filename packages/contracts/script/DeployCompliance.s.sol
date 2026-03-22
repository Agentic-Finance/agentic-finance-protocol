// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ComplianceVerifier.sol";
import "../src/ComplianceRegistry.sol";

contract DeployCompliance is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceVerifier (PLONK verifier for compliance circuit)
        CompliancePlonkVerifier complianceVerifier = new CompliancePlonkVerifier();
        console.log("ComplianceVerifier deployed at:", address(complianceVerifier));

        // 2. Deploy ComplianceRegistry
        // Initial sanctions root = 0 (will be updated by operator)
        // Amount threshold = $10,000 (6 decimals) = 10_000_000_000
        // Volume threshold = $10,000 (6 decimals) = 10_000_000_000
        // Certificate max age = 7 days = 604800 seconds
        ComplianceRegistry registry = new ComplianceRegistry(
            address(complianceVerifier),
            0,                  // Initial sanctions root (set later)
            10_000_000_000,     // $10,000 amount threshold
            10_000_000_000,     // $10,000 volume threshold
            604800              // 7 days certificate validity
        );
        console.log("ComplianceRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
