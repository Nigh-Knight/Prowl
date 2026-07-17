import { DEFAULT_SCRAPE_OPTIONS, type ScrapeOverrides } from "./config.ts";

const FIRECRAWL_URL = process.env.FIRECRAWL_URL ?? "http://127.0.0.1:3002";

export async function scrape(url: string, overrides: ScrapeOverrides = {}) {
  const res = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      ...DEFAULT_SCRAPE_OPTIONS,
      ...overrides,
    }),
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
