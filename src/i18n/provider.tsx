"use client";

/**
 * Client-side language switching (no /bn or /en URLs: static export has no
 * middleware). The chosen language is stored locally; once the settings table
 * is wired up it becomes the source of truth.
 *
 * Use in components:  const t = useTranslations("home");  t("income")
 * Money:              const { formatMoney } = useMoney();
 */
import { NextIntlClientProvider } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import { formatMoney as fmt, type FormatMoneyOptions, type Locale, type Paisa } from "@/lib/money";

const MESSAGES = { bn, en } as const;
const STORAGE_KEY = "mm.language";
/** A digits choice made by hand ("bn" | "en"); absent = follow the language. Cleared when the language changes. */
const DIGITS_KEY = "mm.digits";
export const DEFAULT_LOCALE: Locale = "bn";
export const TIME_ZONE = "Asia/Dhaka";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  banglaDigits: boolean;
  setBanglaDigits: (v: boolean) => void;
  /** False until the stored/phone language has been read (first render uses the default). */
  ready: boolean;
}

const Ctx = createContext<LocaleCtx | null>(null);

function readStored(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "bn" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

function readDigits(): boolean | null {
  try {
    const v = localStorage.getItem(DIGITS_KEY);
    return v === "bn" ? true : v === "en" ? false : null;
  } catch {
    return null;
  }
}

/** localStorage write; null removes. Private mode throws: the value then lives in memory only. */
function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* keep in memory only */
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [banglaDigits, setDigitsState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    const fromPhone = navigator.language?.startsWith("bn") ? "bn" : null;
    const initial = stored ?? fromPhone ?? DEFAULT_LOCALE;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after hydration
    setLocaleState(initial);
    setDigitsState(readDigits() ?? initial === "bn");
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setDigitsState(l === "bn"); // a new language resets digits to its default (decisions.md)
    store(STORAGE_KEY, l);
    store(DIGITS_KEY, null);
  }, []);

  const setBanglaDigits = useCallback((v: boolean) => {
    setDigitsState(v);
    store(DIGITS_KEY, v ? "bn" : "en");
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, banglaDigits, setBanglaDigits, ready }),
    [locale, setLocale, banglaDigits, setBanglaDigits, ready],
  );

  return (
    <Ctx.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    </Ctx.Provider>
  );
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used inside <I18nProvider>");
  return ctx;
}

/** Money formatting bound to the current language and digit setting. */
export function useMoney() {
  const { locale, banglaDigits } = useLocale();
  const formatMoney = useCallback(
    (paisa: Paisa, opts: FormatMoneyOptions = {}) => fmt(paisa, locale, { banglaDigits, ...opts }),
    [locale, banglaDigits],
  );
  return { formatMoney };
}
