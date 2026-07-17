# Prowl
Prowl is an archaic search engine for searching and synthesizing information from the litter web

## Current scope
**v0.1.0** is a local, Pi-first vertical slice: it runs `/prowl search` against a self-hosted SearXNG + Firecrawl stack on your machine and synthesizes results with a single Qwen model. There is no web UI, no public deployment, and no multi-user service.

Explicitly deferred past v0.1.0: `/prowl query` and `/prowl chat`, persistent
`StoragePort`/`CatalogPort` implementations, negative-search/exclusion, multilingual dork-planner expansion, RAG/wiki/deep-dive/loops, web and CLI adapters, browser-interaction automation, and public deployment. The engine stays split as `prowl-core` (hexagonal kernel) + `prowl-pi` (Pi extension adapter).

See `docs/planning/prowl-versions.md` for the version plan and `docs/planning/v0.1-implementation-roadmap.md` for the current roadmap.
