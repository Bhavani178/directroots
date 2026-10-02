"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { kannadaDictionary } from "./kannada-dictionary"

type Language = "en" | "kn"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("farmer_lang")
    if (stored === "kn" || stored === "en") {
      setLanguageState(stored)
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("farmer_lang", lang)
  }

  const t = (key: string): string => {
    if (language === "kn" && kannadaDictionary[key]) {
      return kannadaDictionary[key]
    }
    return key
  }

  // Prevent hydration mismatch by not returning translations until mounted
  // However, returning children directly with a default language ensures the layout doesn't break,
  // we just might see a flash of English on first load before the client hydration corrects it,
  // which is standard for localstorage-based themes/languages.
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "en", setLanguage, t: (k) => k }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
