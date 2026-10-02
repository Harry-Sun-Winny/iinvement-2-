"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import vi from "@/locales/vi.json";
import en from "@/locales/en.json";

const dictionaries = { vi, en };

type TranslationKeys = string;

type I18nContextType = {
  t: (key: TranslationKeys, variables?: Record<string, string | number>) => string;
  language: "vi" | "en";
  setLanguage: (lang: "vi" | "en") => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (key: string, variables?: Record<string, string | number>): string => {
    if (!mounted) return ""; // Wait until client hydration is done to match language state
    const keys = key.split(".");
    let value: any = dictionaries[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (variables) {
      let str = value;
      Object.entries(variables).forEach(([k, val]) => {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(val));
      });
      return str;
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
