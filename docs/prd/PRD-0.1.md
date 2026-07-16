# Prowl — PRD-0.1

> **Scope (v0.1):** everything needed to build `prowl-core` + `prowl-pi` (commands `search`, `query`, `chat`) on local SearXNG + Firecrawl. Non-technical / vision content is in [[litter-web]]; future-version scope is in [[roadmap]]; deployment / ops config is in [[search-scraper-setup]].

## Version: 0.1.0

## Status: Draft

## URL: https://prowl.moe

## Tagline: explore the Litter Web

---

# 1. Executive Summary

Prowl is an archaic search engine for systematically searching and synthesizing information from the **litter web** — the vast, indexable, non-commercial web that is buried by SEO, forgotten by mainstream search engines, or exists on platforms that Google/Bing de-prioritize.

Unlike general web search, Prowl is biased *away* from commercial, SEO-optimized content and *toward* the unfiltered, personal, archival, and discarded corners of the open web. It couples multi-engine, multi-language, multi-site search with a reasoning model to plan queries, analyze results, and synthesize findings.

**Prowl is a live, worldwide, cross-cultural listening post — not an Anglo-subset archive.** Meta-search engines aggregate *indexes* (Google + Bing + …). What does not exist anywhere is the aggregation of the **discarded / never-Western-indexed layer across languages** — Chinese OA preprints, Russian morphology-indexed science, Japanese J-STAGE/CiNii, Korean Naver blogs and cafés, plus the imageboards and personal sites. Prowl is the first thing that treats that cross-lingual litter layer as one searchable space. The litter web is not stale: it grows every second, so the "old personal web" category and a post uploaded two minutes ago are the same layer. Prowl is excavating the past *and* a firehose.

The curated, auditable, open worldwide-litter index that backs Prowl is itself a deliverable. Most people's "the web" is the Anglo subset with the rest stubbed out. Prowl does not stub it out.

---

# 2. Architecture Overview

### 2.1. Pipeline Architecture (Primitives + Per-Command Compositions)

Prowl does **not** use one monolithic pipeline for every command. Core defines a set of small **primitives (atoms)**, and each command *composes* the ones it needs, in the order its goal requires. This is what lets the same engine back every command registered in §10 without per-command branching — and what lets prowl-web and prowl-cli reuse the exact same pipelines.

**Primitives:** `PLAN` · `SCATTER` · `GATHER` · `EXTRACT` · `READ` · `SCHEMATIZE` · `SYNTHESIZE` · `PRESENT` · `REFLECT`

**Per-command compositions**:

| Command | Composition (primitives) | Grounded in |
| -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `search` | PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT | Berrypicking (Bates 1989) + Satisficing (Simon 1956) |
| `query` | READ → SYNTHESIZE → PRESENT | In-session context (last search results) |
| `chat` | PLAN/REFLECT → (SCATTER·GATHER·READ as needed) → SYNTHESIZE → PRESENT → REFLECT | Conversational Search (Radlinski & Craswell 2017) + ASK (Belkin 1982) |

Each composition is a **core pipeline**; adapters (prowl-pi, prowl-web, prowl-cli) only bind the primitives to I/O (§11).

### 2.2. Model Architecture

Prowl uses a single model (Qwen 3.6 plus, configurable via `models.config`) for all model interactions: query planning, content synthesis, and result presentation. The provider is configurable — Venice, OpenRouter, OpenCode, or any OpenAI-compatible endpoint.

### 2.3. Tool Architecture → Adapter Ports

Core does **not** call tools directly. It depends on **abstract ports** (§11) — `SearchPort`, `FetchPort`, `ScrapePort`, `ModelPort`, `StoragePort`, `CatalogPort`, `UserPromptPort`, `PresenterPort` — so any adapter supplies the implementation. The table below is the **prowl-pi adapter's** binding of those ports; it is *not* core:

| Port | prowl-pi implementation |
| ---------------------------- | ---------------------------------------------------- |
| `SearchPort` | `web_search` (via SearXNG) |
| `FetchPort` | `fetch_content` |
| `ScrapePort` | Firecrawl (Docker) |
| `ModelPort` | Venice / OpenRouter / OpenCode (configurable) |
| `StoragePort` | local fs |
| `UserPromptPort` | `ask_user` |
| `PresenterPort` | chat message |

Tool selection is an **adapter concern, not a core one**.

# 3. Search Methods

### 3.1. Search Engines

SearXNG is the meta-search layer (not a backend). The table below reflects live verification of queryability and independence. **Marginalia is English-only** — it contributes nothing to ZH/RU/ES/JA dorking.

