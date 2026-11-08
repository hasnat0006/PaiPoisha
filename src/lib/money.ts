/**
 * Money helpers. ALL amounts in the app are integers in paisa (৳1 = 100 paisa).
 * Never store or add money as floating-point taka. Convert only at the edges:
 * parse user input -> paisa, paisa -> formatted string for display.
 */

export type Paisa = number; // always an integer

export type Locale = "bn" | "en";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export const MAX_AMOUNT_PAISA: Paisa = 99_99_99_999_00; // ৳99,99,99,999

/** Replace Bangla digits (০-৯) with ASCII digits. Other characters are kept. */
export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Replace ASCII digits with Bangla digits. */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Taka (may have up to 2 decimals) -> integer paisa, rounding half away from zero. */
export function takaToPaisa(taka: number): Paisa {
  const sign = taka < 0 ? -1 : 1;
  // toPrecision(12) removes binary noise (1.005 * 100 = 100.49999999999999) before rounding.
  return sign * Math.round(Number((Math.abs(taka) * 100).toPrecision(12)));
}

export function paisaToTaka(paisa: Paisa): number {
  return paisa / 100;
}

/**
 * Parse what the user typed on the amount pad into paisa.
 * Accepts Bangla or ASCII digits, commas, one decimal point per number,
 * and simple sums like "120+80-50". Returns null if invalid.
 */
export function parseAmount(raw: string): Paisa | null {
  const s = toAsciiDigits(raw).replace(/[,\s৳]/g, "");
  if (!/^\d+(\.\d{0,2})?([+-]\d+(\.\d{0,2})?)*$/.test(s)) return null;
  const terms = s.match(/[+-]?\d+(\.\d{0,2})?/g) ?? [];
  let total = 0;
  for (const t of terms) total += takaToPaisa(Number(t));
  return total;
}

/** True if a paisa amount is allowed for a transaction (more than 0, within the max). */
export function isValidAmount(paisa: Paisa | null): paisa is Paisa {
  return paisa !== null && Number.isInteger(paisa) && paisa > 0 && paisa <= MAX_AMOUNT_PAISA;
}

/** Group digits the South Asian way: 1,00,00,000 (last 3, then pairs). */
function groupLakh(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export interface FormatMoneyOptions {
  /** Show Bangla digits (০-৯). Defaults to true for "bn", false for "en". */
  banglaDigits?: boolean;
  /** Show the ৳ sign. Default true. */
  symbol?: boolean;
  /** "auto" hides .00 for whole taka (default); "always" always shows 2 decimals. */
  decimals?: "auto" | "always";
  /** Prefix + for positive amounts (e.g. income). Default false. */
  signed?: boolean;
}

/**
 * Format paisa for display, e.g. 12345600 -> "৳1,23,456" or "৳১,২৩,৪৫৬".
 * We do our own grouping instead of Intl so output is identical on every browser.
 */
export function formatMoney(paisa: Paisa, locale: Locale, opts: FormatMoneyOptions = {}): string {
  const { banglaDigits = locale === "bn", symbol = true, decimals = "auto", signed = false } = opts;
  const negative = paisa < 0;
  const abs = Math.abs(Math.trunc(paisa));
  const intPart = Math.floor(abs / 100).toString();
  const frac = (abs % 100).toString().padStart(2, "0");
  let out = groupLakh(intPart);
  if (decimals === "always" || frac !== "00") out += `.${frac}`;
  if (banglaDigits) out = toBanglaDigits(out);
  if (symbol) out = `৳${out}`;
  if (negative) out = `−${out}`; // proper minus sign
  else if (signed && paisa > 0) out = `+${out}`;
  return out;
}

/** Like parseAmount, but allows a leading minus (− or -) for a negative balance, e.g. a credit card. */
export function parseSignedAmount(raw: string): Paisa | null {
  const s = raw.trim();
  const negative = /^[−-]/.test(s);
  const p = parseAmount(negative ? s.slice(1) : s);
  return p === null ? null : negative ? -p : p;
}
