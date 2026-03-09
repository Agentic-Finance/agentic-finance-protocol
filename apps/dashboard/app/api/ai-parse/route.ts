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
The user may write in Vietnamese or English. Understand both languages.

# IF IT'S A TRANSACTION (ACTION):
Extract the transaction intents. The user might want to pay multiple people.
Supported Tokens: ${supportedTokens.join(", ")}. If not specified in prompt, default to "AlphaUSD".
Known Contacts: ${addressBook.join(", ")}.

## SCHEDULING / CONDITIONAL DETECTION
IMPORTANT: Detect if the user wants to schedule, repeat, or set conditions for the payment.

Look for these patterns (Vietnamese & English):
- Time-based: "ngày 1 hàng tháng", "mỗi tháng", "every month", "on the 1st", "weekly", "hàng tuần", "mỗi tuần", "ngày 15/3", "tomorrow", "ngày mai", "next Monday", "thứ 2 tuần sau"
- Balance-based: "khi treasury có đủ tiền", "when balance > X", "khi ví có trên X", "if wallet has enough"
- Price-based: "khi giá > X", "when price hits", "khi AlphaUSD đạt $1.05"
- Conditions: "nếu", "khi", "when", "if", "after"

If scheduling/conditional intent is detected, include a "scheduling" field in your response.

JSON FORMAT FOR ACTION:
{
    "actionType": "ACTION",
    "intents": [
        {
            "name": "The person's name EXACTLY as mentioned (e.g. 'Alice', 'Bob'). Only use 'Unknown' if the user provided a raw wallet address (0x...) with no associated name.",
            "wallet": "The 0x wallet address if provided (e.g. '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793'). Extract it exactly as-is. Leave empty string if no wallet address is present.",
            "amount": "Numeric amount as a string (e.g. '500')",
            "token": "Token symbol (e.g. 'AlphaUSD')",
            "note": "Reason for payment or leave empty"
        }
    ],
    "scheduling": null
}

## SCHEDULING FIELD (include when scheduling/conditional intent detected):
{
    "scheduling": {
        "conditions": [
            {
                "type": "date_time | wallet_balance | price_feed | tvl_threshold",
                "param": "parameter (e.g. '1st of month', wallet address, token name)",
                "operator": ">= | <= | == | > | <",
                "value": "target value (e.g. '1st of month', '50000', '$1.05')"
            }
        ],
        "conditionLogic": "AND",
        "recurring": "once | weekly | monthly"
    }
}

SCHEDULING RULES:
- "ngày 1 hàng tháng" / "every 1st of month" / "mỗi tháng vào ngày 1":
  → type: "date_time", param: "day-of-month", operator: "==", value: "1st of month", recurring: "monthly"
- "mỗi tuần" / "every week" / "hàng tuần":
  → type: "date_time", param: "weekly", operator: "==", value: "weekly", recurring: "weekly"
- "ngày 15/3/2026" / "on March 15, 2026":
  → type: "date_time", param: "specific-date", operator: ">=", value: "2026-03-15", recurring: "once"
- "ngày mai" / "tomorrow":
  → type: "date_time", param: "specific-date", operator: ">=", value: "[tomorrow's ISO date]", recurring: "once"
- "khi ví treasury > $50k" / "when treasury balance above $50,000":
  → type: "wallet_balance", param: "[wallet address or 'treasury']", operator: ">=", value: "50000", recurring: "once"
- "khi giá AlphaUSD >= $1.05" / "when AlphaUSD reaches $1.05":
  → type: "price_feed", param: "AlphaUSD", operator: ">=", value: "$1.05", recurring: "once"
- If NO scheduling intent detected → set "scheduling": null

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