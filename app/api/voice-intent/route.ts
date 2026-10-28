import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Require authenticated producer (FARMER or ARTISAN) or ADMIN
    const role = session?.user?.role
    if (!session || (role !== "FARMER" && role !== "ARTISAN" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: Max 20 requests per minute per user
    const rateLimit = checkRateLimit(req, `voice:${session.user.id}`, 20, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many voice queries. Please wait ${rateLimit.retryAfter} seconds.` },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { transcript } = body

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
    }

    // Input sanitization: Cap length to 500 characters
    const cleanTranscript = transcript.trim().slice(0, 500)

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.gemini_api_key
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Voice processing service is not configured" }, { status: 503 })
    }

    const prompt = `You are a voice navigation assistant for a farmer marketplace app. 
Given a user's spoken transcript, identify which navigation intent it matches.

Match by MEANING, not exact wording. Users will phrase things differently 
each time — generalize from the examples below rather than requiring exact phrases.

Available intents:
1. "home" — user wants to go to the main landing page/home page
   Examples: "go home", "take me to the main page", "homepage"
2. "farmer_dashboard" — user wants to go to the producer dashboard/overview page
   Examples: "open farmer dashboard", "go to dashboard", "show my dashboard", "farmer home", "my farm page", "producer home"
3. "orders" — user wants to see their own order history/status (as a seller)
   Examples: "show my orders", "orders", "what orders do I have", "order status"
4. "add_product" — user wants to list/add a new product for sale
   Examples: "add product", "I want to sell something", "list a new item", "add a new crop", "sell craft"
5. "delivery_map" — user wants to see delivery routes/locations
   Examples: "delivery map", "show deliveries", "where are my deliveries", "route"
6. "profile" — user wants their account/profile page
   Examples: "profile", "my account", "my details", "go to profile page"
7. "marketplace" — user wants to browse or buy products from the marketplace
   Examples: "go to marketplace", "show me products to buy", "I want to shop", "browse products"

Rules:
- Match based on intent/meaning, allowing for natural variation in phrasing.
- If the transcript is empty or pure noise, return intent as "empty".
- If the intent is genuinely unrelated to all of the above, return intent as "unrecognized".
- Always respond with strict JSON: { "intent": "<value>", "confidence": <0-1> }

Transcript: "${cleanTranscript.replace(/"/g, '\\"')}"`

    // Helper: call a Gemini model with timeout
    const callGemini = async (modelName: string): Promise<Response> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      })
      const opts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(6000),
      }

      let res = await fetch(url, opts)
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 1000))
        res = await fetch(url, opts)
      }
      return res
    }

    // Try primary model
    let response: Response
    try {
      response = await callGemini("gemini-3.6-flash")
    } catch {
      // Fallback model on network / timeout
      try {
        response = await callGemini("gemini-3.5-flash-lite")
      } catch {
        return NextResponse.json({ intent: "unrecognized" })
      }
    }

    if (!response.ok && (response.status === 429 || response.status === 503)) {
      try {
        response = await callGemini("gemini-3.5-flash-lite")
      } catch {
        return NextResponse.json({ intent: "unrecognized" })
      }
    }

    if (!response.ok) {
      return NextResponse.json({ intent: "unrecognized" })
    }

    const data = await response.json()
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    let parsed: any
    try {
      parsed = JSON.parse(textContent)
    } catch {
      return NextResponse.json({ intent: "unrecognized" })
    }

    const allowedIntents = [
      "home",
      "farmer_dashboard",
      "orders",
      "add_product",
      "delivery_map",
      "profile",
      "marketplace",
      "empty",
    ]

    if (parsed.intent && allowedIntents.includes(parsed.intent)) {
      return NextResponse.json({ intent: parsed.intent })
    }

    return NextResponse.json({ intent: "unrecognized" })
  } catch (error) {
    console.error("[POST /api/voice-intent] Internal error")
    return NextResponse.json({ intent: "unrecognized" })
  }
}
