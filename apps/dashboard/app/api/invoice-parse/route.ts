import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, content, fileName, mimeType } = body;

        if (!content) {
            return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
        }

        const systemPrompt = `You are the "PayPol Invoice Analyst", an AI that extracts payment data from invoices.

Your job is to parse invoice content and extract line items for a Web3 payroll/payment system.

CRITICAL: Respond in valid JSON format only. No markdown formatting, no code blocks.

For each line item found in the invoice, extract:
- "name": The recipient name, company, or service description (human-readable)
- "wallet": The blockchain wallet address if found in the invoice (0x...), otherwise "0x00...00"
- "amount": The payment amount as a string number (e.g., "5000")
- "token": Default to "AlphaUSD" unless a specific token/currency is mentioned
- "note": Description, invoice reference, or service details

JSON FORMAT:
{
    "success": true,
    "invoiceFrom": "Sender company or person name",
    "invoiceNumber": "Invoice reference number if found",
    "invoiceDate": "Date if found",
    "intents": [
        {
            "name": "Recipient or Service name",
            "wallet": "0x... or 0x00...00 if not found",
            "amount": "1000",
            "token": "AlphaUSD",
            "note": "Invoice #XXX - Service description"
        }
    ]
}

If you cannot extract any payment data, return:
{
    "success": false,
    "error": "Explanation of why parsing failed"
}

IMPORTANT:
- Extract ALL line items from the invoice
- Keep amounts as numbers without currency symbols
- If multiple currencies, note the currency in the token field
- If wallet addresses are present, extract them accurately
- Always include a descriptive note for each line item`;

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
        ];

        if (type === 'file' && content) {
            if (mimeType?.startsWith('image/')) {
                // For images: use GPT-4o-mini vision
                messages.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: `Extract all payment line items from this invoice image (${fileName}). Be thorough — extract every single payable item.` },
                        { type: 'image_url', image_url: { url: content, detail: 'high' } }
                    ]
                });
            } else if (mimeType === 'text/plain') {
                // For text files: decode base64 and send as text
                const base64Data = content.split(',')[1] || content;
                const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
                messages.push({
                    role: 'user',
                    content: `Extract all payment line items from this invoice:\n\n${textContent}`
                });
            } else if (mimeType === 'application/pdf') {
                // PDF: extract what we can from the base64 data
                // In production, use a PDF parser library. For now, attempt to extract text.
                const base64Data = content.split(',')[1] || content;
                const rawText = Buffer.from(base64Data, 'base64').toString('utf-8');
                // Extract any readable text from the PDF binary
                const readableText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();

                if (readableText.length > 50) {
                    messages.push({
                        role: 'user',
                        content: `Extract all payment line items from this PDF invoice (${fileName}). Here is the extracted text:\n\n${readableText.substring(0, 8000)}`
                    });
                } else {
                    return NextResponse.json({
                        success: false,
                        error: 'Could not extract text from PDF. Please try uploading an image (screenshot) of the invoice instead.'
                    });
                }
            } else {
                return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
            }
        } else if (type === 'text') {
            messages.push({
                role: 'user',
                content: `Extract all payment line items from this invoice:\n\n${content}`
            });
        } else {
            return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages,
            temperature: 0.1,
            max_tokens: 2000,
        });

        const resultText = completion.choices[0].message.content;
        if (!resultText) {
            throw new Error('AI returned an empty response.');
        }

        const parsed = JSON.parse(resultText);
        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error('Invoice Parse Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to parse invoice. Please try again.' },
            { status: 500 }
        );
    }
}
