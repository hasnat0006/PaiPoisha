/**
 * PWA plumbing (roadmap step 6): registers the offline service worker, asks for persistent
 * storage once installed, and exposes the install prompt (Android) or iOS instructions.
 */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { notify } from "@/components/common/notify";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Call once, from the app shell. */
export function useServiceWorker() {
  const t = useTranslations("common");
  useEffect(() => {
    // The dev server changes files constantly; a cached copy would hide edits.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    // A new version is only offered when an old one is already running the page (not on a first visit).
    const offer = (worker: ServiceWorker) =>
      notify.info(t("updateReady"), {
        id: "update",
        duration: Infinity,
        action: { label: t("updateNow"), onClick: () => worker.postMessage("skip-waiting") },
      });
    let reloading = false;
    const onChange = () => {
      if (reloading || !sw.controller) return;
      reloading = true;
      location.reload();
    };
    sw.addEventListener("controllerchange", onChange);
    let reg: ServiceWorkerRegistration | undefined;
    const onVisible = () => document.visibilityState === "visible" && reg?.update().catch(() => {});
    document.addEventListener("visibilitychange", onVisible); // an installed app can stay open for days
    sw.register("/sw.js").then(
      (r) => {
        reg = r;
        if (r.waiting && sw.controller) offer(r.waiting);
        r.addEventListener("updatefound", () => {
          const w = r.installing;
          w?.addEventListener("statechange", () => w.state === "installed" && sw.controller && offer(w));
        });
      },
      () => {
        /* offline caching is a bonus; the app still works online */
      },
    );
    // Ask only when installed: Chrome then grants it silently, and Firefox would otherwise show a popup on load.
    if (isStandalone()) navigator.storage?.persist?.().catch(() => {});
    return () => {
      sw.removeEventListener("controllerchange", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [t]);
}

export type InstallState = "installed" | "prompt" | "ios" | "unavailable";

export function useInstall(): { state: InstallState; install: () => Promise<void> } {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("unavailable");

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only state after hydration
    setState(isStandalone() ? "installed" : ios ? "ios" : "unavailable");
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's own banner away; we show a row on the More tab instead
      setEvent(e as InstallPromptEvent);
      setState("prompt");
    };
    const onInstalled = () => setState("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    if ((await event.userChoice).outcome === "accepted") setState("installed");
    setEvent(null);
  };
  return { state, install };
}
