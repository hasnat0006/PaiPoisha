// Swipe left / right on a tab's page to move between tabs, Instagram-style (user, 2026-11-09): the page follows the
// finger, then slides away while the next tab slides in from the other side; a short drag springs back.
// Rules in lib/swipe.ts. Styles are set on the element directly: no React render per finger move.
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { neighbourTab, swipeTarget } from "@/lib/swipe";

const EDGE_PX = 24; // iPhone's own back/forward gesture starts at the screen edges: leave those to the phone
const LOCK_PX = 10; // movement before deciding: sideways swipe or vertical scroll
const OUT_MS = 180;
const IN_MS = 240;
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** Gestures starting here belong to the element: text fields, sliders, anything that scrolls sideways (wallet cards). */
function ownsSwipe(el: Element | null): boolean {
  if (el?.closest("input, textarea, select, [role=slider], [data-no-swipe]")) return true;
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setStyle(el: HTMLElement, transform: string, opacity: string, transition: string) {
  el.style.transition = transition;
  el.style.transform = transform;
  el.style.opacity = opacity;
}

/** Ref + touch handlers for the page area. Touch only: a mouse drag on desktop selects text, as it should. */
export function useSwipeTabs() {
  const router = useRouter();
  const path = usePathname() ?? "/";
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; t: number; lock?: "x" | "y" } | null>(null);
  const enterFrom = useRef<1 | -1 | null>(null); // the side the next page slides in from, set when leaving

  // The new tab's page has rendered: slide it in from the side the finger came from, then clear the styles,
  // since a leftover transform would break `position: fixed` inside the page.
  useEffect(() => {
    const el = ref.current;
    const from = enterFrom.current;
    enterFrom.current = null;
    if (!el || from === null) return;
    setStyle(el, `translateX(${from * 30}%)`, "0", "none");
    void el.offsetWidth; // apply the start position before animating from it
    setStyle(el, "", "", `transform ${IN_MS}ms ${EASE_OUT}, opacity ${IN_MS}ms ${EASE_OUT}`);
    const id = setTimeout(() => setStyle(el, "", "", ""), IN_MS);
    return () => clearTimeout(id);
  }, [path]);

  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    const edge = p.clientX < EDGE_PX || p.clientX > window.innerWidth - EDGE_PX;
    const onTab = neighbourTab(path, 1) !== null || neighbourTab(path, -1) !== null;
    const ok = onTab && e.touches.length === 1 && !edge && !ownsSwipe(e.target as Element);
    start.current = ok ? { x: p.clientX, y: p.clientY, t: e.timeStamp } : null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    const el = ref.current;
    if (!s || !el || reducedMotion()) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!s.lock && Math.max(Math.abs(dx), Math.abs(dy)) > LOCK_PX) s.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (s.lock !== "x") return;
    const open = neighbourTab(path, dx < 0 ? 1 : -1) !== null;
    const x = open ? dx : dx * 0.25; // no tab that way: feels stiff, like Instagram at the first and last tab
    setStyle(el, `translateX(${x}px)`, open ? String(1 - Math.min(Math.abs(dx) / window.innerWidth, 1) * 0.4) : "1", "none");
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const el = ref.current;
    start.current = null;
    const p = e.changedTouches[0];
    if (!s || !p || s.lock === "y") return;
    const dx = p.clientX - s.x;
    const to = swipeTarget(path, dx, p.clientY - s.y, e.timeStamp - s.t, window.innerWidth);
    if (!to) {
      if (el?.style.transform) setStyle(el, "", "", `transform 200ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`); // spring back
      return;
    }
    if (!el || reducedMotion()) return void router.push(to);
    const dir = dx < 0 ? -1 : 1;
    setStyle(el, `translateX(${dir * 100}%)`, "0", `transform ${OUT_MS}ms ease-in, opacity ${OUT_MS}ms ease-in`);
    enterFrom.current = dir === -1 ? 1 : -1; // leaving to the left, so the next page comes from the right
    setTimeout(() => router.push(to), OUT_MS);
  };

  const onTouchCancel = () => {
    start.current = null;
    if (ref.current?.style.transform) setStyle(ref.current, "", "", `transform 200ms ${EASE_OUT}`);
  };

  return { ref, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
