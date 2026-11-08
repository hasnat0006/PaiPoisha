// In-memory IndexedDB so Dexie works in tests.
import "fake-indexeddb/auto";

// jsdom has no matchMedia; sonner and next-themes need it.
window.matchMedia ??= (query: string) =>
  ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;

// No Next.js app router in unit tests: stub its hooks (the URL comes from jsdom's location).
import { vi } from "vitest";
vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: (url: string) => window.history.pushState({}, "", url), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// findBy*/waitFor: allow time for lazy chunks (the add sheet) when all test files run in parallel.
import { configure } from "@testing-library/react";
configure({ asyncUtilTimeout: 5000 });
