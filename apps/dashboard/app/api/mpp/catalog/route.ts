import { NextResponse } from 'next/server';

/**
 * MPP API Catalog — curated list of providers available through
 * Machine Payments Protocol + Locus wrapped APIs.
 *
 * Sources:
 *  - Locus x402 wrapped APIs (pay-per-call)
 *  - Laso Finance (prepaid cards, Venmo, PayPal)
 *  - MPP-native endpoints (mpp.dev)
 */

export interface CatalogProvider {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoints: number;
  pricing: string;
  paymentMethods: ('stablecoin' | 'card')[];
  status: 'live' | 'coming_soon';
  icon: string; // emoji
  tags: string[];
}

const CATALOG: CatalogProvider[] = [
  // ── AI & Language Models ──────────────────
  { id: 'openai', name: 'OpenAI', category: 'AI Models', description: 'GPT-4o, GPT-4 Turbo, DALL-E, Whisper, Embeddings', endpoints: 12, pricing: '$0.001-$0.10/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🤖', tags: ['llm', 'vision', 'embeddings', 'tts'] },
  { id: 'anthropic', name: 'Anthropic', category: 'AI Models', description: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude Haiku', endpoints: 6, pricing: '$0.001-$0.08/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🧠', tags: ['llm', 'reasoning', 'coding'] },
  { id: 'google-ai', name: 'Google AI', category: 'AI Models', description: 'Gemini Pro, Gemini Ultra, PaLM 2', endpoints: 8, pricing: '$0.001-$0.05/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🔮', tags: ['llm', 'multimodal', 'search'] },
  { id: 'mistral', name: 'Mistral AI', category: 'AI Models', description: 'Mistral Large, Medium, Mixtral 8x7B', endpoints: 5, pricing: '$0.0005-$0.03/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🌊', tags: ['llm', 'open-source'] },
  { id: 'cohere', name: 'Cohere', category: 'AI Models', description: 'Command R+, Embed, Rerank', endpoints: 6, pricing: '$0.001-$0.02/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '💡', tags: ['llm', 'embeddings', 'rag'] },
  { id: 'replicate', name: 'Replicate', category: 'AI Models', description: 'Open-source model hosting — Llama, Stable Diffusion, etc.', endpoints: 15, pricing: '$0.001-$0.50/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🔄', tags: ['llm', 'image', 'video', 'audio'] },

  // ── Image & Media ─────────────────────────
  { id: 'stability', name: 'Stability AI', category: 'Image Generation', description: 'Stable Diffusion XL, SD3, Image upscaling', endpoints: 8, pricing: '$0.01-$0.10/image', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🎨', tags: ['image', 'generation', 'upscale'] },
  { id: 'ideogram', name: 'Ideogram', category: 'Image Generation', description: 'Text-to-image with superior text rendering', endpoints: 4, pricing: '$0.02-$0.08/image', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '✏️', tags: ['image', 'text-rendering'] },
  { id: 'elevenlabs', name: 'ElevenLabs', category: 'Audio & Speech', description: 'Text-to-speech, voice cloning, sound effects', endpoints: 6, pricing: '$0.01-$0.30/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🎙️', tags: ['tts', 'voice', 'audio'] },

  // ── Data & Search ─────────────────────────
  { id: 'serper', name: 'Serper', category: 'Web Search', description: 'Google Search API — web, images, news, shopping', endpoints: 5, pricing: '$0.001-$0.005/search', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🔍', tags: ['search', 'google', 'news'] },
  { id: 'tavily', name: 'Tavily', category: 'Web Search', description: 'AI-optimized search for agents and RAG pipelines', endpoints: 3, pricing: '$0.001-$0.01/search', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🌐', tags: ['search', 'ai-search', 'rag'] },
  { id: 'firecrawl', name: 'Firecrawl', category: 'Web Scraping', description: 'Crawl, scrape, and extract structured data from websites', endpoints: 6, pricing: '$0.005-$0.02/page', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🕷️', tags: ['scraping', 'crawling', 'extraction'] },
  { id: 'browserless', name: 'Browserless', category: 'Web Scraping', description: 'Headless Chrome API for screenshots, PDF, scraping', endpoints: 8, pricing: '$0.005-$0.05/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🖥️', tags: ['browser', 'screenshot', 'pdf'] },

  // ── Financial Data ────────────────────────
  { id: 'alpha-vantage', name: 'Alpha Vantage', category: 'Financial Data', description: 'Stock quotes, forex, crypto, technical indicators', endpoints: 12, pricing: '$0.002-$0.01/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '📈', tags: ['stocks', 'forex', 'crypto', 'indicators'] },
  { id: 'polygon', name: 'Polygon.io', category: 'Financial Data', description: 'Real-time & historical market data, options, crypto', endpoints: 15, pricing: '$0.001-$0.02/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '📊', tags: ['market-data', 'options', 'real-time'] },
  { id: 'coinmarketcap', name: 'CoinMarketCap', category: 'Financial Data', description: 'Crypto prices, market cap, rankings, exchanges', endpoints: 8, pricing: '$0.001-$0.005/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '💰', tags: ['crypto', 'prices', 'rankings'] },

  // ── Developer Tools ───────────────────────
  { id: 'e2b', name: 'E2B', category: 'Code Execution', description: 'Sandboxed code execution for AI agents — Python, JS, more', endpoints: 5, pricing: '$0.01-$0.10/run', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '⚡', tags: ['sandbox', 'code', 'execution'] },
  { id: 'resend', name: 'Resend', category: 'Communications', description: 'Email API for developers — transactional and marketing', endpoints: 6, pricing: '$0.001-$0.01/email', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '📧', tags: ['email', 'transactional'] },
  { id: 'twilio', name: 'Twilio', category: 'Communications', description: 'SMS, WhatsApp, voice calls, verification', endpoints: 10, pricing: '$0.005-$0.10/msg', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '📱', tags: ['sms', 'whatsapp', 'voice'] },

  // ── Geolocation & Maps ────────────────────
  { id: 'mapbox', name: 'Mapbox', category: 'Geolocation', description: 'Maps, geocoding, directions, isochrone', endpoints: 8, pricing: '$0.001-$0.02/call', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '🗺️', tags: ['maps', 'geocoding', 'directions'] },
  { id: 'ipinfo', name: 'IPinfo', category: 'Geolocation', description: 'IP geolocation, ASN, privacy detection', endpoints: 4, pricing: '$0.001/lookup', paymentMethods: ['stablecoin', 'card'], status: 'live', icon: '📍', tags: ['ip', 'geolocation', 'privacy'] },

  // ── Laso Finance (Native) ─────────────────
  { id: 'laso-cards', name: 'Laso Prepaid Cards', category: 'Payment Rails', description: 'Instant prepaid Visa cards funded with USDC ($5-$1,000)', endpoints: 4, pricing: '$5-$1,000/card', paymentMethods: ['stablecoin'], status: 'live', icon: '💳', tags: ['visa', 'prepaid', 'cards'] },
  { id: 'laso-venmo', name: 'Laso Venmo', category: 'Payment Rails', description: 'Send payments via Venmo using USDC', endpoints: 2, pricing: '$5-$1,000 + fee', paymentMethods: ['stablecoin'], status: 'live', icon: '💸', tags: ['venmo', 'p2p', 'payments'] },
  { id: 'laso-paypal', name: 'Laso PayPal', category: 'Payment Rails', description: 'Send payments via PayPal using USDC', endpoints: 2, pricing: '$5-$1,000 + fee', paymentMethods: ['stablecoin'], status: 'live', icon: '🅿️', tags: ['paypal', 'p2p', 'payments'] },
  { id: 'laso-gift', name: 'Laso Gift Cards', category: 'Payment Rails', description: 'Order gift cards from 100+ brands with USDC', endpoints: 3, pricing: '$5-$9,000/card', paymentMethods: ['stablecoin'], status: 'live', icon: '🎁', tags: ['gift-cards', 'shopping'] },
];

export async function GET() {
  const categories = [...new Set(CATALOG.map(p => p.category))];
  const totalEndpoints = CATALOG.reduce((s, p) => s + p.endpoints, 0);

  return NextResponse.json({
    success: true,
    providers: CATALOG,
    meta: {
      totalProviders: CATALOG.length,
      totalEndpoints,
      categories,
      paymentMethods: ['Stablecoin (USDC)', 'Credit/Debit Card (via Stripe)'],
      protocol: 'MPP — Machine Payments Protocol',
      network: 'Base (USDC) + Stripe Card Rails',
    },
  });
}
