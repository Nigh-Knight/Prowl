/** Default options for every Firecrawl scrape request. */
export const DEFAULT_SCRAPE_OPTIONS = {
  formats: ["markdown"],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
  timeout: 20_000,
} as const;

export type ScrapeOverrides = Partial<typeof DEFAULT_SCRAPE_OPTIONS>;
