// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BatchShieldExecutor.sol";
import "../src/PayPolShieldVaultV2.sol";

/**
 * @notice Deploy BatchShieldExecutor only (Step 1).
 *         After deployment, the ShieldVaultV2 owner must call:
 *           vault.updateMasterDaemon(batchExecutorAddress)
 *
 *   PRIVATE_KEY=0x...  \
 *   SHIELD_VAULT=0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055 \
 *   BOT_WALLET=0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793 \
 *   forge script script/DeployBatchExecutor.s.sol \
 *     --rpc-url https://rpc.moderato.tempo.xyz \
 *     --broadcast --legacy
 */
contract DeployBatchExecutor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address shieldVault = vm.envAddress("SHIELD_VAULT");
        address botWallet = vm.envAddress("BOT_WALLET");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy BatchShieldExecutor
        BatchShieldExecutor executor = new BatchShieldExecutor(shieldVault, botWallet);
        console.log("BatchShieldExecutor deployed at:", address(executor));
        console.log("NEXT: ShieldVaultV2 owner must call updateMasterDaemon(", address(executor), ")");

        vm.stopBroadcast();
    }
}
