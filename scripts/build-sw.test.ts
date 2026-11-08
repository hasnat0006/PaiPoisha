import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSw, toUrl } from "./build-sw.mjs";

describe("toUrl", () => {
  it("maps index.html files to their trailing-slash route", () => {
    expect(toUrl("index.html")).toBe("/");
    expect(toUrl(join("wallets", "index.html"))).toBe("/wallets/");
    expect(toUrl(join("_next", "static", "chunks", "a.js"))).toBe("/_next/static/chunks/a.js");
  });
});

describe("buildSw", () => {
  async function fakeOut() {
    const dir = await mkdtemp(join(tmpdir(), "out-"));
    await mkdir(join(dir, "wallets"));
    await writeFile(join(dir, "index.html"), "<html>home</html>");
    await writeFile(join(dir, "wallets", "index.html"), "<html>wallets</html>");
    await writeFile(join(dir, "app.js.map"), "{}");
    await writeFile(join(dir, "font.woff"), "old font");
    await writeFile(join(dir, "font.woff2"), "font");
    return dir;
  }
  const versionOf = (sw: string) => sw.match(/money-([0-9a-f]+)/)![1];

  it("pre-caches every page and asset, but not source maps, .woff fonts or itself", async () => {
    const dir = await fakeOut();
    await writeFile(join(dir, "sw.js"), "old");
    expect(await buildSw(dir)).toBe(3);
    const sw = await readFile(join(dir, "sw.js"), "utf8");
    expect(sw).toContain('const URLS = ["/font.woff2","/","/wallets/"];');
  });

  it("changes the cache version when any file changes", async () => {
    const dir = await fakeOut();
    await buildSw(dir);
    const v1 = versionOf(await readFile(join(dir, "sw.js"), "utf8"));
    await writeFile(join(dir, "wallets", "index.html"), "<html>wallets v2</html>");
    await buildSw(dir);
    expect(versionOf(await readFile(join(dir, "sw.js"), "utf8"))).not.toBe(v1);
  });
});
