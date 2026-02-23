// @ts-nocheck
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
    console.log("🚀 Initiating Deployment to TEMPO TESTNET (Moderato)...");

    // 1. Establish connection to Tempo RPC
    const rpcUrl = "https://rpc.moderato.tempo.xyz";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 2. Retrieve Private Key from environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("❌ Missing PRIVATE_KEY in .env file!");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`👤 Deploying with account: ${wallet.address}`);

    // Verify wallet balance on Tempo Testnet
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Current balance: ${ethers.formatEther(balance)} USD (Tempo Native Token)`);

    // 3. Read ABI & Bytecode artifacts
    const artifactPath = path.resolve(process.cwd(), "artifacts/contracts/PayPolNexus.sol/PayPolNexus.json");
    
    if (!fs.existsSync(artifactPath)) {
        throw new Error("❌ Artifact JSON not found. You must run 'npx hardhat compile' first!");
    }

    const artifactJson = fs.readFileSync(artifactPath, "utf8");
    const artifact = JSON.parse(artifactJson);

    // 4. Broadcast Deployment to TEMPO network
    console.log("⏳ Broadcasting transaction to the network... Please wait...");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n=======================================================");
    console.log(`🎉 PAYPOL NEXUS SUCCESSFULLY DEPLOYED TO TEMPO TESTNET!`);
    console.log(`📜 Contract Address: ${contractAddress}`);
    console.log(`🔍 Block Explorer: https://explore.tempo.xyz/address/${contractAddress}`);
    console.log("=======================================================\n");
}

main().catch((error) => {
    console.error("❌ Fatal Error:", error.message || error);
    process.exitCode = 1;
});