| Engine | Primary Lang | Independence | Dork-Friendly | Queryability | Best For |
| ------------ | ------------ | ---------------------- | ----------------- | --------------------- | --------------------------------------- |
| Google | all | Primary | Yes | ✅ | Baseline |
| Bing | all | Primary | Yes | ✅ | Alt baseline (better ZH/RU) |
| Yandex | RU | Primary | Limited | ✅ | RU web (**Search only** — not Disk) |
| Sogou | ZH | Primary | Yes | ✅ live-fetched | Mainland ZH web (general; *not* WeChat) |
| Haosou / 360 | ZH | Primary | Yes | ✅ public | Mainland ZH triangulation |
| Mojeek | EN/ES | Truly independent | Yes | ✅ live-fetched | Independent EN/ES discovery |
| Brave | EN/ES | Primary (fallbacks) | Yes | ⚠️ 429 → instance/key | Independent EN/ES index |
| Qwant | EU/FR | Hybrid (own+EUSP+Bing) | Yes | ⚠️ supplemental | FR/EU view only |
| Marginalia | EN only | Independent | Yes (special ops) | ✅ but EN-only | Core EN litter-web |
| Wiby | EN | Independent | No | ✅ | Vintage web |
| Startpage | all | Meta (Google proxy) | Yes | ✅ | Private Google |
| DuckDuckGo | all | Meta (Bing proxy) | Yes | ✅ | Private Bing |
| searchmysite | EN | Independent | Yes | ✅ | Small-biz/indie EN |
| Naver | KO | Primary | Yes | ✅ live-fetched | Korean web + blogs/cafés |
| Mail.ru | RU | Historical independent | Limited | ✅ live (optional) | RU supplemental |

**Live curl test (2026-07-14, US server):** Naver, Sogou, Mail.ru, Marginalia, Mojeek, Wiby confirmed reachable and returning real search results. `site:` and `inurl:` operators verified on Naver and Sogou. **Baidu** (CAPTCHA wall), **Yandex** (zero response), **Haosou/360** (redirect failed) inaccessible from this server — may require SearXNG deployment in-region or VPN. See [[query-variations]] §2 for per-operator live-test statuses.

**Engine notes:** `sogou` and `360search` are verified ZH essentials. Naver has no native SearXNG backend and requires a `json_engine` (Naver openapi) or `xpath` scrape configuration.

### Marginalia Special Operators

`year<2010` / `year>2005` (temporal), `q<3` (low JS), `tld:edu` / `tld:ru` (domain filter), `format:html123` (old HTML), `-special:tracking` / `-special:scripts` / `-special:affiliate` (filter noise), `rank>50` (high rank), `site:example.com` (domain-specific).

### Search Engine Dork Operators (verified techniques)

| Engine | Dork operators / technique |
| --- | --- |
| Google / Bing / Startpage / DDG | `site:`, `filetype:`, `intitle:`, `inurl:`, `"…"`, `-`, `OR`, `*` |
| Yandex (Search, not Disk) | `site:`, `mime:` (filetype), `lang:ru` (ISO), `date:YYYYMMDD`, `inurl:`, `intitle:`, `"..."`, `-`. **[PRIMARY-DOC-VERIFIED]** + **[LIVE-TESTED via SearXNG]** — 14 docs returned. |
| Sogou | `site:` **[LIVE-TESTED]**; `intitle:`, `inurl:`, `filetype:`, `"…"`, `-` (WeChat needs API → deep-web). Chinese query results JS-rendered. |
| Haosou / 360 | `site:`, `filetype:`, `intitle:`, `inurl:` **[LIVE-TESTED via SearXNG]** — 7 docs returned, top hit 知乎. Workable ZH search engine. |
| Mojeek | Google-like: `site:`, `filetype:`, `intitle:`, `inurl:`, `"…"`, `-`; independent EN/ES |
| Brave | Google-like: `site:`, `filetype:`, `intitle:`, `inurl:`, `"…"`, `OR`, `*` |
| Qwant | `site:`, `filetype:`, `intitle:`, `inurl:`, `"…"`, `-` (hybrid/supplemental) |
| Marginalia | own ops above (EN-only) |
| Naver | `site:`, `inurl:`, `intitle:`, `filetype:`, `before:` (all **[LIVE-TESTED]** via curl); `"..."`; blogs/cafés need `site:blog.naver.com` / `site:cafe.naver.com` dorks |
| Wiby | browse-only, no operators |
| Mail.ru | standard operators (optional RU) **[LIVE-TESTED]** — reachable via curl; `site:` and `lang:` work. Returns 222KB Russian results page. |

### 3.2. Site-Specific Dorking Categories

Every target below was verified to return **actual hosted content** via `site:` dorking (not just a landing page). Legend: ✅ content-verified.

