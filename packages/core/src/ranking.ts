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
 * eTLD+1: handles a known set of multi-part suffixes; falls back to the last two
 * labels. IPv4 literals and `localhost` pass through.
 */
// Known multi-part TLDs (eTLD+1 suffixes). Expanded from 13 to ~45 entries to
// cover Korean, Chinese, Indian, Taiwanese, Indonesian, and other non-English
// search result diversity (Issue 6).
const MULTI_PART_TLDS = new Set([
  // UK/Ireland
  "co.uk", "org.uk", "ac.uk", "gov.uk", "ltd.uk", "me.uk", "net.uk", "plc.uk", "sch.uk",
  // Australia
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au", "id.au",
  // New Zealand
  "co.nz", "net.nz", "org.nz", "ac.nz", "govt.nz",
  // Japan
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp", "ed.jp", "gr.jp",
  // South Korea
  "co.kr", "or.kr", "ne.kr", "go.kr", "ac.kr", "re.kr", "pe.kr",
  // Brazil
  "com.br", "org.br", "net.br", "gov.br", "edu.br", "mil.br", "art.br",
  // South Africa
  "co.za", "org.za", "net.za", "ac.za", "gov.za", "web.za",
  // Mexico
  "com.mx", "org.mx", "net.mx", "edu.mx", "gob.mx",
  // China
  "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn", "ac.cn",
  // India
  "co.in", "net.in", "org.in", "ac.in", "gov.in", "firm.in", "gen.in", "ind.in",
  // Taiwan
  "com.tw", "org.tw", "edu.tw", "gov.tw", "net.tw", "mil.tw",
  // Indonesia
  "co.id", "or.id", "ac.id", "go.id", "net.id", "web.id", "sch.id",
  // Hong Kong
  "com.hk", "edu.hk", "gov.hk", "net.hk", "org.hk",
  // Singapore
  "com.sg", "edu.sg", "gov.sg", "net.sg", "org.sg",
  // Latin America
  "com.ar", "net.ar", "org.ar", "edu.ar", "gov.ar",
  "com.co", "net.co", "org.co", "edu.co", "gov.co",
  "com.pe", "net.pe", "org.pe", "edu.pe", "gob.pe",
  // Israel
  "co.il", "org.il", "net.il", "ac.il", "gov.il",
  // Turkey
  "com.tr", "org.tr", "net.tr", "edu.tr", "gov.tr", "gen.tr",
  // Russia
  "com.ru", "org.ru", "net.ru", "edu.ru", "gov.ru", "ac.ru",
  // Vietnam
  "com.vn", "net.vn", "org.vn", "edu.vn", "gov.vn",
  // Philippines
  "com.ph", "net.ph", "org.ph", "gov.ph", "edu.ph",
  // Thailand
  "co.th", "or.th", "ac.th", "go.th", "net.th", "in.th",
  // Malaysia
  "com.my", "net.my", "org.my", "edu.my", "gov.my",
  // Pakistan
  "com.pk", "net.pk", "org.pk", "edu.pk", "gov.pk",
  // Bangladesh
  "com.bd", "net.bd", "org.bd", "edu.bd", "gov.bd",
  // Nigeria
  "com.ng", "org.ng", "net.ng", "edu.ng", "gov.ng",
  // Saudi Arabia
  "com.sa", "net.sa", "org.sa", "edu.sa", "gov.sa",
  // UAE
  "co.ae", "net.ae", "org.ae", "ac.ae", "gov.ae",
  // Egypt
  "com.eg", "org.eg", "net.eg", "edu.eg", "gov.eg",
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

/** Heuristic signal score for a single result (higher = more likely useful).
 *
 * Quality floor: results with negligible snippet/title/content score below
 * MIN_SIGNAL_SCORE (2) return 0, ensuring empty or near-empty results don't
 * occupy synthesis slots or the diversity cap. This gates nonsense queries
 * like `xyzzy_nonexistent_thing_12345` (Issue 5) — engines return sparse
 * token-matching results that fail the quality floor.
 */
const MIN_SIGNAL_SCORE = 2;

export function scoreResult(r: SearchResult): number {
  let score = 0;
  // Require meaningful snippet length (>= 20 chars) to score snippet points
  if (r.snippet && r.snippet.length >= 20) score += 2;
  if (r.title && r.title.length > 0) score += 1;
  // Extracted evidence (read mode) should outrank snippet-only results so the
  // SYNTHESIZE context favors full content when available.
  if (r.content && r.content.trim().length > 0) score += 1;
  const engine = (r.engine ?? "").toLowerCase();
  if (LITTER_ENGINES.has(engine)) score += 1;
  // Quality floor: negligible snippet/title/content → zero score.
  if (score < MIN_SIGNAL_SCORE) return 0;
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
