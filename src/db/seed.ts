/**
 * First-run defaults: one Cash wallet and the bilingual default categories
 * (plan: "Bangladesh-specific details", spec §4). Runs once per device.
 */
import { db } from "./db";
import { insertRow } from "./repo";
import type { Category, CategoryType, Wallet } from "./types";

type Def = [key: string, bn: string, en: string, icon: string, color: string, system?: true];

const EXPENSE: Def[] = [
  ["groceries", "বাজার", "Groceries", "shopping-basket", "#16a34a"],
  ["transport", "যাতায়াত", "Transport", "bus", "#0284c7"],
  ["mobile_recharge", "মোবাইল রিচার্জ", "Mobile recharge", "smartphone", "#7c3aed"],
  ["rent", "বাসা ভাড়া", "Rent", "house", "#b45309"],
  ["electricity", "বিদ্যুৎ", "Electricity", "zap", "#ca8a04"],
  ["gas", "গ্যাস", "Gas", "flame", "#ea580c"],
  ["internet", "ইন্টারনেট", "Internet", "wifi", "#0891b2"],
  ["eating_out", "খাবার", "Eating out", "utensils", "#dc2626"],
  ["education", "পড়াশোনা", "Education", "graduation-cap", "#4f46e5"],
  ["medical", "চিকিৎসা", "Medical", "stethoscope", "#db2777"],
  ["family", "পরিবারকে পাঠানো", "Sent to family", "hand-heart", "#e11d48"],
  ["other_expense", "অন্যান্য", "Other", "circle-ellipsis", "#64748b", true],
  ["fees", "ফি ও চার্জ", "Fees & charges", "receipt", "#78716c", true],
  // shortcut: one adjustment row typed "expense"; step 3 (Adjust balance) decides income-side handling.
  ["adjustment", "ব্যালেন্স সমন্বয়", "Balance adjustment", "scale", "#6b7280", true],
];

const INCOME: Def[] = [
  ["salary", "বেতন", "Salary", "banknote", "#16a34a"],
  ["tuition", "টিউশন", "Tuition", "book-open", "#0284c7"],
  ["freelance", "ফ্রিল্যান্স", "Freelance", "laptop", "#7c3aed"],
  ["other_income", "অন্যান্য", "Other", "circle-ellipsis", "#64748b", true],
];

const toCategory = (type: CategoryType) => ([key, name_bn, name_en, icon, color, system]: Def, i: number) => ({
  key,
  name_bn,
  name_en,
  type,
  icon,
  color,
  is_default: true,
  is_system: !!system,
  hidden: false,
  sort_order: i,
});

/** Create defaults if this device has never had any wallets or categories. Safe to call repeatedly. */
export async function ensureSeeded(cashName: string): Promise<void> {
  await db.transaction("rw", db.wallets, db.categories, async () => {
    // Count deleted rows too, so deleting everything never brings the defaults back.
    if ((await db.wallets.count()) === 0) {
      await insertRow<Wallet>("wallets", {
        name: cashName, // in the language in use on first run
        kind: "cash",
        provider: null,
        opening_balance_paisa: 0,
        color: "#16a34a",
        icon: "wallet",
        archived: false,
        sort_order: 0,
      });
    }
    if ((await db.categories.count()) === 0) {
      const rows = [...EXPENSE.map(toCategory("expense")), ...INCOME.map(toCategory("income"))];
      for (const r of rows) await insertRow<Category>("categories", r);
    }
  });
}
