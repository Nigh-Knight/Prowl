# Prowl — Deployment (SearXNG + Firecrawl)

> **Scope (ops, not build):** deployment / configuration manual for standing up the self-hosted search + extraction stack. `prowl-core` / `prowl-pi` do **not** need any of this to know how to issue queries — that behavioral spec lives in [[PRD-0.1]] §13.5 (query format) and §13.7 (negative-search). You run this setup yourself; the agent only consumes the running endpoints.

## 13.3 SearXNG Configuration

Deployed via Docker Compose (searxng/searxng-docker). For AI agent use:

- Enable JSON API: `search.formats: [html, json]`
- Disable rate limiter: `server.limiter: false`
- Block AI slop via hostnames plugin: `remove: [chatgpt.com, perplexity.ai]`
- Boost authoritative sources: `high_priority: [wikipedia.org, github.com, arxiv.org]`

```yaml
use_default_settings:
  engines:
    keep_only:
      - google
      - bing
      - yandex
      - duckduckgo
      - marginalia
      - wiby
      - searchmysite
      - brave
      - mojeek
      - qwant
      - startpage
      - sogou
      - 360search
      - erowid
      - pubmed
      - google scholar
      - reddit
      - github

search:
  safe_search: 0
  formats:
    - html
    - json

server:
  limiter: false

plugins:
  - name: hostnames
    remove:
      - chatgpt.com
      - perplexity.ai
    high_priority:
      - wikipedia.org
      - github.com
      - arxiv.org
```

## 13.4 Firecrawl Configuration

Self-hosted via Docker (AGPL-3.0, free). Provides `/v1/scrape` and `/v1/batch_scrape` endpoints. Uses Chromium for JS rendering — essential for modern chan archives and React/Vue-based forums.

**Request format:** Always pass `formats: ["markdown"]` to get clean markdown output. These defaults are defined in `src/config.ts` and applied by `src/firecrawl-client.ts`:

```json
POST /v1/scrape
{
  "url": "https://example.com",
  "formats": ["markdown"],
  "onlyMainContent": true,
  "removeBase64Images": true,
  "blockAds": true,
  "timeout": 20000
}
```

Returns:
```json
{
  "success": true,
  "data": {
    "markdown": "# Page title\n\nFull markdown content...",
    "metadata": { ... }
  }
}
```

You can also request multiple formats: `["markdown", "html"]` if raw HTML is needed alongside.

**Default config (`src/config.ts`):**

```typescript
export const DEFAULT_SCRAPE_OPTIONS = {
  formats: ["markdown"],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
  timeout: 20_000,
};
```

**Usage (`src/firecrawl-client.ts`):**

```typescript
import { scrape } from "./src/firecrawl-client.ts";

const content = await scrape("https://example.com");
// content is always markdown

// Override per-call if needed:
const slow = await scrape("https://slow-site.com", { timeout: 60_000 });
```

**Polite scraping:** Self-hosted Firecrawl has no rate limiter by default. Add a small delay between scrapes to avoid IP bans from niche litter-web sites.

**Fallback:** If Firecrawl's Chromium is too heavy or a site blocks it, `pi-searxng-suite` (trafilatura) extracts without a browser. Having both = resilience.
