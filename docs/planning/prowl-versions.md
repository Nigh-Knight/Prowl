#### Notes

- Prowl = **prowl-core** (engine) + **adapters** (pi extension, web, cli, sandbox)
- core is environment-agnostic: knows nothing about pi / browser / terminal
- adapters are thin: translate input → core calls, core output → environment render
- Deployment split: Vercel (frontend) can't run Docker. Use Cloud Run / Fly / Railway (scale-to-zero) for SearXNG + Firecrawl when hosted.
	- v0.1 runs everything LOCAL. No web yet. Learn the tools before deploying.

---

### Version 0.1 — Local and EccoMuse specific (pi-only)

**Goal:** Prove the core engine works on your machine with a pi adapter before touching web.

**Stack:**
- `prowl-core` — TypeScript library (no Python yet)
- `prowl-pi` — pi extension adapter (`~/.pi/agent/extensions/`)
- Local Docker: SearXNG + Firecrawl (your machine)
- **Single model:** Qwen (for both planning and synthesis)

**What it does:**
- `/prowl [command] "topic"` → SearXNG finds URLs → Firecrawl extracts → Qwen model synthesizes → returns summary + 3-5 sources

**v0.1 scope (no forward references):**
- No deep-dive mode, no wiki, no Grok, no pi-remembers, no bounded loops, no DSPy
- Prowl-core + prowl-pi only: commands `search`, `query`, `chat`
- All future features (deep-dive, wiki, Grok, pi-remembers, loops, DSPy, web/cli adapters) are version 0.2+

**SearXNG multi-engine verification results (2026-07-16, via Azure proxy):**

| Engine | Status | Yield | Notes |
| --- | --- | --- | --- |
| Yandex | ✅ PASSED | 14 docs | Russian results confirmed. Operators [PRIMARY-DOC-VERIFIED] + [LIVE-TESTED]. |
| 360search | ✅ PASSED | 7 docs | Top hit 知乎. Working ZH search engine. |
| Google | ✅ PASSED | 31 docs | Baseline confirmed. Operators [PRIMARY-DOC-VERIFIED] + [LIVE-TESTED]. |
| Naver | ✅ PASSED | 13 docs | Korean results confirmed. Operators [LIVE-TESTED] reconfirmed. |
| Mail.ru | ✅ PASSED | 10 docs | Russian supplemental confirmed. |

**SearXNG verification complete (2026-07-16).** All SearXNG-testable engines have been verified. Only item left is Firecrawl-dependent:
- [ ] **Sogou operators with Chinese queries via headless browser (JS-rendered) — needs Firecrawl (v0.2+)**

**Commands to be implemented**:
* `/prowl search <query>`
* `/prowl query <question>`
* `/prowl chat <query>`

Implement all primitives. Some will have empty implementations in v0.1 (e.g., `EVALUATE`, `PERSIST`, `ADD_SITE`, `LINT`).

---

### Version 0.2 — Deep-Dive, Wiki, Grok, pi-remembers

**Goal:** Add deep-dive research, persistent wikis, Grok synthesizer, pi-remembers RAG, and bounded loops.

**Stack changes from v0.1:**
- **Grok 4.2** added as Content Synthesizer (alongside Qwen Search Planner)
- **Deep-dive mode** with Karpathy-style wikis (ingest → page → index → lint)
- **pi-remembers** integration for cross-topic RAG
- **Bounded research loops** (`/prowl loop`) with tiered model routing
- **DSPy** for structured prompting and pipeline composition
- Full primitives: `EVALUATE`, `PERSIST`, `ADD_SITE`, `LINT` enabled
- All commands enabled: `deep-dive`, `loop`, `lint`, `add-site`, `orphan`, `share`, `fork`, `export`, `config`, `status`

Add error handling through prompting, for when a site doesn't go through or something else internally.

---
### Version 0.3 — R-Pi as Personal VPS

**Goal:** Move SearXNG + Firecrawl off your main system onto an always-on Raspberry Pi, so you don't have to spin up Chrome locally all the time.

**Stack changes from v0.1:**
- SearXNG → Docker on R-Pi (always-on, your LAN)
- Firecrawl → Docker on R-Pi (Chromium runs there, not your workstation)
- `prowl-core` unchanged — just reads `SEARXNG_URL=http://pi-local-ip:8080` from env
- Still pi-first, but core now reaches the Pi over LAN

**Why R-Pi works for v0.3:**
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