// Core unit tests for the `search` composer (v0.1 vertical slice + issue fixes).
//
// Drives `search()` with mock ports and asserts:
//   1. primitive order PLAN → SCATTER → GATHER → RERANK → [EXTRACT] → SYNTHESIZE → PRESENT
//   2. output shape (summary + sources) and that PRESENT receives structured PresenterResult
//   3. zero-scrape default vs. bounded `--read` extraction
//   4. RERANK bounded model call + parse fallbacks (Issue 4)
//   5. empty-result guard (Issue 10)
//   6. --read drops failed URLs (Issue 9)
//   7. parseQueryPlan cap 5 (Q4)
//   8. rootDomain grouping (Issue 3)
// Plus pure-policy unit tests locking the bounded, diverse selection guarantees.

import { describe, it, expect } from "bun:test";
import {
  search,
  EXTRACTION_BUDGET,
  selectForExtraction,
  selectForSynthesis,
  parseQueryPlan,
  rootDomain,
  rerank,
} from "prowl-core";
import type {
  ModelPort,
  PresenterPort,
  PresenterResult,
  ScrapePort,
  SearchPort,
  SearchResult,
} from "prowl-core";

// ── fixtures ────────────────────────────────────────────────────────────────

// Distinct hosts, assorted engines; each carries a snippet + title so the
// heuristic ranking is deterministic (all score 3, stable by index order).
// No `content` field — this is the default snippets-only path.
function sampleResults(): SearchResult[] {
  return [
    { title: "A", url: "https://a-beta.com/post", snippet: "snippet a", engine: "google" },
    { title: "B", url: "https://b-gamma.org/thread", snippet: "snippet b", engine: "bing" },
    { title: "C", url: "https://c-delta.org/log", snippet: "snippet c", engine: "google" },
    { title: "D", url: "https://d-epsilon.net/entry", snippet: "snippet d", engine: "bing" },
    { title: "E", url: "https://e-zeta.net/note", snippet: "snippet e", engine: "marginalia" },
    { title: "F", url: "https://f-eta.io/story", snippet: "snippet f", engine: "marginalia" },
  ];
}

// ── mock port factories (record order + args for assertions) ──────────────────

type CallPort = "model" | "search" | "scrape" | "presenter";
interface Call {
  port: CallPort;
  arg?: string;
  /** PresenterResult stored by makePresenter on present() calls. */
  result?: PresenterResult;
}

function makeModel(
  calls: Call[],
  plannerReply = '["planned query"]',
): ModelPort {
  return {
    async generate(prompt: string): Promise<string> {
      calls.push({ port: "model", arg: prompt });
      // PLAN prompt contains "query planner"; RERANK prompt contains
      // "relevance filter"; SYNTHESIZE prompt contains "metasearch synthesizer".
      if (prompt.includes("query planner")) return plannerReply;
      if (prompt.includes("relevance filter")) return ''; // empty → keep all (resilient fallback)
      return "SYNTHESIZED SUMMARY for the litter web. [1] first source";
    },
  };
}

function makeSearch(calls: Call[], results: SearchResult[]): SearchPort {
  return {
    async search(query: string): Promise<SearchResult[]> {
      calls.push({ port: "search", arg: query });
      return results;
    },
  };
}

function makePresenter(calls: Call[]): PresenterPort {
  return {
    async present(result: PresenterResult): Promise<void> {
      calls.push({ port: "presenter", arg: result.summary, result });
    },
    async progress(_message: string): Promise<void> { /* no-op */ },
  };
}

function makeScrape(calls: Call[], contentByUrl: Record<string, string>): ScrapePort {
  return {
    async scrape(url: string): Promise<string> {
      calls.push({ port: "scrape", arg: url });
      const c = contentByUrl[url];
      if (!c) throw new Error(`no fixture content for ${url}`);
      return c;
    },
  };
}

