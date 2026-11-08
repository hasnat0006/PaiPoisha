/**
 * Wallet balances, calculated from entries (never stored). See the money-rules skill:
 * opening + income − expense − (transfer out + fee) + transfer in. Balances are all-time.
 */
import type { Transaction, Wallet } from "@/db/types";
import type { Paisa } from "./money";

type Tx = Pick<Transaction, "type" | "amount_paisa" | "fee_paisa" | "wallet_id" | "to_wallet_id" | "deleted_at">;

/** Balance per wallet id. Deleted entries are ignored; entries for unknown wallets are skipped. */
export function walletBalances(wallets: Pick<Wallet, "id" | "opening_balance_paisa">[], txs: Tx[]): Map<string, Paisa> {
  const bal = new Map(wallets.map((w) => [w.id, w.opening_balance_paisa]));
  const add = (id: string | null, p: Paisa) => {
    if (id !== null && bal.has(id)) bal.set(id, bal.get(id)! + p);
  };
  for (const t of txs) {
    if (t.deleted_at) continue;
    if (t.type === "income") add(t.wallet_id, t.amount_paisa);
    else if (t.type === "expense") add(t.wallet_id, -t.amount_paisa);
    else {
      add(t.wallet_id, -(t.amount_paisa + t.fee_paisa));
      add(t.to_wallet_id, t.amount_paisa); // the fee is not received
    }
  }
  return bal;
}

/** Sum of balances of the given (usually active) wallets. */
export function totalBalance(wallets: Pick<Wallet, "id">[], balances: Map<string, Paisa>): Paisa {
  return wallets.reduce((s, w) => s + (balances.get(w.id) ?? 0), 0);
}

/** The entry that makes the app's balance match the real one, or null if they already match. */
export function adjustmentFor(appBalance: Paisa, realBalance: Paisa): { type: "income" | "expense"; amount_paisa: Paisa } | null {
  const diff = realBalance - appBalance;
  if (diff === 0) return null;
  return { type: diff > 0 ? "income" : "expense", amount_paisa: Math.abs(diff) };
}
