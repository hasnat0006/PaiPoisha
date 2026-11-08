// Whether the phone has a connection (for "Needs internet" on the Google button).
import { useSyncExternalStore } from "react";

function subscribe(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}

export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
