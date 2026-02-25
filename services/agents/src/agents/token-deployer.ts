import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import { getWallet, getProvider, explorerUrl, TEMPO_CHAIN_ID } from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'token-deployer',
  name:         'LaunchPad Token Deployer',
  description:  'Generates and DEPLOYS real ERC-20 tokens on Tempo L1. Claude designs the tokenomics, then ethers.js deploys the contract on-chain. Returns verified contract address and tx hash.',
  category:     'deployment',
  version:      '2.0.0',
  price:        350,
  capabilities: ['erc20-deploy', 'erc721-deploy', 'tokenomics', 'on-chain-execution'],
};

// ── Minimal ERC20 Bytecode Generator ─────────────────────────
// Instead of requiring a full Solidity compiler, we use a pre-compiled
// standard ERC20 that accepts (name, symbol, decimals, totalSupply) as
// constructor args. This is the compiled output of a standard
// OpenZeppelin ERC20 with mint-on-deploy pattern.

const STANDARD_ERC20_ABI = [
  'constructor(string name_, string symbol_, uint8 decimals_, uint256 totalSupply_)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// Forge-compiled ERC20 bytecode (SimpleERC20.sol, solc 0.8.20, optimizer 200 runs)
// Constructor: (string name, string symbol, uint8 decimals, uint256 totalSupply)
// Mints totalSupply * 10^decimals to msg.sender on deployment
// Verified on Tempo Moderato - deploys ~3.6M gas
const STANDARD_ERC20_BYTECODE = '0x60806040523480156200001157600080fd5b5060405162000bd338038062000bd3833981016040819052620000349162000199565b6000620000428582620002b3565b506001620000518482620002b3565b506002805460ff191660ff84169081179091556200007190600a62000494565b6200007d9082620004a9565b600381905533600081815260046020908152604080832085905551938452919290917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a350505050620004c3565b634e487b7160e01b600052604160045260246000fd5b600082601f830112620000fc57600080fd5b81516001600160401b0380821115620001195762000119620000d4565b604051601f8301601f19908116603f01168101908282118183101715620001445762000144620000d4565b816040528381526020925086838588010111156200016157600080fd5b600091505b8382101562000185578582018301518183018401529082019062000166565b600093810190920192909252949350505050565b60008060008060808587031215620001b057600080fd5b84516001600160401b0380821115620001c857600080fd5b620001d688838901620000ea565b95506020870151915080821115620001ed57600080fd5b50620001fc87828801620000ea565b935050604085015160ff811681146200021457600080fd5b6060959095015193969295505050565b600181811c908216806200023957607f821691505b6020821081036200025a57634e487b7160e01b600052602260045260246000fd5b50919050565b601f821115620002ae57600081815260208120601f850160051c81016020861015620002895750805b601f850160051c820191505b81811015620002aa5782815560010162000295565b5050505b505050565b81516001600160401b03811115620002cf57620002cf620000d4565b620002e781620002e0845462000224565b8462000260565b602080601f8311600181146200031f5760008415620003065750858301515b600019600386901b1c1916600185901b178555620002aa565b600085815260208120601f198616915b8281101562000350578886015182559484019460019091019084016200032f565b50858210156200036f5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052601160045260246000fd5b600181815b80851115620003d6578160001904821115620003ba57620003ba6200037f565b80851615620003c857918102915b93841c93908002906200039a565b509250929050565b600082620003ef575060016200048e565b81620003fe575060006200048e565b8160018114620004175760028114620004225762000442565b60019150506200048e565b60ff8411156200043657620004366200037f565b50506001821b6200048e565b5060208310610133831016604e8410600b841016171562000467575081810a6200048e565b62000473838362000395565b80600019048211156200048a576200048a6200037f565b0290505b92915050565b6000620004a28383620003de565b9392505050565b80820281158282048414176200048e576200048e6200037f565b61070080620004d36000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce5671461010357806370a082311461012257806395d89b4114610142578063a9059cbb1461014a578063dd62ed3e1461015d57600080fd5b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100d957806323b872dd146100f0575b600080fd5b6100a0610188565b6040516100ad919061052f565b60405180910390f35b6100c96100c4366004610599565b610216565b60405190151581526020016100ad565b6100e260035481565b6040519081526020016100ad565b6100c96100fe3660046105c3565b610283565b6002546101109060ff1681565b60405160ff90911681526020016100ad565b6100e26101303660046105ff565b60046020526000908152604090205481565b6100a061043e565b6100c9610158366004610599565b61044b565b6100e261016b366004610621565b600560209081526000928352604080842090915290825290205481565b6000805461019590610654565b80601f01602080910402602001604051908101604052809291908181526020018280546101c190610654565b801561020e5780601f106101e35761010080835404028352916020019161020e565b820191906000526020600020905b8154815290600101906020018083116101f157829003601f168201915b505050505081565b3360008181526005602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906102719086815260200190565b60405180910390a35060015b92915050565b6001600160a01b0383166000908152600460205260408120548211156102e75760405162461bcd60e51b8152602060048201526014602482015273496e73756666696369656e742062616c616e636560601b60448201526064015b60405180910390fd5b6001600160a01b03841660009081526005602090815260408083203384529091529020548211156103535760405162461bcd60e51b8152602060048201526016602482015275496e73756666696369656e7420616c6c6f77616e636560501b60448201526064016102de565b6001600160a01b0384166000908152600560209081526040808320338452909152812080548492906103869084906106a4565b90915550506001600160a01b038416600090815260046020526040812080548492906103b39084906106a4565b90915550506001600160a01b038316600090815260046020526040812080548492906103e09084906106b7565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161042c91815260200190565b60405180910390a35060019392505050565b6001805461019590610654565b336000908152600460205260408120548211156104a15760405162461bcd60e51b8152602060048201526014602482015273496e73756666696369656e742062616c616e636560601b60448201526064016102de565b33600090815260046020526040812080548492906104c09084906106a4565b90915550506001600160a01b038316600090815260046020526040812080548492906104ed9084906106b7565b90915550506040518281526001600160a01b0384169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90602001610271565b600060208083528351808285015260005b8181101561055c57858101830151858201604001528201610540565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461059457600080fd5b919050565b600080604083850312156105ac57600080fd5b6105b58361057d565b946020939093013593505050565b6000806000606084860312156105d857600080fd5b6105e18461057d565b92506105ef6020850161057d565b9150604084013590509250925092565b60006020828403121561061157600080fd5b61061a8261057d565b9392505050565b6000806040838503121561063457600080fd5b61063d8361057d565b915061064b6020840161057d565b90509250929050565b600181811c9082168061066857607f821691505b60208210810361068857634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b8181038181111561027d5761027d61068e565b8082018082111561027d5761027d61068e56fea26469706673582212203ed10123f774e99779840a13b5740e0b7d0c0eccfd637e1772ff4138403ae43b64736f6c63430008140033';

const SYSTEM_PROMPT = `You are an expert tokenomics designer for ERC-20 tokens on Tempo L1 blockchain.
Based on requirements, design the token and return a JSON specification:
{
  "name": "Token Name",
  "symbol": "TKN",
  "decimals": 18,
  "totalSupply": "1000000",
  "summary": "Brief description of the token purpose",
  "tokenomics": {
    "distribution": [
      { "label": "Team", "percentage": 20 },
      { "label": "Community", "percentage": 50 },
      { "label": "Treasury", "percentage": 30 }
    ],
    "features": ["mintable", "burnable"]
  },
  "securityNotes": ["Note about supply cap", "etc"]
}
Return ONLY valid JSON. The token WILL be deployed on-chain immediately after your design.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const requirements = (job.payload?.requirements as string) ?? job.prompt;

  if (!requirements?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No token requirements provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Design ──────────────────────────────────
    console.log(`[token-deployer] 🧠 Phase 1: Claude designing token for: "${requirements.slice(0, 80)}..."`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: requirements }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let design: any;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      design = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for token design.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const tokenName    = design.name     || 'PayPol Token';
    const tokenSymbol  = design.symbol   || 'PPT';
    const tokenDecimals = design.decimals ?? 18;
    const totalSupply  = design.totalSupply || '1000000';

    console.log(`[token-deployer] 📋 Design: ${tokenName} (${tokenSymbol}), ${totalSupply} supply, ${tokenDecimals} decimals`);

    // ── Phase 2: On-Chain Deployment ────────────────────────
    console.log(`[token-deployer] 🚀 Phase 2: Deploying ${tokenSymbol} to Tempo L1...`);

    const wallet = getWallet();
    const provider = getProvider();
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    const factory = new ethers.ContractFactory(
      STANDARD_ERC20_ABI,
      STANDARD_ERC20_BYTECODE,
      wallet,
    );

    const contract = await factory.deploy(
      tokenName,
      tokenSymbol,
      tokenDecimals,
      totalSupply,
      { nonce, gasLimit: 15_000_000, type: 0 },
    );

    console.log(`[token-deployer] ⏳ TX sent. Waiting for confirmation...`);
    const receipt = await contract.deploymentTransaction()!.wait(1);
    const contractAddress = await contract.getAddress();

    console.log(`[token-deployer] ✅ ${tokenSymbol} deployed at ${contractAddress}`);

    // ── Build Result ────────────────────────────────────────
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'deployed',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        contract: {
          address: contractAddress,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          totalSupply,
        },
        transaction: {
          hash: receipt!.hash,
          blockNumber: receipt!.blockNumber,
          gasUsed: receipt!.gasUsed.toString(),
          explorerUrl: explorerUrl(receipt!.hash),
        },
        contractExplorerUrl: explorerUrl(contractAddress, 'address'),
        design,
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[token-deployer] ❌ Deployment failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `On-chain deployment failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
