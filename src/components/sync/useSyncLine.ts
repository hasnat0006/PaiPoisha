// The one-line sync status of spec §10 ("Synced 2 minutes ago", "Syncing…", …) in the user's language.
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useLocale } from "@/i18n/provider";
import { useSyncStatus } from "@/sync/status";

export function useSyncLine(): string {
  const t = useTranslations("sync");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { banglaDigits } = useLocale();
  const s = useSyncStatus();
  switch (s.state) {
    case "syncing":
      return t("syncing");
    case "offline_pending":
      return t("offline", { count: s.pending });
    case "error":
      return t("error");
    case "signed_out":
      return t("signedOut");
    default: {
      if (!s.lastSyncedAt) return t("synced");
      const at = Date.parse(s.lastSyncedAt);
      // `now` ticks once a minute, so it can lag a sync that just finished: never say "in 20 seconds".
      const time = format.relativeTime(at, { now: Math.max(now.getTime(), at), numberingSystem: banglaDigits ? "beng" : "latn" });
      return t("syncedAgo", { time });
    }
  }
}
