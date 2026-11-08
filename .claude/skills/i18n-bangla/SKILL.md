---
name: i18n-bangla
description: Rules for every piece of visible text, number, amount and date in the money app — Bangla and English translations, Bangla digits, taka formatting with lakh grouping, and date formats. Use whenever adding or changing anything the user can read.
---

# Bangla / English text, numbers and dates

## How it works

- `src/i18n/provider.tsx` holds the language (`bn` default, or `en`) and the Bangla-digits setting. There are no `/bn` or `/en` URLs: the language switches on the client.
- Text: `const t = useTranslations("wallets"); t("addWallet")`
- Money: `const { formatMoney } = useMoney(); formatMoney(row.amount_paisa)`
- Language: `const { locale, setLocale, banglaDigits } = useLocale()`

## Adding text

1. Pick a key: `<screen-or-feature>.<camelCaseName>`, e.g. `budgets.overLimit`. Reuse `common.*` for Save, Cancel, Delete, Undo, Edit.
2. Add it to **both** `src/messages/bn.json` and `src/messages/en.json`, at the same place. The test `src/i18n/messages.test.ts` fails if the keys differ.
3. Values that change go in placeholders, never joined strings: `"left": "{amount} left"` / `"left": "{amount} বাকি"`, then `t("left", { amount: formatMoney(x) })`.
4. Counts use ICU plural form: `"{count, plural, one {# entry} other {# entries}}"`. Bangla doesn't change the word: `"{count}টি এন্ট্রি"`.

## Writing Bangla copy

- Use everyday spoken Bangla (চলিত ভাষা), not formal সাধু ভাষা.
- Keep familiar English words that people actually use: সেভ, এডিট, ব্যালেন্স, বাজেট, ওয়ালেট, বিকাশ, নগদ, রকেট, ক্যাশ.
- Use the polite আপনি form for the user.
- Keep it short: buttons are 1–2 words.
- If you're unsure of a Bangla phrase, write your best version and list it in your summary so the user can check it.

## Numbers and money

- Always `formatMoney` → `৳1,23,456` / `৳১,২৩,৪৫৬` (lakh grouping, our own code, the same on every browser).
- Never `toLocaleString`, `Intl.NumberFormat` or `toFixed` for money.
- Inputs accept both digit sets: `parseAmount("১৫০")` = 15000 paisa.
- Show amounts with `tabular-nums` so columns line up.
- Other numbers (counts, percentages): convert with `toBanglaDigits` when `banglaDigits` is on.

## Dates

- Use next-intl's `useFormatter().dateTime(date, {...})`. The time zone is fixed to `Asia/Dhaka` in the provider.
- Formats: list day headers "৭ নভেম্বর ২০২৬" / "7 Nov 2026"; month switcher "নভেম্বর ২০২৬" / "November 2026".
- Relative labels "Today" / "আজ" and "Yesterday" / "গতকাল" come from the message files.
- The weekend in Bangladesh is Friday–Saturday. Before building a date picker, ask the user which day the week should start on, then record the answer in `docs/decisions.md`.

## Never

- Hard-code visible text in a component (including `aria-label`, `placeholder` and `title`)
- Join translated pieces to build a sentence
- Assume English text length: Bangla is often longer, so let layouts wrap
- Use a font other than Hind Siliguri (already loaded in `layout.tsx`). The one exception: Bangla digits ০–৯ come from Noto Sans Bengali through the `Bangla Digits` @font-face in `globals.css` (Hind Siliguri's ১ looks like ৬)