**File Hosts** (direct `site:` dork — verified working)
- `files.catbox.moe`, `mediafire.com`, `pixeldrain.com` (`/u/`), `lanzou.com` (🇨🇳)

**Paste / Code Platforms**
- EN: `pastebin.com`, `rentry.co`, `gist.github.com`, `paste.ee`, `pastecn.com`, `paste.jp`, `pastecode.ru`, `justpaste.it`
- 🇨🇳 `gitee.com`, `csdn.net`, `cnblogs.com`, `gitcode.net`
- 🇰🇷 `velog.io` (tech/dev)

**Personal Web / Blogs**
- EN: `livejournal.com`, `blogspot.com -year:2020`, `neocities.org`
- 🇨🇳 `jianshu.com`, `lofter.com`, `cnblogs.com`, `csdn.net`, `blog.sina.com.cn`, `blog.51cto.com`, `blog.chinaunix.net`
- 🇷🇺 `diary.ru`
- 🇯🇵 `note.com`, `hatenablog.com`, `ameblo.jp`, `fc2.com`
- 🇰🇷 `tistory.com`

**Chan / Imageboard Archives**
- EN: `archived.moe` (⚠️ Cloudflare), `desuarchive.org`, `nyafuu.org`, `warosu.org`, `4plebs.org`, `arch.b4k.co`, `lainchan.org`, `8chan.moe`, `endchan.net`
- 🇷🇺 `2ch.hk`

**Forums**
- EN: `inurl:"viewforum.php?f="`, `inurl:"showthread.php"`, `"Powered by phpBB"`, `"Powered by vBulletin"`, `"Powered by XenForo"`, **`"Powered by Discuz!"` / `"Powered by PHPWind"`** (cover CN forums)
- 🇨🇳 `v2ex.com`, `nga.cn`, `kafan.cn`
- 🇷🇺 `pikabu.ru`, `rutracker.org` (torrents)
- 🇪🇸 `forocoches.com`, `meneame.net`
- 🇯🇵 `5ch.io`
- 🇰🇷 `dcinside.com`, `ruliweb.com`, `clien.net`

**Video** (⚠️ most video hosts are `site:`-duds like sendvid — discovery only): 🇷🇺 `rutube.ru` · 🇯🇵 `nicovideo.jp` · global `youtube.com`

**Open Directories:** `intitle:"index of" mp4/pdf KEYWORD`, `inurl:downloads intitle:"index of"`, `intitle:"index of /" inurl:ftp`

> **File-host strategy (3 tiers):** (1) direct `site:` dorks on plaintext hosts above; (2) **dedicated meta-indexes** for encrypted/JS hosts — `mega.nz`→Meawfy, `bunkr.is`→Bunkr Search, multi-host→AutoFileSearch/LinkFinder/SearchFiles/FindFiles.net (see §3.4); (3) open-directory dorks for the rest.

> **EXCLUSION (duds / dead / deep-web — not litter web):** `mega.nz` (→Meawfy), `gofile.io`, `sendvid.com`, `send.cm`, `bunkr.is` (→Bunkr Search), `axfiles.net`, `file4go.net`, `hastebin.skyra.pw` (dead), `anonfiles.com` (defunct), `lanzoub.com` (defunct), `qiwi.gg` (defunct); deep-web: `disk.yandex.ru`, `yadi.sk`, `terabox.com`, `mp.weixin.qq.com` (WeChat), `pan.baidu.com`, Quark/Aliyun/115, PanSou/Upanso, `arhivach.org`, `forum.ru`, `hispachan.org`.

### 3.3. Multi-Language Search

This section is **dork targets per language**. The *engine* layer (Sogou/Haosou for ZH, Yandex for RU, Naver for KO, etc.) is defined in §3.1. Route `site:` dorks through the matching regional engine (Baidu/Sogou for ZH long-tail; Google/Bing for major platforms).

**Chinese (engines: Sogou, Haosou):** `site:zhihu.com`, `site:tieba.baidu.com`, `site:douban.com` + translated keywords
**Russian (engine: Yandex, Google):** `site:livejournal.com` (RU), `site:pikabu.ru`, `site:rusmedserv.com`
**Spanish (engines: Google, Bing, Mojeek, Brave):** `site:foro.memesmedicos.com`, `site:infotiti.com`
**Japanese (engines: Google, Bing):** `site:5ch.net`, `site:medley.jp`, `site:ch.net`
**Korean (engine: Naver):** `site:blog.naver.com`, `site:cafe.naver.com`, `site:terms.naver.com`

### 3.4. Dedicated Content Indexes

Verified, publicly queryable indexes. Method = how Prowl reaches them. Deep-web/login-gated sources excluded (see note).

