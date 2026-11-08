import { describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn(async () => ({ error: null })) }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { signOut } } }));

import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import type { Wallet } from "@/db/types";
import { WELCOME_KEY } from "@/lib/welcome";
import { signOutAndWipe } from "./auth";

describe("sign-out", () => {
  it("signs out, wipes the local database and returns to the start", async () => {
    await insertRow<Wallet>("wallets", { name: "Cash", kind: "cash", provider: null, opening_balance_paisa: 0, color: "#16a34a", icon: "wallet", archived: false, sort_order: 0 });
    localStorage.setItem(WELCOME_KEY, "skipped");
    const go = vi.fn();

    await signOutAndWipe(go);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    await db.open();
    expect(await db.wallets.count()).toBe(0);
    expect(localStorage.getItem(WELCOME_KEY)).toBeNull(); // the next person sees the welcome page
    expect(go).toHaveBeenCalledWith("/");
  });
});
