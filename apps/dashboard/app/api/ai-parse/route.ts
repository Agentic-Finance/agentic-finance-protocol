import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy-init: avoid throwing at module load when OPENAI_API_KEY is unset (CI builds)
let _openai: OpenAI | null = null;
function getOpenAI() {
    if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, supportedTokens, addressBook, systemData } = body;

        // System prompt to instruct the AI to act as a Data Analyst and strictly return JSON
        const systemPrompt = `
You are the "PayPol Data Analyst", an advanced AI embedded in a Web3 payroll system.
Your job is to parse the user's input and determine if it's a general question (CHAT) or a request to execute a transaction (ACTION).

CRITICAL: You MUST respond in valid JSON format. Do not include markdown formatting like \`\`\`json.

# IF IT'S A TRANSACTION (ACTION):
Extract the transaction intents. The user might want to pay multiple people.
Supported Tokens: ${supportedTokens.join(", ")}. If not specified in prompt, default to "AlphaUSD".
Known Contacts: ${addressBook.join(", ")}.

JSON FORMAT FOR ACTION:
{
    "actionType": "ACTION",
    "intents": [
        {
            "name": "The person's name EXACTLY as mentioned in the user's prompt (e.g. 'Alice', 'Bob'). Only use 'Unknown' if the user provided a raw wallet address (0x...) with no associated name.",
            "amount": "Numeric amount as a string (e.g. '500')",
            "token": "Token symbol (e.g. 'AlphaUSD')",
            "note": "Reason for payment or leave empty"
        }
    ]
}

# IF IT'S A GENERAL QUESTION (CHAT):
Answer the question directly and professionally based on the system data provided. Do not invent data.
System Data: ${JSON.stringify(systemData)}

JSON FORMAT FOR CHAT:
{
    "actionType": "CHAT",
    "answer": "Your helpful response here."
}
        `;

        // Call OpenAI API using the cost-effective gpt-4o-mini model
        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }, // Enforce strictly JSON response
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.1, // Low temperature for deterministic, stable parsing
        });

        const resultText = completion.choices[0].message.content;
        
        if (!resultText) {
            throw new Error("AI returned an empty response.");
        }

        const parsedResult = JSON.parse(resultText);
        
        return NextResponse.json(parsedResult);

    } catch (error: any) {
        console.error("OpenAI Parse Error:", error);
        return NextResponse.json({ error: "Failed to parse intent." }, { status: 500 });
    }
}