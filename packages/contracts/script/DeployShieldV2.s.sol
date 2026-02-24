// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlonkVerifierV2.sol";
import "../src/PayPolShieldVaultV2.sol";

contract DeployShieldV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address alphaUSD = vm.envAddress("ALPHA_USD");
        address botWallet = vm.envAddress("BOT_WALLET");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the PlonkVerifierV2 (3 pubSignals: commitment, nullifierHash, recipient)
        PlonkVerifierV2 verifierV2 = new PlonkVerifierV2();
        console.log("PlonkVerifierV2 deployed at:", address(verifierV2));

        // 2. Deploy the PayPolShieldVaultV2 (deposit + nullifier anti-double-spend)
        PayPolShieldVaultV2 vaultV2 = new PayPolShieldVaultV2(
            address(verifierV2),
            alphaUSD,
            botWallet
        );
        console.log("PayPolShieldVaultV2 deployed at:", address(vaultV2));

        vm.stopBroadcast();
    }
}
