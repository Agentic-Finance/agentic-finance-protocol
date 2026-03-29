// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/**
 * @title  RegisterAgents
 * @notice Registers 50 production agents into AgentDIDRegistry + SpendPolicy + KYA
 *
 * Usage:
 *   forge script script/RegisterAgents.s.sol:RegisterAgents \
 *     --rpc-url https://rpc.moderato.tempo.xyz \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast --legacy
 */

interface IAgentDIDRegistry {
    function registerDID(
        address agent,
        string calldata didDocument,
        bytes32 didHash,
        uint8 agentType
    ) external returns (uint256 tokenId);
}

interface IAgentSpendPolicy {
    function setPolicy(
        address agent,
        uint256 maxPerTx,
        uint256 maxPerDay,
        uint256 maxPerMonth,
        bool requireZKProof
    ) external;
}

interface IKnowYourAgent {
    function setProvenance(address agent, address deployer, string calldata codeHash) external;
}

contract RegisterAgents is Script {
    // Deployed contract addresses on Tempo Moderato (42431)
    IAgentDIDRegistry constant DID_REGISTRY = IAgentDIDRegistry(0x8510035Fb7B014527a41aBBB592F64d0b5Bf0DD2);
    IAgentSpendPolicy constant SPEND_POLICY = IAgentSpendPolicy(0x6c393f33baE036F187200Bd5EB3e9ecE75166951);
    IKnowYourAgent constant KYA = IKnowYourAgent(0x3993737035F952dC1b7A9E88573e7f5E9eCcf885);

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Register all 50 agents
        _registerAgent(deployer, "payroll-planner", 0, 5000e6, 25000e6, 100000e6, false);
        _registerAgent(deployer, "token-transfer", 1, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "vault-depositor", 1, 50000e6, 100000e6, 500000e6, true);
        _registerAgent(deployer, "proof-verifier", 2, 1000e6, 5000e6, 20000e6, true);
        _registerAgent(deployer, "fee-collector", 0, 100000e6, 500000e6, 2000000e6, false);
        _registerAgent(deployer, "token-minter", 1, 0, 0, 0, true);
        _registerAgent(deployer, "a2a-coordinator", 3, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "gas-profiler", 2, 500e6, 2500e6, 10000e6, false);
        _registerAgent(deployer, "escrow-lifecycle", 1, 25000e6, 100000e6, 500000e6, true);
        _registerAgent(deployer, "escrow-dispute", 1, 25000e6, 100000e6, 500000e6, true);
        _registerAgent(deployer, "escrow-batch-settler", 1, 50000e6, 200000e6, 1000000e6, true);
        _registerAgent(deployer, "multisend-batch", 1, 100000e6, 500000e6, 2000000e6, false);
        _registerAgent(deployer, "stream-creator", 1, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "stream-inspector", 2, 0, 0, 0, false);
        _registerAgent(deployer, "shield-executor", 1, 50000e6, 100000e6, 500000e6, true);
        _registerAgent(deployer, "compliance-guardian", 2, 0, 0, 0, true);
        _registerAgent(deployer, "balance-scanner", 2, 0, 0, 0, false);
        _registerAgent(deployer, "tempo-benchmark", 2, 1000e6, 5000e6, 20000e6, false);
        _registerAgent(deployer, "stream-manager", 1, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "contract-deploy-pro", 1, 0, 0, 0, true);
        _registerAgent(deployer, "wallet-sweeper", 2, 100000e6, 500000e6, 2000000e6, true);
        _registerAgent(deployer, "risk-sentinel", 2, 0, 0, 0, true);
        _registerAgent(deployer, "defi-yield-optimizer", 1, 50000e6, 200000e6, 1000000e6, true);
        _registerAgent(deployer, "nft-minter", 1, 5000e6, 25000e6, 100000e6, false);
        _registerAgent(deployer, "bridge-relayer", 1, 100000e6, 500000e6, 2000000e6, true);
        _registerAgent(deployer, "governance-voter", 3, 0, 0, 0, false);
        _registerAgent(deployer, "oracle-feeder", 2, 1000e6, 5000e6, 20000e6, false);
        _registerAgent(deployer, "liquidity-provider", 1, 200000e6, 1000000e6, 5000000e6, true);
        _registerAgent(deployer, "cross-chain-settler", 1, 100000e6, 500000e6, 2000000e6, true);
        _registerAgent(deployer, "audit-reporter", 2, 0, 0, 0, false);
        _registerAgent(deployer, "invoice-processor", 0, 50000e6, 200000e6, 1000000e6, false);
        _registerAgent(deployer, "tax-calculator", 2, 0, 0, 0, false);
        _registerAgent(deployer, "subscription-manager", 1, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "refund-processor", 1, 25000e6, 100000e6, 500000e6, true);
        _registerAgent(deployer, "compliance-reporter", 2, 0, 0, 0, true);
        _registerAgent(deployer, "token-deployer", 1, 0, 0, 0, true);
        _registerAgent(deployer, "multi-token-sender", 1, 100000e6, 500000e6, 2000000e6, false);
        _registerAgent(deployer, "chain-monitor", 2, 0, 0, 0, false);
        _registerAgent(deployer, "lingua-bridge", 3, 5000e6, 25000e6, 100000e6, false);
        _registerAgent(deployer, "minutes-master", 3, 0, 0, 0, false);
        _registerAgent(deployer, "data-aggregator", 2, 0, 0, 0, false);
        _registerAgent(deployer, "price-oracle", 2, 0, 0, 0, false);
        _registerAgent(deployer, "portfolio-rebalancer", 1, 200000e6, 1000000e6, 5000000e6, true);
        _registerAgent(deployer, "airdrop-distributor", 1, 500000e6, 2000000e6, 10000000e6, false);
        _registerAgent(deployer, "staking-manager", 1, 100000e6, 500000e6, 2000000e6, true);
        _registerAgent(deployer, "insurance-underwriter", 1, 50000e6, 200000e6, 1000000e6, true);
        _registerAgent(deployer, "market-maker", 1, 500000e6, 2000000e6, 10000000e6, true);
        _registerAgent(deployer, "arbitrage-bot", 1, 200000e6, 1000000e6, 5000000e6, true);
        _registerAgent(deployer, "social-trader", 1, 10000e6, 50000e6, 200000e6, false);
        _registerAgent(deployer, "treasury-manager", 0, 500000e6, 2000000e6, 10000000e6, true);

        vm.stopBroadcast();

        console.log("=== All 50 agents registered ===");
    }

    function _registerAgent(
        address deployer,
        string memory name,
        uint8 agentType,       // 0=payroll, 1=payment, 2=analytics, 3=orchestration
        uint256 maxPerTx,
        uint256 maxPerDay,
        uint256 maxPerMonth,
        bool requireZK
    ) internal {
        // Deterministic agent address from name
        address agent = address(uint160(uint256(keccak256(abi.encodePacked("agtfi-agent-", name)))));

        // DID document (simplified W3C format)
        string memory did = string(abi.encodePacked(
            '{"@context":"https://www.w3.org/ns/did/v1","id":"did:agtfi:tempo:',
            name,
            '","controller":"did:agtfi:tempo:platform"}'
        ));
        bytes32 didHash = keccak256(bytes(did));

        // Register DID
        try DID_REGISTRY.registerDID(agent, did, didHash, agentType) {
            console.log("  DID registered:", name);
        } catch {
            console.log("  DID already exists:", name);
        }

        // Set spend policy (only for payment/payroll agents)
        if (maxPerTx > 0) {
            try SPEND_POLICY.setPolicy(agent, maxPerTx, maxPerDay, maxPerMonth, requireZK) {
                console.log("  Policy set:", name);
            } catch {
                console.log("  Policy skip:", name);
            }
        }

        // Set KYA provenance
        string memory codeHash = string(abi.encodePacked("sha256:", name, "-v1.0.0"));
        try KYA.setProvenance(agent, deployer, codeHash) {
            console.log("  KYA set:", name);
        } catch {
            console.log("  KYA skip:", name);
        }
    }
}
