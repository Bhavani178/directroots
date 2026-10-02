import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Require authenticated farmer
    if (!session || session.user?.role !== "FARMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { transcript } = await req.json()

    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.gemini_api_key
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const prompt = `You are a voice navigation assistant for a farmer marketplace app. 
Given a user's spoken transcript, identify which navigation intent it matches.

Match by MEANING, not exact wording. Users will phrase things differently 
each time — generalize from the examples below rather than requiring exact phrases.

Available intents:
1. "home" — user wants to go to the main landing page/home page
   Examples: "go home", "take me to the main page", "homepage"
2. "farmer_dashboard" — user wants to go to the farmer dashboard/overview page
   Examples: "open farmer dashboard", "go to dashboard", "show my dashboard", "farmer home", "my farm page"
3. "orders" — user wants to see their own order history/status (as a seller)
   Examples: "show my orders", "orders", "what orders do I have", "order status"
4. "add_product" — user wants to list/add a new product for sale
   Examples: "add product", "I want to sell something", "list a new item", "add a new crop"
5. "delivery_map" — user wants to see delivery routes/locations
   Examples: "delivery map", "show deliveries", "where are my deliveries"
6. "profile" — user wants their account/profile page
   Examples: "profile", "my account", "my details", "go to profile page"
7. "marketplace" — user wants to browse or buy products from the marketplace
   Examples: "go to marketplace", "show me products to buy", "I want to shop", "browse products"

Rules:
- Match based on intent/meaning, allowing for natural variation in phrasing.
- If the transcript is empty or pure noise, return intent as "empty".
- If the intent is genuinely unrelated to all of the above, return intent as "unrecognized".
- Always respond with strict JSON: { "intent": "<value>", "confidence": <0-1> }

Transcript: "${transcript}"`

    // Helper: call a Gemini model, auto-retry once on 503 (transient overload)
    const callGemini = async (modelName: string): Promise<Response> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
      const opts = { method: "POST", headers: { "Content-Type": "application/json" }, body }
      let res = await fetch(url, opts)
      // 503 = transient overload — wait 1s and retry once
      if (res.status === 503) {
        console.warn(`[voice-intent] ${modelName} returned 503, retrying once...`)
        await new Promise(r => setTimeout(r, 1000))
        res = await fetch(url, opts)
      }
      return res
    }

    // Primary: gemini-3.6-flash (confirmed working for this key)
    let response = await callGemini("gemini-3.6-flash")

    // Fallback: gemini-3.5-flash-lite — confirmed in model list, lite tier has higher free RPM
    // Only fall back on 429 (quota) or 503 (overload) — not on 404 or 401 (those won't be fixed by switching)
    if (!response.ok && (response.status === 429 || response.status === 503)) {
      console.warn(`[voice-intent] gemini-3.6-flash returned ${response.status}, falling back to gemini-3.5-flash-lite`)
      response = await callGemini("gemini-3.5-flash-lite")
    }

    if (!response.ok) {
      const errText = await response.text()
      let errJson: any = {}
      try { errJson = JSON.parse(errText) } catch {}
      const httpStatus = response.status
      const geminiErrorType =
        httpStatus === 429 ? "rate_limited" :
        httpStatus === 503 ? "overloaded" :
        httpStatus === 404 ? "model_not_found" :
        httpStatus === 401 || httpStatus === 403 ? "auth_error" :
        "api_error"
      console.error(`[voice-intent] Gemini ${httpStatus} (${geminiErrorType}):`, errText)
      return NextResponse.json(
        { error: "Failed to process intent", geminiStatus: httpStatus, geminiErrorType, geminiMessage: errJson?.error?.message ?? errText },
        { status: 502 }
      )
    }

    const data = await response.json()
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    
    let parsed
    try {
      parsed = JSON.parse(textContent)
    } catch (e) {
      return NextResponse.json({ intent: "unrecognized" })
    }

    // Validate the intent against the allowlist strictly on the backend
    const allowedIntents = ["home", "farmer_dashboard", "orders", "add_product", "delivery_map", "profile", "marketplace", "empty"]
    
    if (parsed.intent && allowedIntents.includes(parsed.intent)) {
      return NextResponse.json({
        intent: parsed.intent
      })
    }

    // Default fallback for unrelated questions
    return NextResponse.json({ intent: "unrecognized" })

  } catch (error) {
    console.error("Voice intent error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
