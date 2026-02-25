// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ReputationRegistry.sol";

contract DeployReputation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ReputationRegistry reputation = new ReputationRegistry(
            0x6A467Cd4156093bB528e448C04366586a1052Fab, // PayPolNexusV2
            0x8fDB8E871c9eaF2955009566F41490Bbb128a014  // AIProofRegistry
        );
        console.log("ReputationRegistry deployed at:", address(reputation));

        vm.stopBroadcast();
    }
}
