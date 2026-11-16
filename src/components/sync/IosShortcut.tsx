// iPhone Shortcut (step 8b): saves an expense without opening the app (migrations 0003, 0006).
// More → "iPhone Shortcut" opens a step-by-step guide (user, 2026-11-16): make your key, install, paste the key,
// add an expense, the Back Tap tip, and changing the key, with the user's marked-up iPhone screenshots.
// /shortcut/ shows every step on one page. Signed-in users only; hidden on Android (iPhone-only feature).
"use client";

import { ChevronRight, ClipboardPaste, Download, Hand, KeyRound, ListChecks, RefreshCw, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
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

type StepId = "key" | "install" | "paste" | "run" | "backTap" | "changeKey";
/** Each step's sub-steps (messages `<id>1`, `<id>2`, …) and the marked-up screenshot for each, in public/shortcut/. */
const STEPS: { id: StepId; icon: LucideIcon; shots: (string | null)[] }[] = [
  { id: "key", icon: KeyRound, shots: ["key-make", "key-copy"] },
  { id: "install", icon: Download, shots: ["install"] },
  { id: "paste", icon: ClipboardPaste, shots: ["list", "edit", "text", "pasted"] },
  { id: "run", icon: Zap, shots: ["run", null] },
  { id: "backTap", icon: Hand, shots: ["backtap-search", "backtap-double", "backtap-pick"] },
  { id: "changeKey", icon: RefreshCw, shots: [null, null] },
];
export const SHORTCUT_STEP_COUNT = STEPS.length;

/**
 * One step: numbered sub-steps, each with its screenshot. `live` (the More sheet) shows the real key buttons
 * instead of pictures of them; the full-guide page shows the pictures.
 */
export function ShortcutStep({ index, live }: { index: number; live: boolean }) {
  const t = useTranslations("shortcut");
  const { banglaDigits } = useLocale();
  const digits = (n: number) => (banglaDigits ? toBanglaDigits(String(n)) : String(n));
  const { id, icon: Icon, shots } = STEPS[index];
  const action: Partial<Record<StepId, ReactNode>> = {
    key: live ? <ShortcutKey /> : null,
    install: (
      <a href={SHORTCUT_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "min-h-11" })}>
        {t("install")}
      </a>
    ),
  };
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand">
          <Icon className="size-6" aria-hidden />
        </span>
        <h3 className="text-base font-semibold">
          {digits(index + 1)}. {t(`${id}Title`)}
        </h3>
      </div>
      <ol className="flex flex-col gap-4">
        {shots.map((shot, i) => (
          <li key={i} className="flex flex-col gap-3">
            <p className="flex gap-2 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                {digits(i + 1)}
              </span>
              <span>{t(`${id}${i + 1}`)}</span>
            </p>
            {i === 0 && action[id]}
            {shot && !(live && id === "key") && (
              // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer
              <img src={`/shortcut/${shot}.webp`} alt={t(`${id}${i + 1}`)} width={600} height={1304} loading="lazy" className="mx-auto h-auto max-h-[60dvh] w-auto max-w-full rounded-xl border" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** More tab row + the guide sheet, one step per screen. Not on Android, and not in a build without the server. */
export function ShortcutGuide({ className }: { className: string }) {
  const t = useTranslations("shortcut");
  const th = useTranslations("homeScreen");
  const tc = useTranslations("common");
  const { banglaDigits } = useLocale();
  const digits = (n: number) => (banglaDigits ? toBanglaDigits(String(n)) : String(n));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  if (!iosShortcutAvailable() || (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent))) return null;
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

          <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto px-4 pb-6">
            {step === 0 && (
              <>
                <p className="text-sm text-muted-foreground">{t("intro")}</p>
                <Link href="/shortcut/" className="text-sm font-medium text-brand underline underline-offset-4" onClick={() => setOpen(false)}>
                  {t("fullGuide")}
                </Link>
              </>
            )}
            <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
              <ShortcutStep index={step} live />
            </div>

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