// Derive the conceptual pipeline phase for each recorded call. The model is
// used in three phases, distinguished by prompt content.
function phaseTags(calls: Call[]): string[] {
  return calls.map((c) => {
    if (c.port === "model") {
      if (c.arg?.includes("query planner")) return "PLAN";
      if (c.arg?.includes("relevance filter")) return "RERANK";
      return "SYNTHESIZE";
    }
    if (c.port === "search") return "SCATTER";
    if (c.port === "scrape") return "EXTRACT";
    return "PRESENT";
  });
}

// ── composer: default (snippets-only) ─────────────────────────────────────────

describe("search composer — default (snippets-only)", () => {
  it("runs PLAN → SCATTER → RERANK → SYNTHESIZE → PRESENT in order (GATHER is a pure function with no port calls)", async () => {
    const calls: Call[] = [];
    await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(phaseTags(calls)).toEqual(["PLAN", "SCATTER", "RERANK", "SYNTHESIZE", "PRESENT"]);
  });

  it("produces summary + sources output and renders structured PresenterResult", async () => {
    const calls: Call[] = [];
    const out = await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(typeof out.summary).toBe("string");
    expect(out.summary).toContain("SYNTHESIZED SUMMARY");
    expect(Array.isArray(out.sources)).toBe(true);
    expect(out.sources.length).toBeGreaterThan(0);

    const presentCall = calls.find((c) => c.port === "presenter");
    const result = presentCall?.result as PresenterResult;
    expect(result.summary).toContain("SYNTHESIZED SUMMARY");
    // result.sources is the `shown` subset (may differ from all sources)
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeLessThanOrEqual(out.sources.length);
  });

  it("performs ZERO scrape calls by default", async () => {
    const calls: Call[] = [];
    const out = await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(calls.some((c) => c.port === "scrape")).toBe(false);
    // No result carries extracted content on the default path.
    expect(out.sources.every((s) => !s.content || s.content.length === 0)).toBe(true);
  });

  it("still performs no scrape when a scrape port is supplied but readMode is false", async () => {
    const calls: Call[] = [];
    await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
        scrape: makeScrape(calls, {}),
      },
    );
    expect(calls.some((c) => c.port === "scrape")).toBe(false);
  });

  it("scatters the PLAN-reformed query set to the search port", async () => {
    const calls: Call[] = [];
    await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls, '["reformed litter-web query"]'),
        present: makePresenter(calls),
      },
    );
    expect(calls.find((c) => c.port === "search")?.arg).toBe("reformed litter-web query");
  });

  it("skips EXTRACT when readMode is true but no scrape port is supplied (I2)", async () => {
    const calls: Call[] = [];
    const out = await search(
      { query: "magnesium orotate", readMode: true },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(calls.some((c) => c.port === "scrape")).toBe(false);
    expect(out.summary).toContain("SYNTHESIZED SUMMARY");
    expect(out.sources.length).toBeGreaterThan(0);
  });
});

// ── composer: read (--read evidence) mode ─────────────────────────────────────

