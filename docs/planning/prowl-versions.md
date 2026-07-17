#### Notes

- Prowl = **prowl-core** (engine) + **adapters** (pi extension, web, cli, sandbox)
- core is environment-agnostic: knows nothing about pi / browser / terminal
- adapters are thin: translate input → core calls, core output → environment render
- Deployment split: Vercel (frontend) can't run Docker. Use Cloud Run / Fly / Railway (scale-to-zero) for SearXNG + Firecrawl when hosted.
	- v0.1.0 runs everything LOCAL. No web yet. Learn the tools before deploying.
- **v0.1.0 scope:** the `/prowl search` vertical slice only (local, Pi-first, single-usr). Everything else is deferred past v0.1.0 — see the per-version notes and `v0.1-implementation-roadmap.md` §5.

---

### Version 0.1.0 — Local, Pi-first search slice

**Goal:** Prove the core engine works on your machine with a pi adapter — just the search command. This is the first shippable release and the only v0.1.x target. It is deliberately narrow: no `query`, no `chat`, no persistence, no public surface.

**Stack:**
- `prowl-core` — TypeScript library (no Python yet)
- `prowl-pi` — pi extension adapter (`~/.pi/agent/extensions/`)
- Local Docker: SearXNG + Firecrawl (your machine)
- **Single model:** Qwen (for both planning and synthesis)

**What it does:**
- `/prowl search <query>` → SearXNG finds URLs → (optional `--read`: Firecrawl extracts a bounded 3–5 URL set) → Qwen model synthesizes → returns summary + 3–5 sources

**v0.1.0 scope (search slice only):**
- `prowl-core` + `prowl-pi` only; command `search` (snippets default + `--read` evidence mode).
- No `query`, no `chat`.
- No persistent `StoragePort` / `CatalogPort` implementations (contracts defined, fs impl deferred).
- No negative-search / exclusion (PRD §8.4).
- No multilingual dork-planner expansion — v0.1.0 `PLAN` is a single-query Qwen stub.
- No deep-dive, no wiki, no Grok, no pi-remembers, no bounded loops, no DSPy, no RAG.
- No web adapter (`prowl-web`), no CLI adapter (`prowl-cli`).
- No browser-interaction automation.
- No public deployment.

**What's actually built so far (2026-07-17, groundwork for v0.1.0):**
- Docker stack (SearXNG `:8888` + Firecrawl `:3002`) verified running.
- `searxng-client` (`SearchPort`) and `firecrawl-client` (`scrape`) adapters working.
- `config.ts` scrape options.
- 7 core port *definitions* in `packages/core/src/ports.ts`.
- Multi-engine SearXNG verification (see below).
- **Not yet built:** Pi command registration (`index.ts` is still a stub), `ModelPort` / `PresenterPort` / `UserPromptPort`, the core `search` composer / pipeline, tests, and the Pi deploy. These are the v0.1.0 implementation work (see `v0.1-implementation-roadmap.md`).

**SearXNG multi-engine verification results (2026-07-16, via Azure proxy):**

| Engine | Status | Yield | Notes |
| --- | --- | --- | --- |
| Yandex | ✅ PASSED | 14 docs | Russian results confirmed. Operators [PRIMARY-DOC-VERIFIED] + [LIVE-TESTED]. |
| 360search | ✅ PASSED | 7 docs | Top hit 知乎. Working ZH search engine. |
| Google | ✅ PASSED | 31 docs | Baseline confirmed. Operators [PRIMARY-DOC-VERIFIED] + [LIVE-TESTED]. |
| Naver | ✅ PASSED | 13 docs | Korean results confirmed. Operators [LIVE-TESTED] reconfirmed. |
| Mail.ru | ✅ PASSED | 10 docs | Russian supplemental confirmed. |

**SearXNG verification complete (2026-07-16).** All SearXNG-testable engines have been verified. Only item left is Firecrawl-dependent:
- [x] **Sogou operators with Chinese queries via headless browser (JS-rendered) — needs Firecrawl (v0.1.0 `--read` path)** ✅ PASSED

v0.1.0 implements the search-relevant primitives (`PLAN`, `SCATTER`, `GATHER`, `SYNTHESIZE`, `PRESENT`, and `EXTRACT` under `--read`). It does **not** implement `EVALUATE`, `PERSIST`, `ADD_SITE`, or `LINT` — those belong to post-v0.1.0 versions that add persistence and wikis.

---

### Version 0.2 — Research depth (post-search-slice)

**Goal:** Build on the stable v0.1.0 search command. Add the remaining core commands and the
local-first capabilities they require — still Pi-first and local, no public surface yet.

**Stack changes from v0.1.0:**
- `/prowl query <question>` — needs `StoragePort` (last-results context) + `UserPromptPort`.
- `/prowl chat <query>` — needs `StoragePort` + `UserPromptPort` (`REFLECT` / `ask_user`).
- **Persistent `StoragePort` / `CatalogPort` (fs) implementations** — tenant-scoped, under `~/.prowl/`.
- **Negative-search / exclusion (PRD §8.4)** — SEO-engine exclusion list + whitelist survival.
- **Multilingual dork-planner expansion** — `dork-planner.ts` 8–12 variations across the core 6 languages.

