// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlonkVerifier.sol";
import "../src/PayPolShieldVault.sol";

contract DeployPayPol is Script {
    function run() external {
        // Lấy tất cả thông tin nhạy cảm từ file .env (Bypass hoàn toàn Checksum compiler)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address alphaUSD = vm.envAddress("ALPHA_USD");
        address botWallet = vm.envAddress("BOT_WALLET");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the ZK Verifier (The Judge)
        PlonkVerifier verifier = new PlonkVerifier();
        console.log("PlonkVerifier deployed at:", address(verifier));

        // 2. Deploy the PayPol Vault (The Escrow)
        PayPolShieldVault vault = new PayPolShieldVault(
            address(verifier),
            alphaUSD,
            botWallet
        );
        console.log("PayPolShieldVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}