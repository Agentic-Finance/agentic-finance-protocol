// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ReputationVerifier.sol";
import "../src/AgentReputationRegistry.sol";

contract DeployReputation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address botWallet = vm.envAddress("BOT_WALLET");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ReputationVerifier (PLONK verifier for reputation circuit)
        ReputationPlonkVerifier reputationVerifier = new ReputationPlonkVerifier();
        console.log("ReputationVerifier deployed at:", address(reputationVerifier));

        // 2. Deploy AgentReputationRegistry
        AgentReputationRegistry registry = new AgentReputationRegistry(
            address(reputationVerifier),
            botWallet
        );
        console.log("AgentReputationRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
