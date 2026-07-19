import type { SearchPort, SearchResult } from "prowl-core";

const SEARXNG_URL = process.env.SEARXNG_URL ?? "http://127.0.0.1:8888";

export const searxngClient: SearchPort = {
  async search(query: string, engines?: string[]) {
    const params = new URLSearchParams({
      q: query,
      format: "json",
    });
    if (engines?.length) params.set("engines", engines.join(","));

    const res = await fetch(`${SEARXNG_URL}/search?${params}`);
    if (!res.ok) throw new Error(`SearXNG error: ${res.status}`);

    const data = (await res.json()) as {
      results: Array<{ title?: string; url?: string; content?: string; engine?: string }>;
    };

    return data.results.map((r) => ({
      title: r.title ?? "(no title)",
      url: r.url ?? "",
      snippet: r.content ?? "",
      engine: r.engine,
    }));
  },
};
