// Core unit tests for the `search` composer (v0.1 vertical slice).
//
// Drives `search()` with mock ports and asserts:
//   1. primitive order PLAN → SCATTER → [EXTRACT] → SYNTHESIZE → PRESENT
//   2. output shape (summary + sources) and that PRESENT receives "Sources:"
//   3. zero-scrape default vs. bounded `--read` extraction (Phase 7)
// Plus pure-policy unit tests locking the bounded, diverse selection guarantees.

import { describe, it, expect } from "bun:test";
import {
  search,
  EXTRACTION_BUDGET,
  selectForExtraction,
  selectForSynthesis,
} from "prowl-core";
import type {
  ModelPort,
  PresenterPort,
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
    { title: "A", url: "https://a.example.com/post", snippet: "snippet a", engine: "google" },
    { title: "B", url: "https://b.example.com/thread", snippet: "snippet b", engine: "bing" },
    { title: "C", url: "https://c.example.org/log", snippet: "snippet c", engine: "google" },
    { title: "D", url: "https://d.example.net/entry", snippet: "snippet d", engine: "bing" },
    { title: "E", url: "https://e.example.com/note", snippet: "snippet e", engine: "marginalia" },
    { title: "F", url: "https://f.example.io/story", snippet: "snippet f", engine: "marginalia" },
  ];
}

// ── mock port factories (record order + args for assertions) ──────────────────

type CallPort = "model" | "search" | "scrape" | "presenter";
interface Call {
  port: CallPort;
  arg?: string;
}

function makeModel(
  calls: Call[],
  plannerReply = '["planned query"]',
): ModelPort {
  return {
    async generate(prompt: string): Promise<string> {
      calls.push({ port: "model", arg: prompt });
      // PLAN prompt contains "query planner"; SYNTHESIZE prompt contains
      // "metasearch synthesizer". The composer calls the model in both phases.
      if (prompt.includes("query planner")) return plannerReply;
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
    async present(content: string): Promise<void> {
      calls.push({ port: "presenter", arg: content });
    },
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
// used in two phases, distinguished by prompt content.
function phaseTags(calls: Call[]): string[] {
  return calls.map((c) => {
    if (c.port === "model") return c.arg?.includes("query planner") ? "PLAN" : "SYNTHESIZE";
    if (c.port === "search") return "SCATTER";
    if (c.port === "scrape") return "EXTRACT";
    return "PRESENT";
  });
}

// ── composer: default (snippets-only) ─────────────────────────────────────────

describe("search composer — default (snippets-only)", () => {
  it("runs PLAN → SCATTER → SYNTHESIZE → PRESENT in order", async () => {
    const calls: Call[] = [];
    await search(
      { query: "magnesium orotate", readMode: false },
      {
        search: makeSearch(calls, sampleResults()),
        model: makeModel(calls),
        present: makePresenter(calls),
      },
    );
    expect(phaseTags(calls)).toEqual(["PLAN", "SCATTER", "SYNTHESIZE", "PRESENT"]);
  });

  it("produces summary + sources output and renders a Sources: list", async () => {
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
    expect(presentCall?.arg).toContain("Sources:");
    for (const r of out.sources) {
      expect(presentCall?.arg).toContain(r.url);
    }
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
});

// ── composer: read (--read evidence) mode ─────────────────────────────────────

describe("search composer — read (--read evidence) mode", () => {
  it("runs PLAN → SCATTER → EXTRACT → SYNTHESIZE → PRESENT and extracts a bounded set", async () => {
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
    // Bounded: exactly min(budget, distinct results). 6 distinct hosts, budget 5 → 5.
    expect(scraped.length).toBe(Math.min(EXTRACTION_BUDGET, results.length));
    expect(scraped.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);

    expect(phaseTags(calls)).toEqual([
      "PLAN",
      "SCATTER",
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

  it("scrapes all results when fewer than the extraction budget", async () => {
    const calls: Call[] = [];
    const results = sampleResults().slice(0, 3);
    const contentByUrl: Record<string, string> = {};
    for (const r of results) contentByUrl[r.url] = `M(${r.url})`;

    await search(
      { query: "magnesium orotate", readMode: true },
      {
        search: makeSearch(calls, results),
        model: makeModel(calls),
        present: makePresenter(calls),
        scrape: makeScrape(calls, contentByUrl),
      },
    );

    const scraped = calls.filter((c) => c.port === "scrape");
    expect(scraped.length).toBe(3);
    expect(scraped.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);
  });

  it("keeps snippet-only results on scrape failure (resilient extraction)", async () => {
    const calls: Call[] = [];
    const results = sampleResults().slice(0, 2);
    // No fixture content → every scrape throws; composer must keep snippet-only.
    await search(
      { query: "magnesium orotate", readMode: true },
      {
        search: makeSearch(calls, results),
        model: makeModel(calls),
        present: makePresenter(calls),
        scrape: makeScrape(calls, {}),
      },
    );
    const scraped = calls.filter((c) => c.port === "scrape");
    expect(scraped.length).toBe(2); // still attempts the bounded set
    // SYNTHESIZE still runs after partial extraction failures.
    expect(calls.some((c) => c.port === "model" && c.arg?.includes("metasearch synthesizer"))).toBe(
      true,
    );
  });
});

// ── selection / ranking policy (Phase 7 bounds) ──────────────────────────────

describe("selectForExtraction policy", () => {
  it("returns at most the budget and at most one result per host", () => {
    const results: SearchResult[] = [];
    for (let i = 0; i < 8; i++) {
      results.push({
        title: `t${i}`,
        url: `https://host${i}.example.com/p`,
        snippet: "s",
        engine: i % 2 === 0 ? "google" : "bing",
      });
    }
    const sel = selectForExtraction(results, EXTRACTION_BUDGET);
    expect(sel.length).toBeLessThanOrEqual(EXTRACTION_BUDGET);
    const hosts = new Set(sel.map((r) => new URL(r.url).host));
    expect(hosts.size).toBe(sel.length); // one result per host
  });

  it("caps results per engine at two", () => {
    // 6 distinct hosts, all same engine → engine cap (≤2) bounds the set.
    const results: SearchResult[] = [];
    for (let i = 0; i < 6; i++) {
      results.push({
        title: `t${i}`,
        url: `https://h${i}.example.com/p`,
        snippet: "s",
        engine: "google",
      });
    }
    const sel = selectForExtraction(results, EXTRACTION_BUDGET);
    expect(sel.length).toBe(2);
  });
});

describe("selectForSynthesis policy", () => {
  it("caps at the limit and at most two results per host", () => {
    const results: SearchResult[] = [];
    for (let i = 0; i < 10; i++) {
      // 5 hosts, 2 results each.
      results.push({
        title: `t${i}`,
        url: `https://host${i % 5}.example.com/p${i}`,
        snippet: "s",
      });
    }
    const sel = selectForSynthesis(results, 8);
    expect(sel.length).toBeLessThanOrEqual(8);
    const counts = new Map<string, number>();
    for (const r of sel) {
      const h = new URL(r.url).host;
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    for (const c of counts.values()) expect(c).toBeLessThanOrEqual(2);
  });
});