| Source | URL | Lang | Content | Method | Status |
| ------------------- | ------------------------------------ | ----- | ----------------------- | ---------------------------- | ------------------------------- |
| PubMed | pubmed.ncbi.nlm.nih.gov | EN/+ | Medical papers | Site | ✅ |
| Google Scholar | scholar.google.com | all | Academic lit | Site | ✅ |
| Internet Archive | web.archive.org | all | Historical pages | CDX API | ✅ |
| Meawfy | meawfy.com | — | Mega.nz files | Direct search | ✅ (meta) |
| Erowid | erowid.org | EN | Drug vaults | Site | ✅ |
| Arquivo.pt | arquivo.pt | PT | Web archive | Scrape | ✅ |
| SciELO | scielo.org | ES/PT | OA full-text journals | Site/API | ✅ ADD |
| Redalyc | redalyc.org | ES/PT | OA full-text journals | Site | ✅ ADD |
| CyberLeninka | cyberleninka.ru | RU | OA RU science | Site | ✅ |
| eLibrary / RSCI | elibrary.ru | RU | RU discovery (mixed) | Site | ✅ ADD |
| Dialnet | dialnet.unirioja.es | ES | Bibliography (mixed FT) | Site/JS | ✅ |
| J-STAGE | jstage.jst.go.jp | JA | JA science | **API (verified, 759 hits)** | ✅ |
| CiNii | ci.nii.ac.jp | JA | JA academic | OpenSearch API | ✅ ADD |
| NDL Search | ndlsearch.ndl.go.jp | JA | JA catalog | API | ✅ ADD |
| ChinaXiv | chinaxiv.org | ZH | OA sci preprints | Site/JS | ✅ ADD |
| paper.edu.cn | paper.edu.cn | ZH | OA sci/eng | Site/JS | ✅ ADD |
| pssxiv.cn | pssxiv.cn | ZH | OA preprints | Site/JS | ✅ ADD |
| Bunkr Search | bunkr-search.cc / bunkrsearch.com | — | Bunkr albums | Direct search | ✅ ADD (meta) |
| AutoFileSearch | autofilesearch.com | — | Multi-host files | Direct search | ✅ ADD (meta) |
| LinkFinder | linkfinder.org | — | Deep file links | Direct search | ✅ ADD (meta) |
| SearchFiles | searchfiles.de | — | Mega/Mediafire/4shared | Direct search | ✅ ADD (meta) |
| FindFiles.net | findfiles.net | — | Files by type | Direct search | ✅ ADD (meta) |
| FilePursuit | filepursuit.com | — | Open directories | RapidAPI/Scrape | ✅ |
| OpenDirectoryFinder | github.com/expde/OpenDirectoryFinder | — | Open dirs | Scrape | ✅ ADD (meta) |
| Anna's Archive | annas-archive.gl | multi | Shadow-lib meta | Scrape | ⚠️ meta only, unreliable for ZH |

> **Excluded (deep-web / login):** CNKI, Wanfang, VIP/CQVIP (full-text login). Use ChinaXiv/paper.edu.cn/pssxiv for open ZH scholarship instead.

### 3.5. Temporal Depth Strategy

| Query Type | Strategy |
| ----------------------- | ---------------------------- |
| Current trends | last30days + current year |
| Long-standing condition | All time, weighted 2000-2020 |
| Recent phenomenon | Last 5 years |
| Historical reference | Pre-2005 |
| Obscure knowledge | No filter |

---

# 4. Orphan Detection (from CCS 2021)

When Prowl finds a promising domain, it applies orphan detection:

1. Query `https://web.archive.org/cdx/search/cdx?url=example.com/*&output=json&fl=original,timestamp`
2. Returns all historically crawled pages on that domain
3. For each found URL, check if it currently returns 200 or is indexed
4. Pages in archive but returning 404 or unindexed are orphaned — potentially valuable abandoned content

Apply to: personal domains with irregular posting, old forum archives, file host URLs that returned content historically.

It is also applied automatically during `SCATTER`.

---

# 5. Query Planning & Variation Generation

**How-to reference → [[query-variations]]:** When forming queries, the planner MUST consult [[query-variations]] as the *how* — it is the per-engine × per-language variation reference and few-shot bank that fills every stance/surface slot (§3.1–§3.4). This PRD specifies *what* to vary; [[query-variations]] specifies *how* to emit each variation natively per target language.

### 5.1. Variation Dimensions

The eight dimensions below are a **stance taxonomy** — they describe *what kind of angle* to take on a query. They are **slots, not English templates**. Each slot is filled differently per language using that language's native register, genre, platform idiom, and script (Layer 2). The planner (.1, Qwen) emits each variation **natively per target language**; it does **not** generate in English and machine-translate. The per-language / per-engine *filling* of every slot lives in [[query-variations]] (§3.4), which is the few-shot bank the planner consults.

