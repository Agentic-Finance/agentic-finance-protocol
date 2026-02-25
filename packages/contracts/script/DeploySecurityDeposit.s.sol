// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SecurityDepositVault.sol";

/**
 * @notice Deploy SecurityDepositVault on Tempo L1 Moderato
 *
 * Usage:
 *   forge script script/DeploySecurityDeposit.s.sol:DeploySecurityDeposit \
 *     --rpc-url https://rpc.moderato.tempo.xyz \
 *     --broadcast --legacy
 */
contract DeploySecurityDeposit is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // AlphaUSD on Tempo L1
        address alphaUSD = 0x20C0000000000000000000000000000000000001;

        SecurityDepositVault vault = new SecurityDepositVault(alphaUSD);

        console.log("SecurityDepositVault deployed:", address(vault));
        console.log("Token:", alphaUSD);
        console.log("Owner:", msg.sender);

        vm.stopBroadcast();
    }
}
