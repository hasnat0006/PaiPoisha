// More tab: "Add to home screen" row that opens a step-by-step guide (user, 2026-11-15; replaced the Quick add sheet
// and the Install row): pick Android / iPhone (your phone is pre-selected), then one step per screen with Back / Next
// and progress dots. Hidden once the app runs from the home screen.
"use client";

import { Apple, ChevronRight, Download, EllipsisVertical, House, Share, Smartphone, SquarePlus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useInstall } from "@/features/pwa/usePwa";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";

type Platform = "android" | "iphone";
interface Step {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const PLATFORMS: Platform[] = ["android", "iphone"];
const ICONS: Record<Platform, LucideIcon> = { android: Smartphone, iphone: Apple };

export function HomeScreenGuide({ className }: { className: string }) {
  const t = useTranslations("homeScreen");
  const tc = useTranslations("common");
  const install = useInstall();
  const { banglaDigits } = useLocale();
  const digits = (n: number) => (banglaDigits ? toBanglaDigits(String(n)) : String(n));
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("android");
  const [step, setStep] = useState(-1); // -1: choose the phone

  if (install.state === "installed") return null; // already running from the home screen

  const start = () => {
    setPlatform(/iphone|ipad|ipod/i.test(navigator.userAgent) ? "iphone" : "android");
    setStep(-1);
    setOpen(true);
  };
  const text = (s: string) => <p className="text-sm text-muted-foreground">{s}</p>;

  const steps: Record<Platform, Step[]> = {
    android: [
      { icon: EllipsisVertical, title: t("a1Title"), body: text(t("a1Body")) },
      {
        icon: Download,
        title: t("a2Title"),
        body: (
          <>
            {text(t("a2Body"))}
            {install.state === "prompt" && (
              <Button className="min-h-11" onClick={() => void install.install()}>
                {t("installNow")}
              </Button>
            )}
          </>
        ),
      },
      { icon: House, title: t("a3Title"), body: text(t("a3Body")) },
    ],
    iphone: [
      { icon: Share, title: t("i1Title"), body: text(t("i1Body")) },
      { icon: SquarePlus, title: t("i2Title"), body: text(t("i2Body")) },
      { icon: House, title: t("i3Title"), body: text(t("i3Body")) },
    ],
  };
  const list = steps[platform];
  const current = step >= 0 ? list[step] : null;
  const last = step === list.length - 1;

  return (
    <li>
      <button type="button" className={className} onClick={start}>
        <SquarePlus className="size-5" aria-hidden />
        <span className="flex-1">{t("title")}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="flex-row items-center justify-between gap-3 text-left">
            <DrawerTitle className="text-lg">{current ? t(platform) : t("title")}</DrawerTitle>
            {current && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex gap-1.5" aria-hidden>
                  {list.map((_, i) => (
                    <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-brand" : i < step ? "w-2 bg-brand/50" : "w-2 bg-muted-foreground/30"}`} />
                  ))}
                </span>
                {t("stepOf", { n: digits(step + 1), total: digits(list.length) })}
              </span>
            )}
          </DrawerHeader>

          <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto px-4 pb-6">
            {current ? (
              <section key={`${platform}-${step}`} className="flex animate-in flex-col gap-3 fade-in slide-in-from-right-4 duration-200">
                <span className="flex size-12 items-center justify-center rounded-md bg-brand/15 text-brand">
                  <current.icon className="size-6" aria-hidden />
                </span>
                <h3 className="text-base font-semibold">{current.title}</h3>
                {current.body}
              </section>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("intro")}</p>
                <p className="text-base font-medium">{t("pick")}</p>
                <div className="flex flex-col gap-2" role="group" aria-label={t("pick")}>
                  {PLATFORMS.map((p) => {
                    const Icon = ICONS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={platform === p}
                        onClick={() => setPlatform(p)}
                        className="flex min-h-14 items-center gap-3 rounded-md border px-4 text-left text-base aria-pressed:border-brand aria-pressed:bg-brand/10"
                      >
                        <Icon className="size-5" aria-hidden />
                        <span className="flex-1">{t(p)}</span>
                        <span className={`size-4 rounded-full border-2 ${platform === p ? "border-brand bg-brand" : "border-muted-foreground/40"}`} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex gap-2">
              {current && (
                <Button variant="outline" className="min-h-11 flex-1" onClick={() => setStep(step - 1)}>
                  {tc("back")}
                </Button>
              )}
              <Button className="min-h-11 flex-1" onClick={() => (last ? setOpen(false) : setStep(step + 1))}>
                {last ? t("done") : t("next")}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </li>
  );
}
