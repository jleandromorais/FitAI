"use client";

import { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from "react";
import { translations, type Locale, type TranslationDict } from "@/lib/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationDict;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "pt-BR",
  setLocale: () => {},
  t: translations["pt-BR"],
});

// useState(() => lazy read do localStorage) parecia certo, mas quebra a
// hidratação de verdade: o servidor nunca vê localStorage (SSR sempre
// "pt-BR"), então se o visitante já tinha "en" salvo, o 1º render do
// cliente já nasce diferente do HTML que o servidor mandou — React descarta
// a árvore e recomeça, gerando o erro #418 em praticamente todo texto
// traduzido da página. useSyncExternalStore existe exatamente pra isto:
// casa com getServerSnapshot() na hidratação, depois sincroniza pro valor
// real do cliente num passo imediato, sem esse descompasso.
const listeners = new Set<() => void>();

function getSnapshot(): Locale {
  return localStorage.getItem("locale") === "en" ? "en" : "pt-BR";
}
function getServerSnapshot(): Locale {
  return "pt-BR";
}
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
function emitChange() {
  listeners.forEach(l => l());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem("locale", l);
    emitChange();
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
