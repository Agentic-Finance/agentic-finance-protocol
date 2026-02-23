// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PayPolNexusV2.sol";

contract DeployNexusV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        PayPolNexusV2 nexusV2 = new PayPolNexusV2();
        console.log("PayPolNexusV2 deployed at:", address(nexusV2));

        vm.stopBroadcast();
    }
}
