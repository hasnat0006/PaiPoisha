/** Settings writes. There is one settings row; it's created the first time something is changed. */
import { db } from "@/db/db";
import { insertRow, updateRow } from "@/db/repo";
import type { Language, Settings } from "@/db/types";

type Editable = Partial<Pick<Settings, "bangla_digits" | "theme" | "month_start_day">>;

/**
 * shortcut: language, digits and theme are read from localStorage (i18n provider, next-themes);
 * this row only records them for sync (step 7), which will make it the source of truth.
 */
export async function saveSettings(patch: Editable, language: Language): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const [row] = (await db.settings.toArray()).filter((s) => !s.deleted_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (row) return updateRow<Settings>("settings", row.id, { ...patch, language });
    await insertRow<Settings>("settings", { language, bangla_digits: language === "bn", theme: "system", month_start_day: 1, ...patch });
  });
}

export async function setMonthStartDay(day: number, language: Language): Promise<void> {
  if (!Number.isInteger(day) || day < 1 || day > 28) throw new Error("invalid-start-day");
  await saveSettings({ month_start_day: day }, language);
}
