// selection.ts — bounded, diverse selection of results for EXTRACT (read mode).
//
// Pure, I/O-free core policy. Given GATHERed results + a budget k, picks a
// small set of high-value, diverse URLs to scrape. Firecrawl is expensive and
// must stay bounded (PRD: never scrape every result), so this is the gate that
// keeps `--read` to a 3–5 URL evidence set. Diversity is enforced across host
// (domain) and engine so the extracted evidence is not a single site or a
// single engine's echo.

import type { SearchResult } from "./ports.ts";
import { normalizeUrl, rankResults } from "./ranking.ts";

/** Host (domain) of a URL, used for diversity capping. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Select a bounded, diverse subset of results to scrape in read (`--read`) mode.
 *
 * @param results  GATHERed (normalized, deduped, ranked) results.
 * @param budget   Max URLs to scrape (default 5; plan allows 3–5). Exactly
 *                 `min(budget, results.length)` are returned when diversity
 *                 permits.
 *
 * Diversity policy: at most one result per host, at most two per engine.
 * Selection order follows the existing ranking score (favoring litter engines
 * and non-empty snippets), so the highest-signal, most diverse set wins.
 */
export function selectForExtraction(
  results: SearchResult[],
  budget = 5,
): SearchResult[] {
  const ranked = rankResults(results);
  const perHost = new Map<string, number>();
  const perEngine = new Map<string, number>();
  const out: SearchResult[] = [];

  for (const r of ranked) {
    if (out.length >= budget) break;
    const host = hostOf(r.url);
    if (perHost.get(host)) continue; // one result per host
    const engine = (r.engine ?? "").toLowerCase();
    if (engine && (perEngine.get(engine) ?? 0) >= 2) continue; // ≤2 per engine
    perHost.set(host, 1);
    if (engine) perEngine.set(engine, (perEngine.get(engine) ?? 0) + 1);
    out.push(r);
  }

  return out;
}