**Research status (Perplexity pass, 2026-07-13):** the slots are sound *product-design dimensions* but are **not empirically validated cross-cultural facts** — treat them as optional query angles, not cultural rules. Each carries a **[VERIFIED / PARTIALLY VERIFIED / UNVERIFIED]** tag in [[query-variations]]. Scope is the **established 6** (ZH, RU, JA, KO, ES, PT); planned languages are deferred (see [[roadmap]] §1).

### Layer 1 — Stance dimensions (language-neutral slots)

| Dimension | Slot meaning |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formal | Direct, neutral rewordings; encyclopedic / academic register |
| Forum-style | Native posting conventions of the target forum/platform (see Layer 2 — platform-native idiom) |
| Personal Experience | First-person self-report genre ("tried X for Y"); filled with each language's native self-narrative idiom, which varies by platform |
| Negative Framing | Failure / alternatives-after-failure angle |
| Colloquial | Everyday register, not specialist terminology; **dialect-tagged per language** (Layer 2) |
| Related Concepts | Broader adjacent topics |
| Domain-Specific | Community-specific terminology |
| Skeptical Framing | Contrarian angle — generic retrieval slot (criticism, controversy, limitations, alternatives). **[UNVERIFIED as a cultural rule]** — do *not* encode "ZH = 西医-vs-中医", "RU = anti-establishment", "Anglo = overmedicalization" without topic/corpus/community-specific sourcing (Perplexity). |
| Source/Community Identity | *Where/among whom* a term is used (platform, profession, region, subculture) — backed by `site:` (Google/Bing). **[PARTIALLY VERIFIED]** safe fallback: `site:` + neutral target-language topic. |

### Layer 2 — Linguistic-surface dimensions (language-dependent; the missing half)

These are the dimensions the English-only list had no concept of. They are what make multilingual retrieval actually reach the native-discourse layer instead of the English-indexed sliver. Each is parameterized per (language, platform) in [[query-variations]]. **Verification status of each (VERIFIED / PARTIALLY VERIFIED / UNVERIFIED) now lives in [[query-variations]] §1.2 — several recall-effect claims below were downgraded from assumption to UNVERIFIED pending benchmark evidence.**

| Dimension | What it controls |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Script / Transliteration | ZH: 汉字 + 拼音 + English brand + slang abbrev. RU: Cyrillic **and** Latin (`психоз` vs `psikhoz`). Searching only the English name misses the native layer. |
| Dialect / Region | ES: Castilian / MX / AR (voseo) / CO. PT: BR / PT. ZH: Mandarin / Cantonese (粵語) / TW. Colloquial must be dialect-tagged or it is wrong. |
| Code-switching | Macaronic queries mixing native + English technical term (ZH tech boards leave "depression" in English; LatAm mixes English slang). Test as a candidate and score vs pure-native/pure-English; status **[UNVERIFIED—do not claim outperformance]** (see [[query-variations]] §1.2). |
| Orthographic Variant | ZH simplified↔traditional (大陆/台灣/香港); JA shinjitai/kyujitai; KO spacing. Preserve where corpus/region requires; tokenization-split claims are **[UNVERIFIED]** (see [[query-variations]] §1.2). |
| Politeness / Community Register | JA keigo, KO jondaetmal/banmal — signals *which community* is addressed, not just formality. |
| Platform-native Idiom | 4chan greentext ≠ Tieba 吧-post ≠ Naver café-post ≠ 5ch ワイ/名無し. Your "forum-style" slot, made per-(language, platform). |
| Era / Calendar Anchor | For temporal variation (§5.2): Japanese 令和/平成/昭和, Chinese 朝代/事件 anchors (非典时期 = SARS = 2003), Hijri, etc. |

### 5.2. Temporal Detection

Temporal intent and temporal *matching* are both multilingual and must not be anchored to English lexemes or Anglo regulatory cadence. Four surfaces:

**Research status:** document-relative time = **[VERIFIED]** IR rule; multilingual intent + era/event anchors = **[PARTIALLY VERIFIED]**; Naver date operators = **[UNVERIFIED—removed]** pending primary-source verification (see [[query-variations]] §2/§3).

