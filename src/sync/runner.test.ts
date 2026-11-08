import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/db";
import { fakeRemote } from "./fakeRemote";
import { createRunner, RETRY_MS } from "./runner";
import { getStatus, setStatus } from "./status";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setStatus({ state: "signed_out", known: false, email: null, pending: 0, lastSyncedAt: null });
});
afterEach(() => vi.useRealTimers());

/** Let pending promises (fake-indexeddb, the runner) settle without moving the fake clock. */
const flush = async () => {
  for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(0);
};

describe("sync runner", () => {
  it("retries after 5 s, 30 s and 2 min, and shows Error only after the third failure", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { remote } = fakeRemote();
    const pull = vi.spyOn(remote, "pullPage").mockRejectedValue(new Error("down")); // one failing call per try
    const r = createRunner(remote);
    await r.run();
    await flush();
    expect(pull).toHaveBeenCalledTimes(1);
    expect(getStatus().state).not.toBe("error");

    await vi.advanceTimersByTimeAsync(RETRY_MS[0]);
    await flush();
    expect(pull).toHaveBeenCalledTimes(2);
    expect(getStatus().state).not.toBe("error");

    await vi.advanceTimersByTimeAsync(RETRY_MS[1]);
    await flush();
    expect(pull).toHaveBeenCalledTimes(3);
    expect(getStatus().state).toBe("error");

    pull.mockRestore(); // the server is back
    await vi.advanceTimersByTimeAsync(RETRY_MS[2]);
    await flush();
    expect(getStatus()).toMatchObject({ state: "up_to_date", email: "a@example.com" });
  });

  it("runs one sync at a time and queues a single follow-up", async () => {
    const { remote } = fakeRemote();
    const user = vi.spyOn(remote, "user");
    const r = createRunner(remote);
    await Promise.all([r.run(), r.run(), r.run(), r.run()]);
    expect(user).toHaveBeenCalledTimes(2);
  });

  it("reports signed out when there is no session", async () => {
    const r = createRunner(fakeRemote(null).remote);
    await r.run();
    expect(getStatus()).toMatchObject({ state: "signed_out", known: true });
  });
});
