/** Default options for every Firecrawl scrape request. */
export const DEFAULT_SCRAPE_OPTIONS = {
  formats: ["markdown"],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
  timeout: 60_000,
} as const;

export type ScrapeOverrides = Partial<typeof DEFAULT_SCRAPE_OPTIONS>;

/**
 * Hard timeout for the Firecrawl HTTP fetch itself (separate from the
 * scrape timeout which Firecrawl applies internally). Prevents a hung
 * Firecrawl from stalling the search pipeline indefinitely (Issue 4).
 */
export const SCRAPE_FETCH_TIMEOUT_MS = 90_000;
