const express = require('express');
const cors = require('cors');
const { ethers } = require("ethers");

const app = express();
app.use(cors()); // Allow Frontend to connect
app.use(express.json());

const PORT = 4000;

// --- MOCK DB ---
let currentJob = null;

// --- API 1: HIRE AGENTS (Khởi tạo) ---
app.post('/api/hire', (req, res) => {
    console.log("🤖 Request received: Spawning AI Agents...");
    
    const devAgent = ethers.Wallet.createRandom();
    const auditAgent = ethers.Wallet.createRandom();

    currentJob = {
        dev: devAgent,
        audit: auditAgent,
        jobId: Date.now() // Unique ID
    };

    console.log(`   ✅ Agents Created: ${devAgent.address.slice(0,6)}... & ${auditAgent.address.slice(0,6)}...`);

    res.json({
        success: true,
        devAddress: devAgent.address,
        auditAddress: auditAgent.address
    });
});

// --- API 2: SIMULATE WORK & SIGN (Giả lập làm việc & Ký) ---
app.post('/api/work', async (req, res) => {
    if (!currentJob) return res.status(400).json({ error: "No job found" });

    console.log("\n🕵️  Simulating: Dev pushing code & Audit reviewing...");
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 2000));

    // --- SIGNING LOGIC ---
    // Message: "APPROVED" (Simplification for demo)
    // In production, match Solidity keccak256
    const message = "APPROVED"; 
    const signature = await currentJob.audit.signMessage(message);

    console.log(`✍️  Work Approved. Signature: ${signature.slice(0, 10)}...`);

    res.json({
        success: true,
        status: "APPROVED",
        signature: signature,
        message: "Code verified by AI Judge. Payment authorized."
    });
});

app.listen(PORT, () => {
    console.log(`🚀 AI Brain is running on http://localhost:${PORT}`);
});