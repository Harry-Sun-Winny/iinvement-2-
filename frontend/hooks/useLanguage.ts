import { create } from "zustand";
import { persist } from "zustand/middleware";

type Language = "vi" | "en";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      language: "vi",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "language-storage",
    }
  )
);
