# Prowl — Roadmap (Future Versions)

> **Scope (future):** everything *after* v0.1.0. v0.1.0 is a narrow vertical slice
> `/prowl search` command only (snippets + `--read` evidence mode), local, Pi-first, single-user.
> The commands, modes, and infrastructure described below (`query`, `chat`, deep-dive, wiki,
> loops, sharing, public deployment, persistent storage, negative-search, multilingual dork
> expansion, browser interaction) are **explicitly deferred** past v0.1.0 and are tracked here
> as future work.
>
> The v0.1.0 build is in [[PRD-0.1]] + `v0.1-implementation-roadmap.md`; the v0.1.0 demo/acceptance
> is in `v0.1-demo.md`; vision / non-technical content is in [[litter-web]]; deployment config is in
> [[search-scraper-setup]].

## Table of Contents

- [1. Planned Language Expansions (TODO)](#1-planned-language-expansions-todo)
- [2. Site Discovery & Expansion](#2-site-discovery-expansion)
  - [2.1. Link Traversal](#2-1-link-traversal)
  - [2.2. Engine Cross-Reference](#2-2-engine-cross-reference)
  - [2.3. User Contribution](#2-3-user-contribution)
  - [2.4. Reverse Image Search](#2-4-reverse-image-search)
  - [2.5. Temporal Anomaly Detection](#2-5-temporal-anomaly-detection)
  - [2.6. Catalog Expansion (Future)](#2-6-catalog-expansion-future)
  - [2.7. /prowl add-site](#2-7-prowl-add-site)
- [3. Research Modes & Wiki Architecture](#3-research-modes-wiki-architecture)
  - [3.1. Deep-Dive Mode](#3-1-deep-dive-mode)
  - [3.2. Wiki Structure](#3-2-wiki-structure)
  - [3.3. Wiki Operations](#3-3-wiki-operations)
  - [3.4. Cross-Session Persistence](#3-4-cross-session-persistence)
  - [3.5. Sharing](#3-5-sharing)
  - [3.6. Relationship Between Search Modes](#3-6-relationship-between-search-modes)
  - [3.7. Deep-Dive Mode](#3-7-deep-dive-mode)
  - [3.8. Cross-Session Memory (pi-remembers RAG)](#3-8-cross-session-memory-pi-remembers-rag)
- [4. Model Pipeline & Reasoning Architecture](#4-model-pipeline-reasoning-architecture)
  - [4.1. Context Rot Prevention](#4-1-context-rot-prevention)
  - [4.2. Image Handling](#4-2-image-handling)
  - [4.3. Video Handling (Realistic Tiering)](#4-3-video-handling-realistic-tiering)
  - [4.4. In-Browser Model (Share Sites)](#4-4-in-browser-model-share-sites)
  - [4.5. DSPy for Structured Prompting](#4-5-dspy-for-structured-prompting)
  - [4.6. Model Configuration & Versatility](#4-6-model-configuration-versatility)
- [5. Anti-Bot & CAPTCHA Handling](#5-anti-bot-captcha-handling)
  - [5.1. Layered Approach](#5-1-layered-approach)
  - [5.2. nopecha + Firecrawl (not SearXNG)](#5-2-nopecha-firecrawl-not-searxng)
- [6. Wiki Ingestion Prompts](#6-wiki-ingestion-prompts)
  - [6.1. Ingest Prompt (one source, prevents context rot)](#6-1-ingest-prompt-one-source-prevents-context-rot)
  - [6.2. Page Creation Prompt](#6-2-page-creation-prompt)
  - [6.3. Index Update Prompt](#6-3-index-update-prompt)
  - [6.4. Lint Prompt](#6-4-lint-prompt)
  - [6.5. Obsidian Graph](#6-5-obsidian-graph)
- [7. pi Extension Architecture — Future Commands](#7-pi-extension-architecture-future-commands)
- [8. Sharing & Portability](#8-sharing-portability)
  - [8.1. Philosophy](#8-1-philosophy)
  - [8.2. The Share Command](#8-2-the-share-command)
  - [8.3. Site Architecture](#8-3-site-architecture)
  - [8.4. Site Features](#8-4-site-features)
  - [8.5. Recommended Models for Browser Inference](#8-5-recommended-models-for-browser-inference)
  - [8.6. Deployment](#8-6-deployment)
  - [8.7. Viral Loop](#8-7-viral-loop)
  - [8.8. Forking](#8-8-forking)
- [9. Roadmap](#9-roadmap)
- [10. Bounded Loop Engineering](#10-bounded-loop-engineering)
  - [10.1. Overview](#10-1-overview)
  - [10.2. Command Interface](#10-2-command-interface)
  - [10.3. Loop Lifecycle](#10-3-loop-lifecycle)
  - [10.4. Tiered Model Routing](#10-4-tiered-model-routing)
  - [10.5. Progress Output](#10-5-progress-output)
  - [10.6. Integration with DSPy ](#10-6-integration-with-dspy)
  - [10.7. Relationship to Future Value Discovery (§22)](#10-7-relationship-to-future-value-discovery-22)
  - [10.8. Trajectory Footprint (Loop Ledger)](#10-8-trajectory-footprint-loop-ledger)
  - [10.9. Event-Emitting, Resumable Loop](#10-9-event-emitting-resumable-loop)
  - [10.10. Execution: Worker-Pool & Frontier Craw](#10-10-execution-worker-pool-frontier-craw)
- [11. Auto-Curated Boards (Future Concept)](#11-auto-curated-boards-future-concept)
  - [11.1. The Missing Surface: Distribution](#11-1-the-missing-surface-distribution)
  - [11.2. Two Variants](#11-2-two-variants)
  - [11.3. Moderation Gate (HARD REQUIREMENT)](#11-3-moderation-gate-hard-requirement)
  - [11.4. Philosophical Boundary](#11-4-philosophical-boundary)
  - [11.5. Relationship to Existing Surfaces](#11-5-relationship-to-existing-surfaces)
  - [11.6. Note — Host the Method, Not the Payload (revisit later)](#11-6-note-host-the-method-not-the-payload-revisit-later)

---

---

# 1. Planned Language Expansions (TODO)

Languages to add beyond the **core 6** (ZH, RU, JA, KO, ES, PT). None implemented yet — each requires the §3.3 dork-target + §3.4 index discovery and the §5.1 Layer-2 parameterization described in [[query-variations]]. Tracked for a later build; do not promote to the active language list ([[PRD-0.1]] §9.1) until its ecosystem is verified.

**Perplexity note (2026-07-13):** the FR/DE "translation-only" and AR/HI "prove Layer 2" rationales are *strategy opinions, not verified technical facts* — relabel when implemented. Current build focus is the established 6 (see [[query-variations]]).

- [ ] **French (FR)** — translation-only; shares the English web's infrastructure (Google/Bing, same pastebins/file hosts). Adds Western-European reach, no new technique. *(Cheap.)*
- [ ] **German (DE)** — same as FR: translation-only, shares EN web infra. Adds Western-European reach. *(Cheap.)*
- [ ] **Czech (CS)** — *own domestic search engine* **Seznam** (~13% of the Czech market). A country with its own engine has unique SEO dynamics, local hosting, and a deep domestic litter web Google misses. Needs Seznam routing + CS Layer-2. *(Gemini-suggested.)*
- [ ] **Polish (PL)** — highly insular web; massive imageboard/forum culture (Wykop = PL Reddit/4chan equivalent) operating entirely in Polish — a rich tech/political/cultural litter repository. Needs PL Layer-2 + Wykop dork targets. *(Gemini-suggested.)*
- [ ] **Ukrainian (UK)** — as Ukraine decouples digital infrastructure from the Russian Runet, a large unique domestic web is forming (localized wartime tech, cybersecurity logs, regional history). Needs UK Layer-2 + regional routing. *(Gemini-suggested.)*
- [ ] **Arabic (AR)** — *ecosystem discovery* (phase-2): own regional engines, preferred pastebins (JustPaste.it / AnonPaste / textm.ee), file hosts (UploadNexus / storage.to), RTL, Hijri era anchors, chat-alphabet + dialect transliteration. The only additions that prove Layer 2 generalizes. *(See [[query-variations]] §7.8.)*
- [ ] **Hindi (HI)** — *ecosystem discovery* (phase-2): own regional engines, pastebin (pastebin.in / Pasteshr), file host (Digiboxx), Devanagari + Hinglish transliteration. *(See [[query-variations]] §7.8.)*

---

# 2. Site Discovery & Expansion

Prowl maintains a living catalog of litter-web sites. New sites are discovered through:

### 2.1. Link Traversal
When fetching content from a promising result, scan the page for outbound links to other personal blogs, forums, file hosting links, or author profiles on other platforms.

### 2.2. Engine Cross-Reference
When three different engines return results from the same obscure domain, that domain is added to the site catalog.

### 2.3. User Contribution
When you find a site that yielded good results, it gets added to the site catalog for future searches.

### 2.4. Reverse Image Search
If a result includes images, reverse-image search can find where else that image appears, revealing new sources.

### 2.5. Temporal Anomaly Detection
When a result's content seems anachronistic (an idea that sounds modern but is dated much earlier), flag the site as potentially high-value. These sites are disproportionately likely to contain premature truths.

### 2.6. Catalog Expansion (Future)

Current site catalog is sparse. Target 20+ sites per category with expanded coverage of:
- **China**: Weibo, Tieba, Zhihu, Douyin, Bilibili
- **Japan**: 2ch, 5ch, Pixiv, Nicovideo, Hatena
- **Russia**: Yandex, VK, Rutube
- **South America**: local forums and communities

This expansion is deferred but marked as critical for multi-language effectiveness.

### 2.7. /prowl add-site

```
/prowl add-site <url>
```

Interactive command to grow the site catalog:
1. User provides URL
2. System asks: category? language? content type?
3. Backend crawls/analyzes the site (Firecrawl) to understand structure
4. Mostly automated; option for user clarification
5. Site persisted to the **site catalog** (`CatalogPort`, §24.1) — a `site-catalog.ts` file in prowl-pi, a namespaced DB table in prowl-web — and read by `SCATTER` (§5, §2) on future searches

This makes the catalog grow from use instead of being hardcoded.

### Key Pattern

The average dormant period across these examples is **~40 years**. The shortest (relational databases, Google's unsupervised learning paper) was ~5-10 years. The longest (photophone, phonautograph) was 90-150 years.

This means **the most valuable content in today's litter web is likely to have been created 10-30 years ago** — old enough that it may have been forgotten, but recent enough that the infrastructure to realize it now exists. Prowl's temporal targeting should prioritize this window.

---

# 3. Research Modes & Wiki Architecture

Prowl supports three modes of operation:

### 3.1. Deep-Dive Mode
Creates or continues a Karpathy-style wiki for a specific research topic. The wiki persists across sessions, building a structured, cross-linked knowledge base that compounds over time.

```
/prowl deep-dive "natural migraine treatments"
```

This creates:

```
~/.prowl/wikis/natural-migraine-treatments/
├── index.md # Content catalog (updated on every ingest)
├── log.md # Append-only chronological record
├── schema.md # Page type definitions
├── concepts/ # e.g., magnesium-orotate.md, magnesium-mania.md
├── sources/ # Summaries of each ingested source
├── comparisons/ # e.g., magnesium-vs-lamotrigine.md
└── entities/ # Authors, forums, known personalities
```

### 3.2. Wiki Structure

Following the Karpathy LLM Wiki pattern:

**Layer 1: `raw/`** — Immutable source documents. Full content fetched by Prowl, never modified after creation.

**Layer 2: `wiki/`** — LLM-generated markdown pages, organized by type:

| Directory | Content |
|-----------|---------|
| `concepts/` | Central ideas (e.g., `magnesium-orotate.md`) |
| `sources/` | One page per ingested source |
| `comparisons/` | Side-by-side comparisons of related concepts |
| `entities/` | Authors, forums, known personalities |

**Layer 3: `schema.md`** — Defines page templates, naming conventions, and operational workflows. Tells the LLM how to maintain the wiki consistently.

### 3.3. Wiki Operations

**Ingest:** A new source is added to `raw/`, the LLM creates a summary in `wiki/sources/`, updates or creates concept/entity pages in `wiki/`, updates `wiki/index.md`, and appends to `wiki/log.md`.

**Query:** The LLM reads `wiki/index.md` to navigate, reads relevant pages, and synthesizes answers with source citations.

**Lint:** Periodic health checks — scan for contradictions, orphan pages, missing concepts, stale claims.

### 3.4. Cross-Session Persistence

When you return to a deep-dive topic, just run deep-dive again — it resumes rather than restarts:

```
/prowl deep-dive "natural migraine treatments"
```

The LLM reads `wiki/index.md` and `wiki/log.md` to understand what was already covered, what sources were ingested, and what questions were left open. It then presents a status summary and picks up where you left off. (There is no separate `continue-dive` command — deep-dive is idempotent and resumable across sessions.)

### 3.5. Sharing

Wikis are pure markdown and can be shared trivially:

- **Git repo** (private or public)
- **Drop a folder** in a shared drive
- **Send a tarball**
- **Merge** two people's wikis on the same topic for a richer knowledge base

### 3.6. Relationship Between Search Modes

```
Search Mode (quick query)
 |
 +-- Results returned immediately
 +-- Nothing persisted (except optional pi-remembers)
 +-- No cross-session memory

Deep-Dive Mode (ongoing research)
 |
 +-- Results ingested into wiki
 +-- Wiki grows across sessions
 +-- Cross-references build over time
 +-- Queryable on return
 +-- Shareable as markdown
```

---

### 3.7. Deep-Dive Mode

**Deep-Dive Mode (ingest):** SearXNG → URLs → Firecrawl `batch_scrape` → clean markdown → Venice → wiki pages. Firecrawl IS used — we're building a structured knowledge base from full content.

```
/prowl deep-dive "natural migraine treatments"
 SearXNG → Firecrawl batch_scrape → wiki pages from full content
```

### 3.8. Cross-Session Memory (pi-remembers RAG)

After a research session, the agent identifies high-value findings. These are formatted for vector embedding and stored in pi-remembers. Future searches first query pi-remembers for relevant prior findings, so results accumulate cross-session, building a personal knowledge base.

**What gets persisted:**
- Direct quotes with source attribution
- Substance/dosage/outcome combinations
- Contradictions and edge cases
- Site URLs that yielded good results
- Query patterns that worked well
- Usernames that appeared across multiple platforms

# 4. Model Pipeline & Reasoning Architecture

Prowl uses a two-model strategy for uncensored search planning and content synthesis, plus an in-browser model for shared wikis. Both layers are uncensored — this is the core differentiator (see §13 for search/extraction stack).

### 4.1. Context Rot Prevention

**Problem:** Feeding 50 sources + entire wiki to Grok causes lost-in-middle, contradiction dilution, cost waste.

**Solution:** The wiki IS the compression layer. Map-reduce ingestion:

```
Raw firehose (NEVER fed to Grok directly)
 |
 ▼ [Map: each source -> individual summary, small context]
 Wiki pages (structured, summarized)
 |
 ▼ [Reduce: summaries -> wiki, small context]
 index.md (summary of summaries)
 |
 ▼ [Query: Grok reads index.md + 2-3 relevant pages ONLY]
 Grok synthesizes (small, focused context)
```

Grok never sees the raw firehose. It sees compressed wiki. This prevents context rot.

### 4.2. Image Handling

The litter web contains images: forum screenshots, diagrams, photos (symptoms, plants), infographics, memes-with-info.

**Pipeline:**
1. Firecrawl extracts image `src` URLs alongside text
2. Images downloaded to `wiki/assets/` (or referenced by URL)
3. Vision model (Qwen-VL) generates OCR + caption → text
4. Text description fed to Grok (text-only)
5. Raw images stored in wiki, displayed on share site

**Searchability:**
- OCR: Extract text from images → searchable
- Captioning: Vision model describes → searchable description
- Reverse image search: Find where else image appears (§2.4)
- CLIP embeddings: Visual similarity search

### 4.3. Video Handling (Realistic Tiering)

**Platforms beyond YouTube:** Vimeo (older, less restrictive), chan sites (WebM/MP4), Reddit (v.redd.it), Archive.org, PeerTube, BitChute/Odysee, old forums.

**CRITICAL CONSTRAINTS:**
- Video download restricted (DRM, rate limits)
- Platform APIs massively restrictive (OAuth, quotas)
- Transcript extraction compute-heavy
- Per-platform API adapters impossible to maintain

**Solution:** Do NOT use platform APIs. Use **yt-dlp** as universal adapter (1000+ sites). Tiering:

**Tier 0 (v1 default): Metadata only**
- Search result includes title, description, thumbnail URL
- Wiki stores: `[Watch](url)` + thumbnail image
- No download, no transcription
- User watches manually

**Tier 1 (optional, user-initiated):**
- User requests: "process this video"
- yt-dlp downloads + extracts subtitles (if available)
- Transcript → Grok (text)
- Thumbnail → Qwen-VL (1 image)
- Full video download OPTIONAL

**Tier 2 (future):** Batch processing for deep-dives (user-controlled)

**Storage:** `~/.prowl/wikis/[topic]/media/` — user-controlled. Default: thumbnail only (few KB).

### 4.4. In-Browser Model (Share Sites)

For shared wikis (§8), an in-browser LLM runs via WebGPU:
- Qwen 2.5 4B / Mistral 3B (text)
- Qwen 2.5-VL (vision, if image querying needed)
- No API key, no server, no tracking

### 4.5. DSPy for Structured Prompting

All model interactions use [DSPy](https://github.com/stanfordnlp/dspy) for structured, typed prompting instead of raw prompt strings. DSPy provides:

- **Typed signatures** for each model interaction — query planner, content synthesis, wiki ingest, page creation, lint
- **Programmatic pipeline composition** — chain search → extract → synthesize → ingest without string templating
- **Optimization** — DSPy can auto-optimize prompts with feedback, improving synthesis quality over time
- **Portability** — switching models (§4.6) doesn't require rewriting prompts; DSPy adapts to the target model

Each wiki operation (§6) is implemented as a DSPy module with a typed signature:

```python
class IngestSource(dspy.Signature):
 """Ingest a source into a research wiki."""
 source_content = dspy.InputField(desc="Full markdown from Firecrawl")
 wiki_index = dspy.InputField(desc="Current wiki/index.md")
 summary = dspy.OutputField(desc="3-5 sentence summary")
 new_concepts = dspy.OutputField(desc="New concepts not in wiki")
 contradictions = dspy.OutputField(desc="Contradictions with existing pages")
 page_updates = dspy.OutputField(desc="Suggested page updates")
```

This makes the prompting layer maintainable, testable, and model-agnostic — consistent with the versatility goal.

### 4.6. Model Configuration & Versatility

Prowl avoids model lock-in. All model assignments are configurable via a `models.config` file:

```ts
interface SearchPlanner {
  requires: ["video-modality", "large-context (>=256K)"]
  default: "qwen-3-...-plus"
}
interface ContentSynthesizer {
  requires: ["text-only", "large-context (>=2M)"]
  default: "grok-4-20"
}
interface InBrowserModel {
  requires: ["small (<=4B)", "webgpu-compatible"]
  default: "qwen-2.5-4b"
}
```

Users may swap any model meeting the interface requirements. The only hard constraint is capability (video modality for planner, large context for synthesizer, small size for browser). "Uncensored" is a user preference, enforced by model choice rather than hardcoded.

This means a forked or self-hosted Prowl instance can use entirely different models — Ollama local models, a different API provider, or future models not yet released.

---

# 5. Anti-Bot & CAPTCHA Handling

The litter web is increasingly protected: Cloudflare turnstile (even 4chan), hCaptcha, reCAPTCHA.

### 5.1. Layered Approach

**Layer 1: SearXNG (API-based, no CAPTCHA)**
- Queries engines via HTTP, no browser
- Google/Bing may return CAPTCHAs at scale — accept partial results
- Marginalia, Wiby, Mojeek more lenient

**Layer 2: Firecrawl (Chromium + nopecha)**
- Self-hosted Firecrawl uses Playwright/Chromium
- Load nopecha extension: `--load-extension=/path/to/nopecha`
- nopecha auto-solves Cloudflare turnstile, hCaptcha, reCAPTCHA
- Requires headed mode or Xvfb (headless + extensions unreliable)
- Playwright needs own Chromium: `playwright install chromium` (separate from Helium browser)

**Layer 3: Archive fallback (secret weapon)**
When live scraping fails:
- Wayback Machine API: `https://archive.org/wayback/available?url=...`
- archive.today: pre-captured pages
- Firecrawl scrapes the ARCHIVE (no CAPTCHA)

**Layer 4: Alternative sources**
- RSS feeds (no CAPTCHA)
- APIs (Reddit API, etc.)
- Tor exit nodes (some sites allow Tor, block clearnet)

### 5.2. nopecha + Firecrawl (not SearXNG)

nopecha is a browser extension. Works with Firecrawl (browser-based scraping), NOT SearXNG (API-based).

```
SearXNG (API) -> finds URLs (no CAPTCHA)
 |
 v
Firecrawl (Chromium + nopecha) -> scrapes page
 |
 v
nopecha solves Cloudflare turnstile
 |
 v
Firecrawl extracts content
```

nopecha: https://github.com/NopeCHALLC/nopecha-extension

---

# 6. Wiki Ingestion Prompts

The Karpathy wiki (§3) requires specific prompts for Grok.

### 6.1. Ingest Prompt (one source, prevents context rot)

```
You are ingesting a source into a research wiki about [TOPIC].

SOURCE CONTENT:
[full markdown from Firecrawl]

EXISTING WIKI INDEX:
[index.md]

TASK:
1. Summarize source in 3-5 sentences
2. Identify NEW concepts not in wiki
3. Identify CONTRADICTIONS with existing pages
4. Suggest page updates

OUTPUT (JSON):
{
 "summary": "...",
 "new_concepts": ["concept1", "concept2"],
 "contradictions": ["page X claims Y, source says Z"],
 "page_updates": ["update page X with..."]
}
```

### 6.2. Page Creation Prompt

```
Create a wiki page for concept: [CONCEPT]

SOURCE MATERIAL:
[relevant excerpts]

TASK:
- Structure: Definition, Evidence, Personal Accounts, Contradictions, Related Concepts
- Use [[Concept Name]] syntax for cross-links (builds Obsidian graph)
- Cite sources as [Source: URL]

OUTPUT: Markdown
```

### 6.3. Index Update Prompt

```
Update wiki index based on new ingestions.

CURRENT INDEX:
[index.md]

NEW: [concepts, pages, contradictions]

OUTPUT: Updated index.md (organized by category)
```

### 6.4. Lint Prompt

```
Review wiki for issues:
- Orphan pages (no [[links]])
- Unresolved contradictions
- Stale claims (no recent corroboration)
- Mentioned-but-missing concepts

OUTPUT: List of issues + recommendations
```

### 6.5. Obsidian Graph

[[Concept]] wikilinks in pages auto-generate Obsidian graph. No extra prompt. Open wiki folder in Obsidian → graph view appears.

---

# 7. pi Extension Architecture — Future Commands

The `prowl-pi` adapter skeleton, v0.1 command rows, tools, and event hooks are specified in [[PRD-0.1]] §18. The remaining commands planned for the adapter:

| Command | Description | |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| `/prowl deep-dive <topic>` | Start or continue a research wiki | |
| `/prowl lint <topic>` | Run health checks on a wiki | |
| `/prowl add-site <url>` | Add a site to the catalog (§2.7) | |
| `/prowl orphan <domain>` | Run orphan detection on a domain via Wayback CDX (§3.2, §6) | |
| `/prowl loop <topic>` | Autonomous bounded research loop (§4.4, §10) | |
| `/prowl share <topic>` | Generate & deploy a shareable wiki site (§8) | |
| `/prowl fork <topic>` | Clone a wiki into an independent copy (§8.8, §10.9) | |
| `/prowl export <topic>` | Bundle a wiki for local download/portability (StoragePort; §8.4) | |
| `/prowl config [get | set] <key> [value]` | Read/write settings (settings.json, models.config §4.6) |
| `/prowl status [runId]` | Show loop/session state (EventPort; §10.9) | |

# 8. Sharing & Portability

### 8.1. Philosophy

Wikis are pure markdown and trivially portable. But raw markdown folders are not useful to most people. Prowl's share feature generates a deployable static site that anyone can use.

**Critical separation:** Prowl.moe hosts only the search interface — the `/prowl search` command, the loop engine, and a wiki directory (catalog of public wikis with links). The wikis themselves live on **separate Nekoweb sites**, each at their own `<project>.nekoweb.org` subdomain.

```
prowl.moe (the search interface)
 +-- /search (the search interface)
 +-- /loop (the research agent)
 +-- /explore (catalog of public wikis with external links)
 |
 +-- links to wikis hosted on separate Nekoweb sites:
 https://prowl-migraine.nekoweb.org
 https://prowl-music-hardware.nekoweb.org
 ...
```

This is the chan model for wikis: Prowl links, Nekoweb hosts. Nekoweb's API supports multiple sites per account, so each wiki gets its own `<project>.nekoweb.org` subdomain — isolated from Prowl and from each other.

Nekoweb is the sole hosting target (§8.6) — no fallback deploy path.

### 8.2. The Share Command

```
/prowl share "natural migraine treatments"
```

This generates a complete static site from the wiki and deploys it to **Nekoweb** as a separate site:

```
/prowl share "natural migraine treatments"
 |
 +-- Generates static site from wiki/
 +-- Creates new site on Nekoweb via API:
 | POST /files/upload
 | Headers: Authorization: Bearer <key>
 | Body: multipart/form-data with all static files
 |
 +-- Wiki lives at https://prowl-migraine.nekoweb.org
 +-- Prowl.moe adds a link: /explore -> prowl-migraine.nekoweb.org
```

No domain to buy. No DNS. Nekoweb provides the `<project>.nekoweb.org` subdomain for free. The API handles file creation, upload, and deletion — zero manual interaction.

Nekoweb is the sole host — no Cloudflare fallback (per project decision).
Both targets consume the same static build output. The difference is one API call.

### 8.3. Site Architecture

The site is fully static with a client-side LLM for querying:

```
Visitor's Browser
 |
 +-- Loads wiki pages (static HTML, instant)
 +-- Loads a small LLM via CDN (one-time download, ~2-3GB)
 | (Qwen 2.5 4B or Mistral 3B, Q4 quantized)
 +-- Model runs entirely in-browser (WebGPU or WASM)
 |
 User types: "What did we find about magnesium dosage?"
 |
 +-- Context = relevant wiki pages fed to model
 +-- Model answers from wiki content with source citations
 +-- All queries are instant after model is cached
 +-- Works offline after initial load
```

### Key Details

- **No server.** No API keys. No tracking. The model is downloaded via CDN and cached in the browser (IndexedDB / Cache API).
- **Phone-friendly.** A 3B-4B quantized model runs on modern phones via WebGPU. The initial download takes ~30 seconds on WiFi.
- **Offline capable.** Once the model is cached, all queries work without internet.
- **Instant loading.** Wiki pages are static HTML and render immediately. The model loads in the background.

### 8.4. Site Features

| Feature | Implementation |
|---------|---------------|
| **Browse pages** | Rendered markdown, all pages linked |
| **Graph view** | Clickable concept map (D3.js or vis.js) |
| **Search** | Full-text search via Fuse.js (for quick keyword lookups) |
| **Query** | Local LLM (for natural language questions) |
| **Download** | One-click download of raw wiki as zip |
| **Offline** | Service worker caches all pages + model |

### 8.5. Recommended Models for Browser Inference

| Model | Size (Q4) | Quality | Phone? |
|-------|-----------|---------|--------|
| **Qwen 2.5 4B** | ~2.5 GB | Strong reasoning, good at retrieval | Yes (WebGPU) |
| **Mistral 3B** | ~2 GB | Fast, good at instruction following | Yes (WebGPU) |
| **Gemma 3 4B** | ~2.5 GB | Strong, uncensored variant available | Yes (WebGPU) |

All run via [WebLLM](https://github.com/mlc-ai/web-llm) or [Transformers.js](https://huggingface.co/docs/transformers.js) with WebGPU backend.

### 8.6. Deployment

Prowl uses **Nekoweb** as the sole wiki host:

**Primary (Nekoweb API):**
```
/prowl share "topic"
 |
 +-- Generates static site from wiki/
 +-- Uploads via Nekoweb API (multipart/form-data)
 +-- URL: https://prowl-{slug}.nekoweb.org
```

Nekoweb API endpoints used:
- `POST /files/create` — create folder structure
- `POST /files/upload` — upload HTML, JS, CSS, assets
- `POST /files/delete` — remove old files on update
- `GET /files/readfolder` — list existing files
- `GET /site/info_all` — manage multiple sites per account

Nekoweb is the **sole** hosting target (no Cloudflare fallback — per project decision). The share-builder outputs a static site consumed only by the Nekoweb API.

### Wiki Isolation

Each wiki gets its own Nekoweb site with its own `<project>.nekoweb.org` subdomain:

```
prowl.moe (search interface)
prowl-migraine.nekoweb.org (migraine treatments wiki)
prowl-music-hardware.nekoweb.org (music hardware wiki)
prowl-shibboleth.nekoweb.org (streaming fraud wiki)
```

**Why not subdomains on prowl.moe?**
1. **Isolation** — each wiki is a separate Nekoweb site, separate subdomain. If one gets targeted, the others aren't affected
2. **No cost** — all free on Nekoweb
3. **No config** — no domain buying, no DNS, no cert management (@nekoweb.org subdomain provided automatically)
4. **Portable** — the raw markdown can be downloaded and self-hosted elsewhere anytime
5. **Sole host** — Nekoweb only; no secondary deploy target (per project decision)

### 8.7. Viral Loop

1. You build a wiki on an interesting topic
2. `/prowl share` deploys it to its own `project.nekoweb.org`
3. Prowl links to it: `https://prowl.moe/explore -> yourwiki.nekoweb.org`
4. Someone visits, reads, queries, downloads the wiki
5. They can start their own deep-dive from your work
6. They deploy their own fork to their own `nekoweb.org` subdomain

Knowledge compounds across people. Each wiki is an independent Nekoweb site — free, isolated, no central target.

### 8.8. Forking

On Nekoweb, forking is handled via the API — copy files to a new site or a new path within the existing site:

```
prowl-magnesium-alt.nekoweb.org/fork/index.html
```

Three forking models:

**Option A: Static fork page (simplest, fully local-first)**
`/wiki/magnesium_alt/fork/index.html` is a static page with a download button + instructions:
> "Download this wiki. Run `/prowl deep-dive "magnesium alternatives"` locally. Your local wiki picks up where this one left off. Re-share your extended version anytime."

No server. The "fork" is: **download → continue locally → re-share**.

**Option B: Serverless fork (prowl-web)** — a serverless function copies the wiki to a new Nekoweb site/namespace. Stateful but no traditional server; only relevant once prowl-web exists.

**Option C: Git-based fork (decentralized)**
Each wiki is a git repo. "Fork" = clone → edit → deploy your own instance. The GitHub model — fully decentralized.

**Recommended:** Option A for v1 (local-first philosophy). prowl-web forking reuses Nekoweb sites (§8.6), so each fork gets its own `nekoweb.org` subdomain.

---

# 9. Roadmap

## Phase 1: Core (v0.1.0 + near-term)
- [ ] pi extension scaffolding (index.ts, SearXNG client)
- [ ] `/prowl search` command (snippets + `--read` evidence mode) — **v0.1.0**
- [x] Basic SearXNG integration (Docker Compose, JSON API, no limiter) — **done** (verified 2026-07-16)
- [ ] Qwen Search Planner (single query reform; multi-language/dork variation deferred to v0.2)
- [ ] **Negative search / exclusion phase** (§13.7) — **DEFERRED past v0.1.0**: query SEO engines to build per-topic blocklist

## Phase 2: Deep-Dive 
- [ ] `/prowl deep-dive` command
- [ ] Wiki creation and management (Karpathy pattern)
- [ ] Ingest/query/lint operations (§6 prompts)
- [ ] Cross-session persistence
- [ ] Map-reduce ingestion (context rot prevention, §4.1)

## Phase 3: Extraction & Anti-Bot
- [ ] Firecrawl Docker integration (Chromium-based extraction)
- [ ] nopecha extension + Firecrawl (CAPTCHA solving, §5)
- [ ] Archive fallback (Wayback Machine, archive.today)
- [ ] Image handling (OCR, captioning, storage in wiki/assets/)
- [ ] Video Tier 0 (metadata only, §4.3)

## Phase 4: Share 
- [ ] Static site generator
- [ ] In-browser LLM integration (WebLLM/Transformers.js)
- [ ] Nekoweb deployment (per-wiki subdomain, §8.6)
- [ ] Forking — `/prowl fork` is a **core command** available in all adapters: a local copy or `git clone` in prowl-pi/cli, a serverless namespace in prowl-web (§8.8). The underlying wiki-merge/conflict logic ships in core (see LINT on merged wikis).

## Phase 5: Polish 
- [ ] Multi-language search expansion
- [ ] Site catalog growth (automatic discovery)
- [ ] Wiki merging (combine two people's research)
- [ ] Custom curation (choose what gets saved vs ignored)
- [ ] Video Tier 1 (optional yt-dlp processing, user-initiated)

---

# 10. Bounded Loop Engineering

### 10.1. Overview

`/prowl loop` wraps the six-phase pipeline (§4.1) in an autonomous recursive loop that searches, evaluates, and re-searches until budget or termination conditions are met. It is designed to be **cost-conscious** — 90% of iterations never invoke the expensive synthesizer model.

### 10.2. Command Interface

```
/prowl loop "topic" --budget 0.50 --time 30 --iters 5
```

| Flag | Default | Description |
|------|---------|-------------|
| `--budget` | $0.50 | Total budget for the session |
| `--time` | 30 | Max run time in minutes |
| `--iters` | 5 | Max loop iterations |
| `--depth` | auto | Gap-following depth (shallow, auto, deep) |
| `--model` | auto | Model tier for synthesis (cheap, auto, premium) |

### 10.3. Loop Lifecycle

### Iteration 1: Broad Discovery (most expensive)
- SearXNG scatter (3+ engines, multi-language)
- Firecrawl extraction
- Cheap model (Ollama 3B or equivalent) classifies results
- **Gate:** If >20% new URLs OR cheap model flags novelty → route to Grok
- Grok synthesizes → wiki pages created → gaps identified
- Cost: ~$0.03-0.08

### Iteration 2+: Targeted Gap-Filling (cheaper)
- Follow gaps from previous iteration
- SearXNG scatter (1-2 engines, targeted queries)
- Cheap model evaluates: "anything new?"
- **Gate:** If nothing new → terminate (no model cost)
- If something new → cheap model updates wiki (no Grok needed)
- Only route to Grok for complex contradictions or novel clusters
- Cost: ~$0.00-0.02

### Termination (auto, no model needed)
```ts
const shouldTerminate = {
 zeroNovelty: consecutiveEmptyLoops >= 2,
 diminishingReturns: newSources / existingSources < 0.1,
 budgetExhausted: totalCost >= maxCostPerSession,
 timeExhausted: elapsedMinutes >= maxRunMinutes,
 iterationsExhausted: currentIteration >= maxIterations,
 noGapsRemaining: wiki.gaps.length === 0
}
```

Evaluation is entirely **code-determined**, not AI-determined. No model decides "are we done?" — the file system and cost tracker answer that. Zero-novelty is also enforced at the *action* level by the Trajectory Footprint (§10.8) — a ledger that hard-stops the loop when the same search/extract pattern repeats, independent of the per-iteration novelty count.

### 10.4. Tiered Model Routing

| Stage | Default Model | Cost Tier | When |
|-------|--------------|-----------|------|
| Query planning | Qwen | Premium | Iteration 1 only |
| Result classification | Ollama 3B / cheap API | Free-$0.001 | Every iteration |
| Synthesis + gap detection | Grok 4.2 | Premium | Only when cheap model flags novelty |
| Wiki page writing | Ollama 3B / cheap API | Free-$0.001 | Every iteration |
| Index updates | Code (no model) | $0 | Every iteration |
| Termination evaluation | Code (no model) | $0 | Every iteration |

This routing ensures the expensive models (Qwen, Grok) are used **only when they add unique value**. The bulk of loop work is handled by code + cheap model.

### 10.5. Progress Output

The loop streams real-time progress so you always know what's happening and what it's costing:

```
[Loop 1/5] SearXNG scatter (3 engines)... 12 URLs found
[Loop 1/5] Firecrawl extracting... 8/12 readable
[Loop 1/5] Classifying (cheap model)... 2 clusters: [payment models, failed platforms]
[Loop 1/5] 2 new clusters -> routing to Grok... $0.04 spent
[Loop 1/5] 2 wiki pages created | 2 new gaps detected
 -> $0.04 total

[Loop 2/5] Following gap: "why did platform X fail?"
 SearXNG scatter... 3 URLs found
 All indexed -> zero novelty -> terminate
 -> $0.04 total | zero novelty after 1 gap attempt

=== Loop Complete ===
Topic: artist-fan monetization
Cost: $0.04 / $0.50 budget
Results: 2 wiki pages, 8 sources ingested
Unresolved gaps: [direct-listener-payments-legal.md]
```

### 10.6. Integration with DSPy 

The loop pipeline is composed as DSPy modules (§4.5), making it model-agnostic:

```python
class ResearchLoop(dspy.Module):
 def __init__(self):
 self.planner = SearchPlanner() # Qwen or equivalent
 self.classifier = ResultClassifier() # Cheap model
 self.synthesizer = ContentSynthesizer() # Grok or equivalent
 self.writer = WikiWriter() # Cheap model

 def forward(self, topic, budget):
 # DSPy handles typed inputs/outputs between stages
 # Model routing is controlled by budget gates, not hardcoded
```

### 10.7. Relationship to Future Value Discovery (§22)

The loop is the **execution layer** for dormant idea discovery. Running `/prowl loop "dormant music hardware ideas" --budget 1.00` over weeks builds the wiki that the dissonance scoring system (§22) queries. The loop finds; the scoring system filters. Its staged iteration is grounded in Pirolli & Card's sensemaking loop (2005) and Kuhlthau's Information Search Process (1991) — a six-stage empirical model (initiation → selection → exploration → focus formulation → collection → presentation) of how people search iteratively.

### 10.8. Trajectory Footprint (Loop Ledger)

A loop detector that watches *what Prowl does*, not what it says. Every action is compressed into a normalized fingerprint and stored in a fixed-size ring buffer; when the same short pattern repeats back-to-back, the loop hard-stops. This catches **trajectory-level loops** — the search planner re-Scattering the same query and re-Extracting the same site over and over — which is where compute dollars burn. It is the middle layer of a three-tier defense:

| Layer | Mechanism | Catches |
|-------|-----------|---------|
| Framework | DSPy Assert (future, §4.5) | Text stutters within a single response |
| Trajectory | Footprint Ring (this) | Repeated search/extract patterns across steps |
| Wallet | Budget Cap (§10.3) | Everything else (cost / time) |

### Fingerprint
Each action is hashed into a short, normalized string. Normalization (lowercase, strip, truncate) means `"Cannabis Mania 2024"` and `"cannabis mania 2024"` collide. **Three targets are fingerprinted** so semantic loops are caught, not just exact repeats:

- **Query string** — for `SCATTER` / `search` actions: `search | <engine> | <normalized query>`
- **URL** — for `EXTRACT` / `GATHER` / `fetch` actions: `extract | <normalized url>`
- **Content** — for fetched / ingested bodies: `content | <hash of normalized body>`

```ts
fingerprint(actionType, target) = hash(normalize(target))
// normalize = lowercase, strip punctuation/whitespace, truncate
```

### Ring buffer + pattern detection
A fixed-size ring buffer (default 20) holds the most recent fingerprints; new entries push old ones out. After each step:

```
push(fingerprint)
if last N steps == the N steps before them: // e.g. [search → extract → synthesize] repeated
 terminate(zero-novelty) // hard stop — no new ground being covered
```

The detector matches on *sequences* (not just single repeats), so a 2–3 step loop is caught even if individual steps appear elsewhere legitimately. This is the safety guard that keeps a loop querying **new** ground instead of re-walking old paths.

### Persistence (ledger)
The footprint is the loop's **ledger** — a durable record that the run has already covered certain ground. It is keyed by `(tenantId, runId)` and stored via `StoragePort` (§24.1), so:

- a resumed loop (§10.9) does not redo work;
- cross-session runs accumulate the ledger rather than circling.

### Cost
An afternoon. No AI, no training, no new dependencies — a hash function, a ring buffer, and a sequence matcher. It is pure code in core, invoked by the `EVALUATE` primitive.

### 10.9. Event-Emitting, Resumable Loop

`loop` (and any long-running pipeline) is **not a blocking call**. Core emits a stage event on every primitive transition (e.g., `scatter:done`, `synthesis:done`, `gap:detected`) and is resumable by a `runId`. This is what enables:

- prowl-pi / prowl-cli to stream progress and block until `terminate`;
- prowl-web to poll or stream (websocket) a run that may exceed 30 min (§10);
- `/prowl status <runId>` to report progress (EventPort);
- `/prowl fork` to clone a wiki (StoragePort copy) at any point.

The loop guardrails (§10.3) and termination logic remain pure code in core.

### 10.10. Execution: Worker-Pool & Frontier Craw

§10.9 makes the loop event-emitting and resumable. This section scales it: the loop is not one pipeline on one machine — it is a **frontier of tasks** pulled by a **warm pool of workers**, where promising results spawn child tasks. This is what lets Prowl run 8–12 multilingual queries (§7), extract in parallel, and deepen promising domains (incl. orphan detection) simultaneously.

### Worker pools (port fan-out)

The port abstractions in §24.1 are implemented as **pools**, not single clients:

- **`SearchPort` → `SearchPool`.** N SearXNG backends. The planner's 8–12 multilingual query variations fan out across them. Two wins: **parallelism** (faster broad discovery) and **politeness** — one SearXNG hammering Google/Bing from a single IP trips CAPTCHAs (§5.1); sharding spreads upstream load. Instances may be dedicated by engine-set: one tuned to Marginalia + Wiby (pure litter, §5.1), another to Google + Bing + Yandex (broad).
- **`ScrapePort` → `ScrapePool`.** M Firecrawl backends, sharded by site-type (JS-heavy chan archives on one tier, static blogs on another) or by queue depth.
- **`ArchivePort`** (new, §24.1) runs orphan detection as a **child task type** — it calls the Wayback CDX API and checks live/indexed status (§6). It is **not** a SearXNG workload and does **not** need a dedicated SearXNG instance. It only pulls `ScrapePort` when it must extract an archived orphan's content (Firecrawl pointed at `web.archive.org/web/...`).

### Chromium tiers for the ScrapePool

Each Firecrawl worker runs Chromium. To maximize pool density:

- **Bulk tier — `chromium-headless-shell` (Playwright package) / `chrome-headless-shell` (Google's official name).** Google's stripped-down headless build — a lightweight wrapper around Chromium's `//content` module with substantially fewer dependencies, so less RAM and faster startup than full Chromium. As of Chrome 132 it is a *separate* binary (the old headless mode was removed from the main Chrome binary), downloaded via Chrome for Testing. Playwright ships it separately; select it explicitly with `headless: 'shell'` — the default `headless: true` uses the *regular* Chromium in new-headless mode (heavier, more accurate rendering). So the `playwright-service` bulk tier must install `chromium-headless-shell` and launch with `headless: 'shell'` to get the lightweight binary. (`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` points Playwright at a custom Chromium binary, but that is the *heavier* full-Chromium path — use it only for the CAPTCHA tier below.) Covers the vast majority of plain/JS pages. Per-container concurrency is set via Firecrawl's `NUM_WORKERS_PER_QUEUE` and `MAX_CONCURRENT_PAGES`.
- **CAPTCHA tier — full Chromium + Xvfb + nopecha.** `chromium-headless-shell` cannot load extensions, so CAPTCHA-solving (§5.2) requires full Chromium in headed/Xvfb mode. Route CAPTCHA'd domains (Cloudflare turnstile, hCaptcha) to this tier only.

This tiering is why the pool is bigger than a single Firecrawl container would allow.

### Warm pool, not cold-spin

Keep a **standing warm pool** sized by deployment profile (Pi = 1–2 Firecrawl workers, RackNerd VPS = more; see [[prowl-versions]]). Grow the **task queue**, not the containers: spinning up a fresh Firecrawl container on demand is slow (Chromium download/start) and RAM-heavy, so elastic spin-up is reserved for the lighter `SearchPort` if at all. The pool + queue model also survives interruption: a killed run resumes against the same pool (§10.9 `runId`).

### Frontier crawl (web of searches)

The bounded loop (§10) becomes a **frontier-based graph crawler**. Each stage event can enqueue child tasks:

- `gap:detected` → spawn targeted follow-up searches on the pool.
- `useful-url:found` → spawn an extract child + (if the URL is on a promising domain) an `ArchivePort` orphan pass.
- A URL found *inside* an already-useful page → spawn a child branch on that domain.

Warm workers pull from the shared frontier; the **§10.8 ledger** deduplicates (no re-crawl) and makes the graph resumable. This is information foraging (Pirolli): when a patch is rich, forage deeper. The linear guardrails translate to frontier guardrails:

| Linear loop (§10.3) | Frontier model |
|---------------------|--------------|
| `maxIterations: 5` | `maxDepth` + `maxFrontierSize` |
| `budget` per session | `budgetPerBranch` + total cap |
| `zeroNoveltyThreshold: 2` | branch dies when its sub-frontier yields 0 novel |
| `diminishingReturnsRatio: 0.1` | prune branches under the ratio |
| `runId` + ledger | unchanged — enables the graph |

### Orphan detection trigger

Orphan detection runs **automatically** inside `/prowl loop` whenever a domain scores "promising" (trigger heuristic TBD — see §6), and is also available as an explicit manual command:

```
/prowl orphan <site-or-domain> [query]
```

# 11. Auto-Curated Boards (Future Concept)

*Concept note — like §22, this is a future major-version idea, not in the v0.1–v1.0 build plan. It describes a **distribution surface** for Prowl's discovery engine, not a change to the engine itself.*

### 11.1. The Missing Surface: Distribution

Prowl today is a **discovery engine** (§1, §4, §24): it finds unindexed litter-web content, deepens it via the loop (§10 / §10.10), and persists to wikis (§3) or RAG (§3.8). But a discovery engine with no *consumption surface* is only reachable through a CLI. An **auto-curated board** closes the loop:

```
Prowl discovers → loop deepens (§10.10 frontier) → board distributes
```

This is the passive counterpart to the wiki (§3) and the viral loop (§8.7): wikis compound *structured* knowledge; a board distributes *found things* as a browseable, chan/Reddit-style feed. It also feeds the premature-truth thesis (§10 / §22): a board is a "what Prowl found that looks ahead of its time" feed made legible to casual browsers.

### 11.2. Two Variants

**Variant A — Prowl-generated board.** Prowl auto-populates a board from loop output, refreshing on a schedule (e.g., daily). An **image/model curation tier** (§4.4 in-browser model, or a server model on the VPS) classifies and tags each found item so the board is navigable by category rather than a raw dump. This is "everything is pre-made; you don't have to discover anything new" — the user browses what Prowl already found.

**Variant B — anonymized user-search board.** Each user's searches (run through `/prowl search` / `/prowl loop`) are aggregated into a public board under an anonymous username, Reddit/chan-style. The §24.2 tenant model already provides the seam for per-user partitioning; anonymization means raw query PII is never stored — only the resulting findings, attributed to a throwaway handle. This turns every user into a curator and makes the aggregate interesting (the "what are other people searching?" effect).

### 11.3. Moderation Gate (HARD REQUIREMENT)

Auto-posting *unfiltered* scraped content to a **public** board is a launch-blocking liability, not a polish item. Unfiltered litter-web scraping surfaces, with certainty:

- **CSAM-adjacent material** — including cartoon/minor ("loli") content, which is illegal in many jurisdictions regardless of the "cartoon" framing. The Catbox exploration that prompted this idea already turned up anime/animation porn and cartoons.
- **Copyright-violating dumps** (file/paste hosts, §5.2).
- **Gore, extremist, and otherwise illegal content.**

Therefore every auto-posted item MUST pass a **classification + review gate before publish**:

1. An NSFW/**illegal-content classifier** (the Variant A image/model tier, pointed at classification *not* just categorization) scores each item.
2. Anything above threshold is **held for human review / auto-dropped**; only cleared items reach the public board.
3. A **takedown path** exists, and the §10.8 ledger tracks item provenance so takedowns are traceable.

This is the same gate any user-generated-content platform needs; for an *automated* scraper it is non-negotiable.

### 11.4. Philosophical Boundary

An auto-board shifts Prowl from *active discovery* ("find the hidden needle") to *passive consumption* ("browse what was found"). Keep them as **two surfaces**, not one merged mission: Prowl-core stays a research engine; the board is a read-only feed *generated from* loop output. The board's needs must not dilute the discovery engine (e.g., don't bias search toward "board-friendly" content).

### 11.5. Relationship to Existing Surfaces

- **§8.7 Viral Loop** — the board is the browseable, shareable face of cross-person knowledge compounding.
- **§21.3 ($5 Sellable Wikis)** — the board is top-of-funnel: browsers discover a topic, then spin up / buy a deep-dive wiki.
- **§22 Future Value Discovery** — board items tagged "ahead of their time" feed the dissonance-scoring system.

### 11.6. Note — Host the Method, Not the Payload (revisit later)

*Open question / riff to revisit in a later major version. Reframes §2.2 Variant B: instead of a board that hosts **what you found** (scraped content), host **how to find what you found** — the queries, dorks, angles, and site discoveries from `/prowl search`.*

Why this variant is compelling:

- **Dissolves the §2.3 moderation liability.** Recipes (text queries) are not scraped media, so the CSAM/copyright exposure that forced the hard gate largely disappears. The forum becomes shippable where the content-board was not.
- **Closer to Prowl's actual moat.** The findings are commodity; the craft is in the planning phase (§4.1 step 1) — query variation, dorks, multi-engine/multi-language angles (§7), site discovery (§2), orphan-detection recipes. A forum of "here's the dork that cracked this dead forum" is unique and valuable. It is the *social* form of §7 + §2 + §5.2 — a collective foraging map (Pirolli).
- **Clean two-tier economy.** Free method-forum as top-of-funnel; **$5 findings wikis** (§21.3) as the paid/structured layer. Share the *search*, not the *scrape*.

Open tension to resolve before building:

- **Self-defeating paradox.** Prowl is biased *away* from SEO / toward the unindexed (§1). A public "how to find" forum gets indexed by Google, leaking techniques into the surface web and SEO-ifying (or getting taken down) the very litter-web sources it depends on. Mitigations: keep it anonymous / non-indexed / community-scale (chan model, §8.1), or accept constant replenishment (§2.3: ~50B pages, +2.5%/yr decay).
- Whether a methods-only forum is compelling enough as a *browse* experience vs. the findings board — likely targets researchers, not casual browsers.
