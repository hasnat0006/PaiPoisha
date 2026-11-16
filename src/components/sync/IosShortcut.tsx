// iPhone Shortcut (step 8b): saves an expense without opening the app (migrations 0003, 0006).
// More → "iPhone Shortcut" opens a step-by-step guide (user, 2026-11-16): make your key, install, add an expense,
// the Back Tap tip, and how to change the key. Signed-in users only; hidden on Android (iPhone-only feature).
"use client";

import { ChevronRight, Download, Hand, KeyRound, ListChecks, RefreshCw, Zap, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { notify } from "@/components/common/notify";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";
import { syncConfigured, useSyncStatus } from "@/sync/status";

/** iCloud link of the ready-made Shortcut (user, 2026-11-16). */
export const SHORTCUT_URL = "https://www.icloud.com/shortcuts/00527559ea11479782f3f6f3909c96fb";

/** The iPhone path needs the server; a local-only build has none. */
export const iosShortcutAvailable = syncConfigured;

/** "Make my key" → the key, shown once, to copy. Signed out: a sign-in hint instead. */
export function ShortcutKey() {
  const t = useTranslations("shortcut");
  const { state } = useSyncStatus();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  if (state === "signed_out") return <p className="text-sm text-muted-foreground">{t("signIn")}</p>;

  const makeKey = async () => {
    if (!navigator.onLine) return void notify.error(t("keyError"));
    setBusy(true);
    try {
      setKey(await (await import("@/sync/shortcutKey")).newShortcutKey());
    } catch {
      notify.error(t("keyError"));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      notify.success(t("copied"));
    } catch {
      toast(t("copyManually"));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {key ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={key}
            aria-label={t("keyLabel")}
            onFocus={(e) => e.target.select()}
            className="min-h-11 min-w-0 flex-1 rounded-md border bg-muted px-2 font-mono text-xs text-foreground"
          />
          <Button variant="outline" className="min-h-11 shrink-0 px-4" onClick={copy}>
            {t("copy")}
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void makeKey()}>
          {t("makeKey")}
        </Button>
      )}
      <p className="text-sm text-muted-foreground">{t("keyNote")}</p>
    </div>
  );
}

type StepId = "key" | "install" | "run" | "backTap" | "changeKey";
const STEPS: { id: StepId; icon: LucideIcon }[] = [
  { id: "key", icon: KeyRound },
  { id: "install", icon: Download },
  { id: "run", icon: Zap },
  { id: "backTap", icon: Hand },
  { id: "changeKey", icon: RefreshCw },
];
/** iPhone screenshots per step, in public/shortcut/ (the user sends them). */
const SHOTS: Partial<Record<StepId, string[]>> = {};

/** More tab row + the guide sheet. Not on Android, and not in a build without the server. */
export function ShortcutGuide({ className }: { className: string }) {
  const t = useTranslations("shortcut");
  const th = useTranslations("homeScreen");
  const tc = useTranslations("common");
  const { banglaDigits } = useLocale();
  const digits = (n: number) => (banglaDigits ? toBanglaDigits(String(n)) : String(n));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  if (!iosShortcutAvailable() || (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent))) return null;

  const text = (s: string) => <p className="text-sm text-muted-foreground">{s}</p>;
  const extra: Partial<Record<StepId, ReactNode>> = {
    key: <ShortcutKey />,
    install: (
      <a href={SHORTCUT_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "min-h-11" })}>
        {t("install")}
      </a>
    ),
  };
  const { id, icon: Icon } = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <li>
      <button type="button" className={className} onClick={() => (setStep(0), setOpen(true))}>
        <ListChecks className="size-5" aria-hidden />
        <span className="flex-1">{t("title")}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="flex-row items-center justify-between gap-3 text-left">
            <DrawerTitle className="text-lg">{t("title")}</DrawerTitle>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1.5" aria-hidden>
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-brand" : i < step ? "w-2 bg-brand/50" : "w-2 bg-muted-foreground/30"}`} />
                ))}
              </span>
              {th("stepOf", { n: digits(step + 1), total: digits(STEPS.length) })}
            </span>
          </DrawerHeader>

          <div className="flex max-h-[75dvh] flex-col gap-4 overflow-y-auto px-4 pb-6">
            {step === 0 && text(t("intro"))}
            <section key={id} className="flex animate-in flex-col gap-3 fade-in slide-in-from-right-4 duration-200">
              <span className="flex size-12 items-center justify-center rounded-md bg-brand/15 text-brand">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-base font-semibold">{t(`${id}Title`)}</h3>
              {text(t(`${id}Body`))}
              {extra[id]}
              {SHOTS[id]?.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer
                <img key={src} src={src} alt={t(`${id}Title`)} loading="lazy" className="mx-auto max-h-[45dvh] w-auto rounded-md border" />
              ))}
            </section>

            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" className="min-h-11 flex-1" onClick={() => setStep(step - 1)}>
                  {tc("back")}
                </Button>
              )}
              <Button className="min-h-11 flex-1" onClick={() => (last ? setOpen(false) : setStep(step + 1))}>
                {last ? th("done") : th("next")}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </li>
  );
}
