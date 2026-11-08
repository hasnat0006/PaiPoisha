/**
 * PWA plumbing (roadmap step 6): registers the offline service worker, asks for persistent
 * storage once installed, and exposes the install prompt (Android) or iOS instructions.
 */
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Call once, from the app shell. */
export function useServiceWorker() {
  useEffect(() => {
    // The dev server changes files constantly; a cached copy would hide edits.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline caching is a bonus; the app still works online */
    });
    // Ask only when installed: Chrome then grants it silently, and Firefox would otherwise show a popup on load.
    if (isStandalone()) navigator.storage?.persist?.().catch(() => {});
  }, []);
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