describe("search composer — read (--read evidence) mode", () => {
  it("runs PLAN → SCATTER → RERANK → EXTRACT → SYNTHESIZE → PRESENT", async () => {
    const calls: Call[] = [];
    const results = sampleResults();
    const contentByUrl: Record<string, string> = {};
    for (const r of results) contentByUrl[r.url] = `MARKDOWN(${r.url})`;

    const out = await search(
      { query: "magnesium orotate", readMode: true },
      {
        search: makeSearch(calls, results),
        model: makeModel(calls),
        present: makePresenter(calls),
        scrape: makeScrape(calls, contentByUrl),
      },
    );

    const scraped = calls.filter((c) => c.port === "scrape");
    // Bounded: exactly min(budget, distinct roots). 6 distinct roots, budget 5 → 5.
    expect(scraped.length).toBe(Math.min(EXTRACTION_BUDGET, results.length));
    expect(scraped.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);

    expect(phaseTags(calls)).toEqual([
      "PLAN",
      "SCATTER",
      "RERANK",
      ...scraped.map(() => "EXTRACT"),
      "SYNTHESIZE",
      "PRESENT",
    ]);

    // The synthesizer receives the scraped markdown for the selected URLs.
    const synth = calls.find(
      (c) => c.port === "model" && c.arg?.includes("metasearch synthesizer"),
    );
    expect(synth?.arg).toContain("MARKDOWN(");

    // Extracted content flows into the bounded selected subset only.
    const withContent = out.sources.filter((s) => s.content && s.content.length > 0);
    expect(withContent.length).toBe(scraped.length);
    expect(withContent.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);
  });

  it("drops failed URLs from final sources in --read mode (Issue 9)", async () => {
    const calls: Call[] = [];
    const results = sampleResults().slice(0, 3);
    const firstUrl = results[0]?.url ?? "https://fallback.example.com";
    // Only first URL has content; others fail
    const contentByUrl: Record<string, string> = { [firstUrl]: "MARKDOWN(first)" };

    const out = await search(
      { query: "magnesium orotate", readMode: true },
      {
        search: makeSearch(calls, results),
        model: makeModel(calls),
        present: makePresenter(calls),
        scrape: makeScrape(calls, contentByUrl),
      },
    );

    // Final sources should only include successfully-read URLs
    expect(out.sources.every((s) => s.readStatus === "read" || !s.readStatus)).toBe(true);
    const presentCall = calls.find((c) => c.port === "presenter");
    expect(presentCall).toBeDefined();
    const result = presentCall!.result as PresenterResult;
    expect(result.sources.every((s) => s.url === firstUrl || s.readStatus !== "failed")).toBe(true);
  });
});

// ── empty-result guard (Issue 10) ─────────────────────────────────────────────