**Out of scope for 0.2:** deep-dive/wiki/Grok/pi-remembers/loops (v0.3), web/CLI adapters and
public deployment (v0.4 / v1.0).

---

### Version 0.3 — Deep-Dive, Wiki, Grok, pi-remembers

**Goal:** Add deep-dive research, persistent wikis, Grok synthesizer, pi-remembers RAG, and bounded loops.

**Stack changes from v0.2:**
- **Grok 4.2** added as Content Synthesizer (alongside Qwen Search Planner)
- **Deep-dive mode** with Karpathy-style wikis (ingest → page → index → lint)
- **pi-remembers** integration for cross-topic RAG
- **Bounded research loops** (`/prowl loop`) with tiered model routing
- **DSPy** for structured prompting and pipeline composition
- Full primitives: `EVALUATE`, `PERSIST`, `ADD_SITE`, `LINT` enabled
- Commands enabled: `deep-dive`, `loop`, `lint`, `add-site`, `orphan`, `share`, `fork`, `export`, `config`, `status`

Add error handling through prompting, for when a site doesn't go through or something else internally.

---

### Version 0.4 — R-Pi as Personal VPS

**Goal:** Move SearXNG + Firecrawl off your main system onto an always-on Raspberry Pi, so you don't have to spin up Chrome locally all the time.

**Stack changes from v0.1.0:**
- SearXNG → Docker on R-Pi (always-on, your LAN)
- Firecrawl → Docker on R-Pi (Chromium runs there, not your workstation)
- `prowl-core` unchanged — just reads `SEARXNG_URL=http://pi-local-ip:8080` from env
- Still pi-first, but core now reaches the Pi over LAN

**Why R-Pi works for v0.4:**
- You already own it — $0 cost
- Always-on = no cold starts, instant search
- Personal use only (you're the only user) — home internet upload is fine
- Frees your main machine from Chromium RAM usage

**Caveats:**
- Pi RAM is limited (2-8GB) — keep Firecrawl concurrency low (1-2 parallel)
- Needs stable power + internet 24/7
- No static IP needed for personal LAN use; if you want remote access, use Cloudflare Tunnel
- **RAM optimization (later):** use `chromium-headless-shell` (Google's stripped Chromium, ~30% lighter than full) via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var. Requires building Firecrawl from source so the custom binary sticks. SSD swap remains the cushion regardless.

**Learning goal:** You learn how to deploy Docker to a Pi, manage always-on services, and point prowl-core at a LAN URL.

**Success criteria:** `/prowl search` works from your pi extension, hitting containers on the R-Pi — your workstation stays clean.

---

### Future

**DSPy analytics layer** — DSPy provides typed signatures for every model interaction, but more importantly it gives you a **live evaluation framework** to measure whether your query variations are actually working:

- **UniqueGain tracking:** DSPy modules generate variations per stance/surface dimension, run them against SearXNG, judge relevance, and compute `UniqueGain(v)` per slot. You see which dimensions contribute unique results on *today's* engines in *today's* languages — not what a paper predicted.
- **Variation optimization:** DSPy's `BootstrapFewShot` auto-tunes the few-shot bank in [[query-variations]] §8. Feed it topics, it generates variations, measures which patterns produce unique results, and keeps only the patterns that work. Dead dimensions get pruned automatically.
- **Dimension health dashboard:** Run the eval weekly. If a slot's UniqueGain drops to 0 for three consecutive weeks, the engine changed — you know to re-tune or drop it. This catches engine drift (Google deprecating operators, Baidu changing tokenization) without manual monitoring.
- **Loop-catching with DSPy Assertions:** Assert that every variation produces at least 1 unique relevant result. If an entire dimension fails assertion for a topic, the planner auto-adjusts — redistributes effort to working dimensions instead of wasting queries.
- **Model-agnostic:** The analytics pipeline runs the same regardless of whether you're using Qwen, Grok, or a local model. Switch models and the eval still works — you can compare which model produces better UniqueGain.

**Wiki + Karpathy Pattern**
- Automated wiki operations (ingest → page → index → lint)
- pi-remembers integration for cross-topic memory
- Deep-dive mode becomes the default research flow

**Web + CLI + Sharing**
- `prowl-web` full adapter (prowl.moe)
- `prowl-cli` standalone binary (for non-pi users, Feynman-style)
- Nekoweb deployment via share-builder
- Merchant of Record (Lemon Squeezy / Gumroad) for $5 sellable wikis

**v1.0 — Public Release + Real VPS**
- Buy prowl.moe domain (Porkbun, ~$13/yr)
- Deploy SearXNG + Firecrawl to a **RackNerd KVM VPS** (cheap annual: ~$10-25/yr = ~$1-2/mo equivalent)
  - https://www.racknerd.com/kvm-vps
  - Always-on, more RAM than Pi, serves public traffic
- All adapters stable (pi, web, cli)
- Marketplace live
- Documentation complete
