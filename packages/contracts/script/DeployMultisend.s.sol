// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PayPolMultisendVault.sol";

contract DeployMultisend is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address alphaUSD = vm.envAddress("ALPHA_USD");
        address botWallet = vm.envAddress("BOT_WALLET");

        vm.startBroadcast(deployerPrivateKey);

        PayPolMultisendVault multiVault = new PayPolMultisendVault(
            alphaUSD,
            botWallet
        );
        
        console.log("PayPolMultisendVault deployed at:", address(multiVault));

        vm.stopBroadcast();
    }
}