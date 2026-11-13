import { describe, expect, it, vi } from "vitest";

const { signOut, rpc } = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
  rpc: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { signOut }, rpc } }));

import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import type { Wallet } from "@/db/types";
import { DRAFT_KEY } from "@/features/entries/entryDraft";
import { WELCOME_KEY } from "@/lib/welcome";
import { deleteAccountAndWipe, signOutAndWipe } from "./auth";

describe("sign-out", () => {
  it("signs out, wipes the local database and returns to the start", async () => {
    await insertRow<Wallet>("wallets", { name: "Cash", kind: "cash", provider: null, opening_balance_paisa: 0, color: "#16a34a", icon: "wallet", archived: false, sort_order: 0 });
    localStorage.setItem(WELCOME_KEY, "skipped");
    localStorage.setItem(DRAFT_KEY, "{}");
    const go = vi.fn();

    await signOutAndWipe(go);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    await db.open();
    expect(await db.wallets.count()).toBe(0);
    expect(localStorage.getItem(WELCOME_KEY)).toBeNull(); // the next person sees the welcome page
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull(); // no unsaved amount or note left behind
    expect(go).toHaveBeenCalledWith("/");
  });
});

describe("delete account", () => {
  const addWallet = () => insertRow<Wallet>("wallets", { name: "Cash", kind: "cash", provider: null, opening_balance_paisa: 0, color: "#16a34a", icon: "wallet", archived: false, sort_order: 0 });

  it("deletes the account on the server, then wipes the phone", async () => {
    await addWallet();
    const go = vi.fn();
    await deleteAccountAndWipe(go);
    expect(rpc).toHaveBeenCalledWith("delete_my_account");
    await db.open();
    expect(await db.wallets.count()).toBe(0);
    expect(go).toHaveBeenCalledWith("/");
  });

  it("keeps everything on the phone if the server refuses", async () => {
    await db.open();
    await addWallet();
    rpc.mockResolvedValueOnce({ error: new Error("offline") });
    const go = vi.fn();
    await expect(deleteAccountAndWipe(go)).rejects.toThrow("offline");
    expect(await db.wallets.count()).toBe(1);
    expect(go).not.toHaveBeenCalled();
  });
});