1. **Multilingual intent detection.** Temporal triggers ("recent / new / latest") exist per language — 最近 (ZH), недавно (RU), 最近/最近 (JA), 최근 (KO), reciente (ES), recente (PT). The planner detects temporal intent in the *user's question in any supported language*, not English only.
2. **Era / event anchoring (not just ISO).** A hard "pre-2005" cutoff is meaningless when a user anchors to "the 平成 era" or "SARS period." Support era/event anchors per language (§3.1 Layer 2, [[query-variations]]): Japanese 令和/平成/昭和, Chinese 朝代 + event anchors (非典时期, 文革), Hijri for AR, etc. The planner maps these to date ranges.
3. **Per-engine enforcement.** The *operator* that realizes a temporal intent differs per engine — Google `before:/after:` **[OSINT-REPORTED]** (live test returned EMPTY — likely not functional); Yandex `date:` **[VERIFIED]** + **[LIVE-TESTED via SearXNG]**; **Naver `before:` — [LIVE-TESTED]** (works via SearXNG, 15 docs); Naver `fromYYYYMMDDtoYYYYMMDD` — **REMOVED as a Naver-native operator** (third-party SERP API only); Bing freshness **[VERIFIED for retired Web Search API]** (API retired Aug 2025). Full per-engine table + statuses in [[query-variations]] §2.
4. **Document-relative + result-content matching.** (a) Temporal markers in *result content* are in the result's language, not the query's — match 最近 / недавно / 최근 inside results too. (b) Time is **document-relative**: a 2008 archived thread saying "最近" means 2008, not 2026. This is acute for Prowl's Internet Archive / dead-forum layer. Anchor temporal matching to each document's own date.

**Culturally-relative "emerging."** "Emerging treatment → last-5-year" assumes an Anglo FDA ~5-year approval cadence. It is wrong cross-culturally: TCM approaches have continuous native discourse over *centuries*; Russian preprint culture has its own rhythm. Bucketing by Western regulatory rhythm defeats the cross-cultural listening-post thesis. Treat "emerging" as a *soft* recency weight, not a hard 5-year gate, and apply per-language discourse baselines from [[query-variations]].

### 5.3. Adaptive Re-Planning

