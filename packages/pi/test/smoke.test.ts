// prowl-pi live smoke tests — exercise the real adapters against the Docker
// stack (SearXNG :8888, Firecrawl :3002) and the configured model endpoint.
//
// These hit live services, so they double as an end-to-end acceptance check
// for the v0.1 vertical slice. The model smoke test is gated on
// PROWL_MODEL_API_KEY so the suite stays green without credentials set; set
// the PROWL_MODEL_* vars in .env (see docs/planning/v0.1-demo.md) to enable it.

import { describe, it, expect } from "bun:test";
import { searxngClient } from "../src/searxng-client.ts";
import { scrapePort } from "../src/firecrawl-client.ts";

// NOTE: modelClient is NOT imported at top level. model-client.ts constructs
// the OpenAI client at module scope, which throws when PROWL_MODEL_API_KEY is
// empty. We import it lazily inside the gated test so the suite loads cleanly
// without credentials configured.

const SEARCH_QUERY = "magnesium orotate personal experiences";

describe("prowl-pi adapter smoke tests (live Docker stack)", () => {
  it("searxngClient.search returns at least one result", async () => {
    const results = await searxngClient.search(SEARCH_QUERY);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const first = results[0]!;
    expect(typeof first.url).toBe("string");
    expect(first.url.length).toBeGreaterThan(0);
    expect(typeof first.title).toBe("string");
  });

  it("scrapePort.scrape returns non-empty markdown for a selected URL", async () => {
    const results = await searxngClient.search("magnesium orotate");
    expect(results.length).toBeGreaterThanOrEqual(1);
    const url = results[0]!.url;
    expect(url.length).toBeGreaterThan(0);

    const markdown = await scrapePort.scrape(url);
    expect(typeof markdown).toBe("string");
    expect(markdown.length).toBeGreaterThan(0);
  });

  it("model path runs inside pi with its active model (manual)", () => {
    // Prowl no longer owns a model client/endpoint: it calls pi's active model
    // through @earendil-works/pi-ai/compat. That requires a live pi session, so
    // it can't be asserted here. Verified manually via `/prowl search` in pi
    // with a model selected (e.g. Qwen 3.6-plus). We assert the structural
    // adapter factory exists instead of invoking a network call.
    const mod = require("../src/model-client.ts");
    expect(typeof mod.modelPortFromContext).toBe("function");
  });

  it("debug writer creates valid ndjson file", async () => {
    const { createDebugSink } = await import("../src/debug-writer.ts");
    const { existsSync, readFileSync, unlinkSync } = await import("node:fs");
    const { homedir } = await import("node:os");
    const { join } = await import("node:path");

    const DEBUG_PATH = join(homedir(), ".prowl", "debug-last.jsonl");

    // Clean up before test
    try { unlinkSync(DEBUG_PATH); } catch { /* ok */ }

    const sink = createDebugSink();
    sink.write({ stage: "plan", detail: "test event", counts: { queries: 1 } });
    sink.write({ stage: "present", detail: "done" });
    sink.close();

    expect(existsSync(DEBUG_PATH)).toBe(true);
    const content = readFileSync(DEBUG_PATH, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(2);

    const first = JSON.parse(lines[0]!);
    expect(first.stage).toBe("plan");
    expect(first.detail).toBe("test event");
    expect(first.timestamp).toBeDefined();

    const second = JSON.parse(lines[1]!);
    expect(second.stage).toBe("present");

    // Clean up
    try { unlinkSync(DEBUG_PATH); } catch { /* ok */ }
  });
});
