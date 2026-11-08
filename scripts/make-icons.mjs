// One-off: draws the official logo (H3 "Budget card": wallet stack + budget bar on green) into
// public/icons/ and src/app/favicon.ico. Run: node scripts/make-icons.mjs
// Uses the renderer bundled in Next (next/og) and Hind Siliguri, so no extra package is needed.
// Design source: the "টাকা Logo Ideas" canvas, H3. Shapes are in a 120-unit grid, scaled per icon.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createElement as h } from "react";

const require = createRequire(import.meta.url);
const { ImageResponse } = require("next/dist/compiled/@vercel/og/index.node.js");
const font = await readFile("node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-700-normal.woff");
const GREEN = "#0B7A57";

/** `k` shrinks the artwork toward the centre (maskable icons need a bigger safe zone). */
async function render(size, { rounded, k = 1 }) {
  const s = size / 120;
  const box = (x, y, w, hgt, style) =>
    h("div", {
      style: {
        position: "absolute", display: "flex",
        left: (60 + (x - 60) * k) * s, top: (60 + (y - 60) * k) * s, width: w * k * s, height: hgt * k * s,
        ...style,
      },
    });
  const card = (y, bg, deg) => box(24, y, 72, 48, { background: bg, borderRadius: 10 * k * s, transform: `rotate(${deg}deg)` });
  const pill = (x, y, w, hgt, bg) => box(x, y, w, hgt, { background: bg, borderRadius: (hgt / 2) * k * s });
  const taka = h(
    "div",
    {
      style: {
        position: "absolute", display: "flex", justifyContent: "center", alignItems: "center",
        left: (60 + (29 - 60) * k) * s, top: (60 + (54 - 60) * k) * s, width: 28 * k * s, height: 28 * k * s,
        color: GREEN, fontFamily: "Hind Siliguri", fontSize: 26 * k * s, lineHeight: 1,
      },
    },
    "৳",
  );
  const el = h(
    "div",
    { style: { width: "100%", height: "100%", display: "flex", position: "relative", background: GREEN, borderRadius: rounded ? 27 * s : 0 } },
    card(36, "rgba(255,255,255,0.3)", -16),
    card(40, "rgba(255,255,255,0.55)", -7),
    card(46, "#ffffff", 0),
    taka,
    pill(62, 57, 22, 5, "rgba(11,122,87,0.4)"),
    pill(62, 67, 14, 5, "rgba(11,122,87,0.25)"),
    pill(32, 82, 26, 6, GREEN),
    pill(59, 82, 14, 6, "#F59F00"),
    pill(74, 82, 9, 6, "#3B5BDB"),
    pill(84, 82, 5, 6, "#F42A41"),
  );
  const res = new ImageResponse(el, { width: size, height: size, fonts: [{ name: "Hind Siliguri", data: font, weight: 700 }] });
  return Buffer.from(await res.arrayBuffer());
}

async function icon(file, size, opts) {
  await writeFile(`public/icons/${file}`, await render(size, opts));
  console.log("wrote", file);
}

await icon("icon-192.png", 192, { rounded: true });
await icon("icon-512.png", 512, { rounded: true });
await icon("maskable-512.png", 512, { rounded: false, k: 0.78 }); // full-bleed; Android crops it to a shape
await icon("apple-touch-icon.png", 180, { rounded: false }); // iOS rounds the corners itself

// favicon.ico = a 6-byte ICO header + one 16-byte entry pointing at an embedded 32×32 PNG.
const png = await render(32, { rounded: true });
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2); // type: icon
head.writeUInt16LE(1, 4); // one image
head.writeUInt8(32, 6); // width
head.writeUInt8(32, 7); // height
head.writeUInt16LE(1, 10); // colour planes
head.writeUInt16LE(32, 12); // bits per pixel
head.writeUInt32LE(png.length, 14);
head.writeUInt32LE(22, 18); // PNG starts right after the header
await writeFile("src/app/favicon.ico", Buffer.concat([head, png]));
console.log("wrote favicon.ico");