After initial results, the planner evaluates within the current session: **coverage gaps** (did the results answer the question? if not, retry with different angles), **promising leads** (a result mentions a term or source you didn't search for — generate new variations targeting that), **dead ends** (that angle went nowhere — drop it and redistribute effort to the working angles). No cross-session memory or RAG is needed — the planner evaluates what's in its current context and decides whether to loop back for another round.

### 5.4. Query Variation Reference & Control

**External reference doc (research-gated):** [[query-variations]] is the per-engine × per-language variation reference and few-shot bank. As of the 2026-07-13 Perplexity research pass, every operator/idiom/era claim carries a **[VERIFIED / PARTIALLY VERIFIED / UNVERIFIED—DO NOT EMIT]** label. Unverified items — notably Naver date operators and all platform-native idioms — are **quarantined** and must not be emitted as rules until sourced + integration-tested. It makes §5.1 Layer 2 and §5.2 enforcement concrete for the established 6 languages. **The planner (§5.1) consults this doc to emit native variations; §5 defines the dimension contract, §5.1 executes it.**

**Division of labor (clarified):**
- **§5.1 = specification ("how to vary").** Owns the two-layer dimension model and the per-language surface rules — language-neutral stance slots + language-dependent linguistic-surface dimensions.
- **§5.1 = emission ("actually emit it").** Qwen fills each slot with *native* idiom per target language, constrained by [[query-variations]] few-shot examples. This is an explicit **translation / emission phase** between planning (§5) and search execution — given its centrality to the cross-cultural thesis, it is a first-class pipeline stage, not an afterthought.
- Qwen emits natively (option B): it does **not** generate English variations and machine-translate. Register fidelity for the hardest pairs (Tieba 吧, 5ch ワイ, Naver café, DCinside) is protected by the few-shot bank; region-native models may be used for the lowest-fidelity pairs.

**Configurable count:** Default is 8-12 variations per language, user-configurable via `settings.json`. On command, the planner can generate N more: "generate 20 more."

**User input > AI:** User-supplied variations take highest priority. The planner merges: `[user variations] + [AI variations]`. If a user explicitly adds "site:4chan.org magnesium experiment", that is used before any AI-generated variation.

# 6. Analysis & Synthesis Methodology

### 6.1. Source Classification

Each result classified by: content type (personal account, forum discussion, academic paper, file link, article, blog post), authority tier (raw personal = highest, commercial = lowest), language.

### 6.2. Cross-Source Pattern Detection

Convergence (same claim across independent sources), divergence (contradictory experiences), evolution (how discussion changed over time), cultural variation (different approaches across languages/countries).

### 6.3. Consistency Verification

Cross-engine parity (same obscure result from multiple engines = more likely valid), cross-platform username correlation, temporal consistency (claims persisting without being debunked).

---

### 7.1. Search Mode (default)

**Search Mode (quick):** SearXNG → snippets → Venice synthesizes. Firecrawl is NOT used — snippets are sufficient for a quick answer.

```
/prowl search "magnesium orotate experiences"
 SearXNG only → returns synthesized findings from snippets
```

Pipeline (primitives): PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT

Grounded in:
* Berrypicking (Bates 1989)
* Satisficing (Simon 1956)

### 7.2. Chat Mode (Exploratory Conversation)

A conversational research interface for under-specified or evolving needs. Unlike search (one-shot, satisficing), chat is an interactive loop where the user steers and the need clarifies through dialogue.

```
/prowl chat "I keep seeing references to magnesium but I don't even know what question to ask"
```

**Pipeline (primitives):** `PLAN/REFLECT → (SCATTER · GATHER · READ as needed) → SYNTHESIZE → PRESENT → REFLECT`

**Grounded in:**
- **Conversational Search** (Radlinski & Craswell 2017) — models chat as information interaction with an explicit agent action space; practically implementable.
- **ASK model** (Belkin 1982) — needs arise from an *anomalous state of knowledge*; users cannot pre-specify what they need, so the system must help them articulate it through interaction. Maps to the `REFLECT` primitive (the pi adapter's `ask_user` tool).

### 7.3. Query Mode (follow-up)

A focused follow-up command that reads the **last search's results** (already in the conversation context) and synthesizes a specific answer. No new search is performed — it digs deeper into what was already found.

```
/prowl search "magnesium orotate"
 → results returned
/prowl query "what dosages were mentioned?"
 → reads those results, answers specifically
```

**Pipeline (primitives):** `READ → SYNTHESIZE → PRESENT`

**Grounded in:** conversational follow-up — the same context used by `chat`, but focused on a single directed question rather than open-ended exploration.

### 8.1. Extraction Stack

Prowl uses a two-layer architecture: **SearXNG** for discovery (finding URLs) and **Firecrawl** for extraction (reading content). They are complementary layers, not competitors — SearXNG finds, Firecrawl reads.

It is a one-off litter-web search. Results are returned and synthesized.
### 8.2. Architecture

```
Prowl Agent (pi extension)
 |
 +-- 1. Plan queries (Qwen)
 |
 +-- 2. Scatter to SearXNG (Docker)
 | +-- GET /search?q=site:pastebin.com "magnesium"&format=json
 | +-- Returns: URLs + snippets from 279 engines
 |
 +-- 3. Extract content (Firecrawl Docker, conditional)
 | +-- POST /v1/scrape
 | +-- Returns: clean markdown of selected URLs
 |
 +-- 4. Synthesize (Qwen)
 | +-- Reads snippets and full markdown
 | +-- Returns: findings + suggestions
 |
 +-- 5. PRESENT (chat message)
```

### 8.3. Query Format

SearXNG receives dork-style queries:

```
GET /search?q=site:pastebin.com "magnesium" migraine&format=json&engines=google,bing,marginalia
```

Firecrawl receives URLs for extraction:

```
POST /v1/batch_scrape
{
 "urls": ["https://pastebin.com/abc123", "https://archive.4plebs.org/x/thread/12345"],
 "formats": ["markdown"]
}
```

### 8.4. Negative Search / Exclusion Phase

Before running litter-web searches, Prowl performs a **negative search** to identify and exclude SEO-optimized surface-web content.

**Rationale:** The litter web is defined by what it is NOT — not the top-ranked, commercially-optimized results. By querying mainstream SEO engines (Google, Bing via SearXNG) for a topic, we surface exactly the sites to DISREGARD. This is faster than manually curating a blocklist and adapts per-topic.

**Process:**
1. SearXNG queries the previously listed search engines for the topic (SEO engines only)
2. Top 20-50 results collected → these are the "surface web" for this topic
3. Domains extracted → added to exclusion list
4. Exclusion list applied to all subsequent litter-web searches

**Application methods:**
- **SearXNG hostnames plugin** `remove`: Blocks excluded domains at engine level
- **Dork exclusions**: `-site:spamsite.com` appended to queries
- **Post-filter**: Remove blocklisted domains from results after search

**Example:**
```
Negative search: SearXNG ?engines=google,bing "magnesium alternatives"
 -> top results: healthline.com, webmd.com, mayoclinic.org (SEO slop)
 -> exclusion list: [healthline.com, webmd.com, mayoclinic.org]

Positive search: SearXNG ?engines=marginalia,yandex "magnesium orotate forum"
 + exclude: healthline.com, webmd.com, mayoclinic.org
 -> returns litter-web results only
```

**Global vs topic-specific:**
- **Topic-specific**: Sites ranking for this query (rebuilt per topic)
- **Global**: Sites that are SEO slop across all topics (healthline, webmd, etc.) — persisted across sessions in the site catalog (§11)

**Nuance:** Not all top-ranked sites are useless. Genuinely authoritative sources (Wikipedia, PubMed, arXiv) may rank highly but provide value. The exclusion list should target **commercial/SEO-optimized slop**, not authoritative references. Optionally, a whitelist preserves known-good top results. This complements the `high_priority` boost — we both boost the good and exclude the slop.

---

### 9.1. Search Planner (Qwen)

**Role:** Generate query variations, translate to multiple languages, plan searches from video content.

**Inputs:**
- Research question (text)
- Optional video URL (Qwen watches frames for planning only)

**Outputs (emission stage — see §5.4):**
- 8-12 query variations **per language, emitted natively** (not MT-from-English), one per §3.1 Layer-1 stance slot, each filled with the target language's Layer-2 linguistic surface (script/transliteration, dialect, code-switch, orthographic variant, politeness, platform idiom) per [[query-variations]].
- Languages: **core** ZH, RU, JA, KO, ES, PT
- The planner consults [[query-variations]] as its few-shot bank for native-idiom fidelity on the hardest (language, platform) pairs.

# 10. pi Extension Architecture

Prowl lives as a pi extension at `~/.pi/agent/extensions/prowl/`:

```
prowl/
+-- index.ts # Main extension entry point
+-- searxng-client.ts # SearXNG API client (find URLs)
+-- firecrawl-client.ts # Firecrawl API client (extract content)
+-- dork-planner.ts # Query variation generation (uses uncensored model)
+-- site-catalog.ts # Living catalog of litter-web sites
+-- package.json # Dependencies
```

### Registered Commands

| Command | Description |
| --------------------------------- | -------------------------------------------- |
| `/prowl search <query>` | One-off litter-web search |
| `/prowl query <question>` | Query the last search's results for a deeper answer |
| `/prowl chat <query>` | Conversational, exploratory research (§7.2) |

### Registered Tools (for LLM use)

- `prowl_search` — callable by the LLM when the user asks a litter-web research question.
- `ask_user` — callable by the agent when clarification is needed mid-research (e.g., "Which sites should I prioritize?", "Refine this query?"). Based on rpiv-pi's `ask_user` tool.

### Event Hooks

- `tool_call` — intercept `prowl_search`, plan queries, scatter to SearXNG, collect, synthesize
- `session_shutdown` — persist session state

> These Registered Tools and Event Hooks are the **prowl-pi adapter's** implementations of the core ports defined in §11. Core itself depends only on the port abstractions, never on pi tools.

---

# 11. prowl-core Interface Contract

prowl-core is environment-agnostic: it depends on **abstractions (ports)**, never on pi tools, a browser, or a terminal. Each adapter (prowl-pi, prowl-web, prowl-cli) implements the ports and binds the command surface to its I/O. This is why adding web/cli later requires **no new pipelines** — only new port implementations. (§10's Registered Tools and Event Hooks are the pi adapter's port implementations, not core's.)

### 11.1. Ports

| Port | Responsibility | prowl-pi | prowl-web | prowl-cli |
|------|----------------|----------|-----------|-----------|
| `SearchPort` | multi-engine search | **SearXNG** client (`searxng-client.ts`) | SearXNG HTTP | SearXNG HTTP |
| `FetchPort` | URL → content | `fetch_content` | HTTP fetch | HTTP fetch |
| `ScrapePort` | JS-render extraction | Firecrawl | Firecrawl | Firecrawl |
| `ModelPort` | reasoning/synthesis | **provider-agnostic** — Venice, OpenRouter, OpenCode, or any OpenAI-compatible endpoint | same | same |
| `StoragePort` | data read/write | local fs `~/.prowl/data` | DB / object store | local fs |
| `CatalogPort` | site catalog | `site-catalog.ts` | namespaced DB table | `site-catalog.ts` |
| `UserPromptPort` | `REFLECT` / clarification | `ask_user` | chat prompt | stdin prompt |
| `PresenterPort` | `PRESENT` rendering | chat message | JSON / HTML | stdout / markdown |

### 11.2. Multi-Tenancy (Namespace)

A `tenantId` is threaded through `StoragePort` and `CatalogPort` from the first call. prowl-pi and prowl-cli use a default single tenant (`"local"`); prowl-web maps `tenantId` to a real user account. **Core must never assume a single local user or a fixed filesystem path** — all stored state is keyed by `tenantId`, so prowl-web does not require a retrofit.

For the local adapters the `tenantId` is just a constant — no functional multi-tenancy is needed today. The value of threading it **now** is that the seam exists in every port signature, so prowl-web can later switch to real per-user partitioning (and the marketplace's owner/access model) without refactoring core. The partitioning logic itself is deferred to the web adapter.
