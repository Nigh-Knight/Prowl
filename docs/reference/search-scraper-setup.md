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

**Polite scraping:** Self-hosted Firecrawl has no rate limiter by default. Add a small delay between scrapes to avoid IP bans from niche litter-web sites.

**Fallback:** If Firecrawl's Chromium is too heavy or a site blocks it, `pi-searxng-suite` (trafilatura) extracts without a browser. Having both = resilience.
