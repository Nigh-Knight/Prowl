// ranking.ts — snippet-level selection / dedup policy for the search pipeline.
//
// Pure, I/O-free: operates only on core data types. Owns the ranking and
// dedup policy (Perplexity dependency rule — orchestration/policy lives in
// core, never in adapters).

import type { SearchResult } from "./ports.ts";

/** Normalize a URL for dedup comparison (drop scheme, fragment, query, trailing slash). */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "");
    return (u.host + path).toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

/**
 * Root (registrable) domain of a URL, used for diversity capping so that
 * `forum.example.com` and `example.com` count as one brand (Issue 3). Heuristic
 * eTLD+1: handles a small known set of multi-part suffixes (co.uk, com.au, …);
 * falls back to the last two labels. IPv4 literals and `localhost` pass through.
 */
const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au", "edu.au",
  "co.nz", "co.jp", "com.br", "co.za", "com.mx",
]);

export function rootDomain(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
    const labels = host.split(".");
    if (labels.length <= 2) return host;
    const lastTwo = labels.slice(-2).join(".");
    if (MULTI_PART_TLDS.has(lastTwo)) return labels.slice(-3).join(".");
    return lastTwo;
  } catch {
    return url.toLowerCase();
  }
}

/** Normalize whitespace in title / url / snippet / engine fields. */
export function normalizeResults(results: SearchResult[]): SearchResult[] {
  return results.map((r) => ({
    ...r,
    title: (r.title ?? "").trim(),
    url: (r.url ?? "").trim(),
    snippet: (r.snippet ?? "").trim(),
    engine: r.engine ? r.engine.trim() : r.engine,
  }));
}

/** Deduplicate results by normalized URL, keeping the first occurrence. (GATHER) */
export function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = normalizeUrl(r.url);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

// Engines that skew toward the litter web (PRD §2): favored in ranking.
export const LITTER_ENGINES = new Set([
  "marginalia",
  "wiby",
  "mojeek",
  "searchmysite",
  "yacy",
]);

/** Heuristic signal score for a single result (higher = more likely useful). */
function scoreResult(r: SearchResult): number {
  let score = 0;
  if (r.snippet && r.snippet.length > 0) score += 2;
  if (r.title && r.title.length > 0) score += 1;
  // Extracted evidence (read mode) should outrank snippet-only results so the
  // SYNTHESIZE context favors full content when available.
  if (r.content && r.content.trim().length > 0) score += 1;
  const engine = (r.engine ?? "").toLowerCase();
  if (LITTER_ENGINES.has(engine)) score += 1;
  return score;
}

/**
 * Rank results by heuristic signal, deduplicated first. Stable ordering:
 * higher score wins; ties preserve input order. Used to order GATHER output
 * and to bound the SYNTHESIZE context.
 */
export function rankResults(results: SearchResult[]): SearchResult[] {
  const deduped = dedupeResults(results);
  const indexed = deduped.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const diff = scoreResult(b.r) - scoreResult(a.r);
    if (diff !== 0) return diff > 0 ? 1 : -1;
    return a.i - b.i; // stable tie-break by original position
  });
  return indexed.map((x) => x.r);
}

/**
 * Select a bounded, deduplicated, ranked subset for the SYNTHESIZE context.
 * Caps the number of snippets fed to the model (v0.1 default 8) while
 * maximizing root-domain diversity (at most 2 results per root domain).
 */
export function selectForSynthesis(
  results: SearchResult[],
  limit = 8,
): SearchResult[] {
  const ranked = rankResults(results);
  const perRoot = new Map<string, number>();
  const out: SearchResult[] = [];
  for (const r of ranked) {
    if (out.length >= limit) break;
    const root = rootDomain(r.url);
    const seen = perRoot.get(root) ?? 0;
    if (seen >= 2) continue; // cap per root domain for diversity (Issue 3)
    perRoot.set(root, seen + 1);
    out.push(r);
  }
  return out;
}