describe("search composer — empty-result guard", () => {
  it("presents 'No sources found.' with no model call when gathered empty", async () => {
    const calls: Call[] = [];
    const out = await search(
      { query: "obscure topic", readMode: false },
      {
        search: makeSearch(calls, []),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(out.summary).toBe("No sources found.");
    expect(out.sources.length).toBe(0);
    const presentCall = calls.find((c) => c.port === "presenter");
    expect(presentCall).toBeDefined();
    const result = presentCall!.result as PresenterResult;
    expect(result.summary).toBe("No sources found.");
    expect(result.sources.length).toBe(0);
    // SYNTHESIZE should NOT be called (no model call after RERANK)
    const synthCalls = calls.filter(
      (c) => c.port === "model" && c.arg?.includes("metasearch synthesizer"),
    );
    expect(synthCalls.length).toBe(0);
  });
});

// ── parseQueryPlan (Q4: cap 12) ───────────────────────────────────────────────

describe("parseQueryPlan", () => {
  it("caps at 12 (was 5)", () => {
    const lots = JSON.stringify(Array.from({ length: 15 }, (_, i) => `q${i}`));
    expect(parseQueryPlan(lots, "fallback").length).toBe(12);
  });

  it("returns [fallback] for empty input", () => {
    expect(parseQueryPlan("", "fallback")).toEqual(["fallback"]);
  });

  it("parses line/comma-separated list", () => {
    expect(parseQueryPlan("a, b\nc", "fallback")).toEqual(["a", "b", "c"]);
  });

  it("strips surrounding brackets and quotes", () => {
    expect(parseQueryPlan('["hello", "world"]', "fb")).toEqual(["hello", "world"]);
  });
});

// ── rootDomain (Issue 3) ─────────────────────────────────────────────────────

describe("rootDomain", () => {
  it("groups forum.x.com + x.com as same root", () => {
    expect(rootDomain("https://forum.frutigeraeroarchive.com/thread")).toBe("frutigeraeroarchive.com");
    expect(rootDomain("https://frutigeraeroarchive.com/page")).toBe("frutigeraeroarchive.com");
  });

  it("keeps thefrutigeraohub.com distinct from frutigeraeroarchive.com", () => {
    expect(rootDomain("https://thefrutigeraohub.com")).toBe("thefrutigeraohub.com");
    expect(rootDomain("https://frutigeraeroarchive.com")).toBe("frutigeraeroarchive.com");
  });

  it("handles multi-part TLDs like co.uk", () => {
    expect(rootDomain("https://blog.example.co.uk/foo")).toBe("example.co.uk");
  });

  it("passes through IPv4 and localhost unchanged", () => {
    expect(rootDomain("http://127.0.0.1:8080/path")).toBe("127.0.0.1");
    expect(rootDomain("http://localhost:3000")).toBe("localhost");
  });
});

// ── rerank (Issue 4) ──────────────────────────────────────────────────────────

describe("rerank", () => {
  it("makes one bounded model call", async () => {
    const calls: Call[] = [];
    const results = sampleResults();
    await rerank("query", results, makeModel(calls));
    const rerankCalls = calls.filter(
      (c) => c.port === "model" && c.arg?.includes("relevance filter"),
    );
    expect(rerankCalls.length).toBe(1);
  });

  it("explicit [] drops all (model rejected everything)", async () => {
    const model: ModelPort = { async generate() { return "[]"; } };
    const result = await rerank("query", sampleResults(), model);
    expect(result.kept.length).toBe(0);
    expect(result.dropped.length).toBe(sampleResults().length);
  });

  it("malformed response keeps all (resilient)", async () => {
    const model: ModelPort = { async generate() { return "not json"; } };
    const result = await rerank("query", sampleResults(), model);
    expect(result.kept.length).toBe(sampleResults().length);
  });

  it("empty input returns empty kept/dropped", async () => {
    const model: ModelPort = { async generate() { return "[]"; } };
    const result = await rerank("query", [], model);
    expect(result.kept.length).toBe(0);
    expect(result.dropped.length).toBe(0);
  });
});

// ── selection / ranking policy ────────────────────────────────────────────────

describe("selectForExtraction policy", () => {
  it("returns at most the budget and at most one result per root domain", () => {
    const results: SearchResult[] = [];
    for (let i = 0; i < 8; i++) {
      results.push({
        title: `t${i}`,
        url: `https://site${i}.com/p`,
        snippet: "s",
        engine: i % 2 === 0 ? "google" : "bing",
      });
    }
    const sel = selectForExtraction(results, EXTRACTION_BUDGET);
    expect(sel.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);
    const roots = new Set(sel.map((r) => rootDomain(r.url)));
    expect(roots.size).toBe(sel.length); // one result per root domain
  });

  it("caps results per engine at two", () => {
    // 6 distinct root domains, all same engine → engine cap (≤2) bounds the set.
    const results: SearchResult[] = [];
    for (let i = 0; i < 6; i++) {
      results.push({
        title: `t${i}`,
        url: `https://site${i}.com/p`,
        snippet: "s",
        engine: "google",
      });
    }
    const sel = selectForExtraction(results, EXTRACTION_BUDGET);
    expect(sel.length).toBe(2);
  });
});

describe("selectForSynthesis policy", () => {
  it("caps at the limit and at most two results per root domain", () => {
    const results: SearchResult[] = [];
    for (let i = 0; i < 10; i++) {
      // 5 distinct root domains, 2 results each.
      results.push({
        title: `t${i}`,
        url: `https://site${i % 5}.com/p${i}`,
        snippet: "s",
      });
    }
    const sel = selectForSynthesis(results, 8);
    expect(sel.length).toBeLessThanOrEqual(8);
    const counts = new Map<string, number>();
    for (const r of sel) {
      const root = rootDomain(r.url);
      counts.set(root, (counts.get(root) ?? 0) + 1);
    }
    for (const c of counts.values()) expect(c).toBeLessThanOrEqual(2);
  });
});
