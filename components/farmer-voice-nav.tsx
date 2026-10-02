"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Mic, Loader2, Volume2, VolumeX } from "lucide-react"
import { Button } from "./ui/button"

const INTENT_ROUTES: Record<string, string> = {
  home: "/",
  farmer_dashboard: "/farmer",
  orders: "/orders",
  add_product: "/farmer/products/new",
  delivery_map: "/farmer/delivery-map",
  profile: "/profile",
  marketplace: "/marketplace",
}

export function FarmerVoiceNav() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [voiceOn, setVoiceOn] = useState(false)
  const [showUI, setShowUI] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    // Load preference from local storage
    const saved = localStorage.getItem("farmer-voice-preference")
    if (saved === "ON") {
      setVoiceOn(true)
    }
  }, [])

  const toggleVoice = () => {
    const newVal = !voiceOn
    setVoiceOn(newVal)
    localStorage.setItem("farmer-voice-preference", newVal ? "ON" : "OFF")
  }

  const speak = (text: string) => {
    if (!voiceOn || !window.speechSynthesis) return
    window.speechSynthesis.cancel() // stop current
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    if (!isSpeechSupported) {
      setStatusMessage("Your browser does not support voice recognition.")
      setShowUI(true)
      return
    }

    try {
      setShowUI(true)
      setTranscript("")
      setStatusMessage("Listening...")
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript
        setTranscript(text)
        setStatusMessage("Processing...")
        setIsListening(false)
        
        if (!text || !text.trim()) {
          setStatusMessage("Could not hear anything clearly.")
          return
        }
        
        await processIntent(text)
      }

      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setStatusMessage("Microphone permission denied.")
        } else if (event.error === 'no-speech') {
          setStatusMessage("No speech detected.")
        } else {
          setStatusMessage("Error recognizing speech.")
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.start()
      setIsListening(true)
    } catch (e) {
      console.error(e)
      setStatusMessage("Could not start microphone.")
      setIsListening(false)
    }
  }

  const processIntent = async (text: string) => {
    try {
      const res = await fetch("/api/voice-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        let msg = "Sorry, there was an error processing your request."
        if (errorData.error === "Failed to process intent") {
        if (errorData.geminiErrorType === "rate_limited" || errorData.geminiErrorType === "overloaded") {
            msg = "The AI is currently busy. Please wait a few seconds and try again."
          } else if (errorData.geminiErrorType === "model_not_found") {
            msg = "Voice AI model unavailable. Please contact support."
          } else if (errorData.geminiErrorType === "auth_error") {
            msg = "Voice AI authentication error. Please contact support."
          } else {
            msg = "Voice AI error. Please try again."
          }
        }
        console.error("[VoiceNav] Backend error:", errorData)
        setStatusMessage(msg)
        speak(msg)
        return
      }

      const data = await res.json()
      const intent = data.intent

      if (intent === "empty") {
        const msg = "Could not hear anything clearly."
        setStatusMessage(msg)
        speak(msg)
      } else if (intent === "unrecognized" || intent === "search") {
        const msg = "Searching for " + text
        setStatusMessage(msg)
        speak(msg)
        router.push(`/marketplace?q=${encodeURIComponent(text)}`)
      } else {
        let msg = "Opening your " + intent.replace('_', ' ') + "."
        if (intent === 'home') msg = "Opening homepage."
        else if (intent === 'farmer_dashboard') msg = "Opening farmer dashboard."
        else if (intent === 'orders') msg = "Opening your orders."
        else if (intent === 'add_product') msg = "Opening add product."
        else if (intent === 'delivery_map') msg = "Opening delivery map."
        else if (intent === 'profile') msg = "Opening profile."
        else if (intent === 'marketplace') msg = "Opening marketplace."
        
        setStatusMessage(msg)
        speak(msg)
        
        router.push(INTENT_ROUTES[intent] ?? `/marketplace?q=${encodeURIComponent(text)}`)
      }
    } catch (e) {
      console.error(e)
      const msg = "Sorry, there was an error processing your request."
      setStatusMessage(msg)
      speak(msg)
    }
  }

  // Only show for farmers
  if (session?.user?.role !== "FARMER") {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {showUI && (
        <div className="mb-2 w-72 rounded-xl border border-[#6B8E23] bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            <h3 className="font-semibold text-sm">Voice Assistant</h3>
            <button 
              onClick={toggleVoice}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              {voiceOn ? (
                <><Volume2 className="h-3 w-3" /> Voice: ON</>
              ) : (
                <><VolumeX className="h-3 w-3" /> Voice: OFF</>
              )}
            </button>
          </div>
          
          <div className="space-y-2">
            {transcript && (
              <div className="rounded-md bg-muted p-2 text-sm italic text-muted-foreground">
                "{transcript}"
              </div>
            )}
            <div className="text-sm font-medium">
              {statusMessage}
            </div>
          </div>
          
          {!isListening && (
            <div className="mt-3 text-right">
              <button 
                onClick={() => setShowUI(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      <Button 
        onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
        size="icon" 
        className={`h-14 w-14 rounded-full shadow-lg transition-all ${
          isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#6B8E23] hover:bg-[#55701c]"
        }`}
      >
        {isListening ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </Button>
    </div>
  )
}
