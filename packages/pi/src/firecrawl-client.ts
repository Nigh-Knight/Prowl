import type { ScrapePort } from "prowl-core";
import {
  DEFAULT_SCRAPE_OPTIONS,
  SCRAPE_FETCH_TIMEOUT_MS,
  type ScrapeOverrides,
} from "./config.ts";

const FIRECRAWL_URL = process.env.FIRECRAWL_URL ?? "http://127.0.0.1:3002";

// ── URL trust-boundary validation (S1) ──────────────────────────────────────

/**
 * Refuse to scrape URLs that are invalid or target private/internal hosts,
 * preventing SSRF via the Firecrawl service (S1).
 */
function assertSafeScrapeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Refusing to scrape invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Refusing to scrape non-http(s) URL: ${url}`);
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error(`Refusing to scrape internal/private host: ${url}`);
  }
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  // loopback / localhost
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "::") return true;
  if (h === "0.0.0.0") return true;
  // IPv4 private ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 private ranges (link-local, unique-local)
  if (h.includes(":")) {
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  }
  return false;
}

// ── Scrape function ─────────────────────────────────────────────────────────

export async function scrape(url: string, overrides: ScrapeOverrides = {}) {
  assertSafeScrapeUrl(url);

  const res = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      ...DEFAULT_SCRAPE_OPTIONS,
      ...overrides,
    }),
    signal: AbortSignal.timeout(SCRAPE_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Firecrawl error: ${res.status}`);

  const data = (await res.json()) as {
    success?: boolean;
    error?: string;
    data: { markdown: string };
  };
  if (!data.success) throw new Error(data.error ?? "Unknown Firecrawl error");

  return data.data.markdown;
}

/** ScrapePort adapter object — `scrape` satisfies the core port structurally. */
export const scrapePort: ScrapePort = { scrape };
