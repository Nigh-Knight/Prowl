# Prowl — Litter Web (Vision & Non-Technical)

> **Scope (vision / non-technical):** non-technical, vision, and rationale content extracted from the PRD. The v0.1 technical build is in `PRD-0.1.md`; future-version scope is in `roadmap.md`; deployment config is in `search-scraper-setup.md`.

# 2. What is the Litter Web?

## 2.1 Definition

The litter web is the **indexable, publicly accessible web that is systematically ignored or under-prioritized by mainstream search engines.** It is:

- **Not the deep web** — content behind login walls, paywalls, or authentication
- **Not the dark web** — content requiring Tor or specialized routing
- **Not spam or malware** — content that is legitimate but unoptimized for discovery

The litter web exists on the same infrastructure as the commercial web. It is simply *discarded* — left behind by algorithm changes, platform shifts, and the relentless SEO-ification of search results. It is the **backrooms of the internet** — content that exists but isn't linked to, maintained, or optimized for discovery.

## 2.2 Why the Litter Web Exists

| Reason                           | Example                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| No SEO investment                | A personal blog with no keyword strategy                               |
| Platform abandonment             | LiveJournal, Angelfire, old phpBB forums                               |
| De-prioritized by search engines | File hosts like Catbox.moe, paste sites                                |
| Non-English content              | Chinese, Russian, Japanese, Korean, Spanish, Portuguese web (see §2.5) |
| Unstructured data                | Open directory listings, raw paste dumps                               |
| No commercial value              | A 2004 forum post about home remedies                                  |
| Platform architecture            | Chan archives, ephemeral paste sites                                   |
| Geographic restrictions          | Content on Baidu, Yandex                                               |
| Orphaned pages                   | Pages with no inbound links from anywhere                              |
| Link rot / digital decay         | Once-indexed content that fell out of index                            |

## 2.3 Scale: How Big is the Litter Web?

Based on Pew Research Center (2024) — "When Online Content Disappears":
- 25% of all webpages that existed between 2013-2023 are no longer accessible
- 38% of webpages from 2013 specifically are gone
- 54% of Wikipedia pages contain at least one dead reference link
- 23% of news webpages and 21% of government webpages contain broken links
- 18% of tweets disappear within 3 months of posting

Extrapolated estimate: If ~200 billion pages have ever been indexed by Google, and ~25% are now inaccessible, the litter web contains approximately **50 billion pages** — growing by roughly 2.5% of all content per year as pages decay.

## 2.4 Value Proposition

The litter web contains information that is: more honest (no commercial incentive), more detailed (personal accounts go deeper), more diverse (cultural and linguistic variety), more experimental (things people can't recommend officially), more preservative (old content still accurate), and historically layered (preserves context that commercial pages overwrite).

## 2.5 The Worldwide, Living Layer

The litter web is not an English archive with a foreign-language appendix. The non-Western, never-Western-indexed layer is the core of the product, not an edge case.

- **It is cross-lingual by design.** Prowl aggregates the discarded layer across Chinese (Zhihu, Tieba, Douban, ChinaXiv), Russian (LiveJournal, Pikabu, CyberLeninka), Japanese (5ch, J-STAGE, CiNii), Korean (Naver blogs/cafés, DCinside, RuliWeb, Clien), and Spanish/Portuguese (SciELO, Redalyc, Arquivo.pt, Dialnet) sources — plus the imageboards and personal sites that no regional engine promotes. See §5.3–§5.4 for the verified index.
- **It is live, not excavated.** The litter layer grows every second. A 2004 forum thread and a post uploaded two minutes ago sit in the same searchable space. Prowl's temporal strategy (§5.5) weights old content but never assumes new content is absent.
- **It is a listening post, not a museum.** Because the layer is worldwide and live, Prowl surfaces premature truths *as they are being discarded by the mainstream index* — e.g., querying Chinese medicine boards for TCM approaches to migraine before the magnesium consensus formed. The translation layer (§14.1) is what keeps "worldwide" from silently meaning "worldwide-but-English-shaped": the query planner must generate translated keywords per target language, or Prowl only ever searches the English-indexed sliver.

---

# 3. Academic & Investigative Precedents

Three research papers provide the academic foundation for Prowl. Each validates that the litter web is real, large, and unserved by existing tools.

## 3.1 UIS-Digger (Huawei, ICLR 2026)

**Full title:** "UIS-Digger: Towards Comprehensive Research Agent Systems for Real-world Unindexed Information Seeking"

**What it found:** Even the most capable AI agents (GPT-5, O3, Claude) drop from 70%+ accuracy on normal web benchmarks to ~24% on tasks requiring unindexed information. The litter web is a blind spot for everyone.

**Key contributions used by Prowl:**
- **Multi-agent architecture pattern:** Planner - Web Searcher - Web Surfer - File Reader. Prowl adapts this to Planner - Searcher - Synthesizer.
- **Formal definition of Unindexed Information (UI):** Information not directly retrievable from search engine snippets or one-step crawling of indexed pages.
- **Search strategy as a learnable skill:** The paper used synthetic QA pairs + rejection sampling to improve UIS capability.

**How Prowl uses it:** Prowl's pipeline architecture (plan - scatter - collect - analyze - synthesize - persist) directly mirrors and simplifies the UIS-Digger agent framework for the domain of personal-experience and non-commercial content discovery.

## 3.2 "Out of Sight, Out of Mind" (CCS 2021)

**Full title:** "Out of Sight, Out of Mind: Detecting Orphaned Web Pages at Internet-Scale"

**What it found:** There is a class of web pages that exist on servers but have zero inbound links from anywhere. These orphaned pages are significantly more vulnerable to security exploits and are nearly impossible to find via normal crawling since no crawl path leads to them.

**Key technique used by Prowl - Orphan detection:**
1. Find a promising domain through normal search
2. Query the Internet Archive CDX API for all historically crawled pages on that domain
3. Cross-reference against the current index to find pages that exist in the archive but not in any current index
4. These orphaned pages are the deepest litter — intentionally or accidentally abandoned content

## 3.3 Pew Research Center (2024) — "When Online Content Disappears"

**What it found:** The largest quantitative study of web decay ever conducted (see section 2.3 for statistics).

**How Prowl uses it:**
- **Chronological weighting:** Older content is more likely to be in the litter web. Prioritize pre-2015 content for long-standing topics.
- **Internet Archive as primary source:** Since 54% of Wikipedia references end up dead, the Wayback Machine is a first-class search target, not a backup.
- **Scale awareness:** ~50 billion pages and growing. Be strategic about targeting, not exhaustive.

## 3.4 Documented Case Studies

| Domain                 | Project                               | Litter Substrate                            | Discovery                                                                                          |
| ---------------------- | ------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| OSINT / Disinformation | Bellingcat "Wayback Google Analytics" | Archived site versions with historic GA IDs | Identified disinformation networks via shared analytics codes not visible on current sites         |
| OSINT / Forensics      | Bellingcat "Vacuuming Image Metadata" | Archived images from old snapshots          | Recovered EXIF metadata (GPS, timestamps) from images that were compressed or scrubbed on live web |
| Evidence Preservation  | Bellingcat auto-archiver              | Long tail of URLs archived pre-deletion     | Preserved 150,000+ pieces of online human-rights evidence before deletion                          |
| Web History            | "The Death of GeoCities" (2022)       | Archived GeoCities homepages                | Reconstructed platform eulogies and user narratives of a dead hosting service                      |
| Digital Humanities     | Arquivo.pt Geocities collection       | Rescued GeoCities corpus                    | Research on early web culture and grey literature                                                  |
| Cyber Threat Intel     | Predicting Enterprise Cyber Incidents | Under-indexed hacker forums                 | Predictive models of cyber incidents from forum social networks                                    |

**What Prowl learns:** The Bellingcat methodology (automated archiving, metadata extraction from old versions, analytics code cross-referencing) can be adapted for personal research. The Geocities work shows that "dead" platforms are research substrates, not nostalgia. Cyber threat research validates that under-indexed forums carry early signals of real-world events.

---

# 10. Why the Litter Web Is for Discovery, Not Just Archaeology

## 10.1 A Necessary Correction

The academic and OSINT literature (sections 3.1-3.4) often frames the litter web as an *archaeological* resource — useful for reconstructing the past but not for discovering the new. This framing is itself a product of surface-web bias: researchers who study the surface web naturally find litter-web use cases through that lens.

But the evidence in those same papers contradicts the framing. The cyber-threat intelligence paper showed that under-indexed hacker forums contained **predictive signals about future attacks** — new information about events that hadn't happened yet. Bellingcat discovered **actively hidden disinformation networks** — not historical artifacts but contemporary operations. Both are discovery, not archaeology.

The correction goes further than domain. The litter web is not only *contemporary* — it is *worldwide and live*. The discovery signal is not confined to the Anglo web; the discarded, never-Western-indexed layer (Chinese, Russian, Japanese, Korean, Spanish/Portuguese sources — §5.3–§5.4) is where premature truths surface first, because those communities publish outside the English-indexed consensus. Treating Prowl as an American-subset archive would miss the entire point: it is a cross-cultural listening post whose value is proportional to how much of the world's litter it actually reaches.

## 10.2 The Litter Web as a Time Capsule of Premature Truths

The litter web is full of ideas that were correct but arrived before the infrastructure, market, or culture was ready. These don't become "old news" — they become dormant, waiting for the moment when they're relevant again.

**Historical examples of premature truths that lay dormant in the litter web of their time:**

| Idea | First Proposed | Dormant Period | Re-emerged As | Key Figure |
|------|---------------|----------------|---------------|------------|
| Atomic theory | 5th century BCE (Democritus) | ~2,200 years | Modern chemistry (1800s) | Dalton |
| Heliocentric model | 3rd century BCE (Aristarchus) | ~1,800 years | Copernican revolution | Copernicus |
| Black holes | 1783 (John Michell) | ~200 years | General relativity confirmation | Einstein |
| Hypertext / two-way links | 1960 (Ted Nelson, Project Xanadu) | Ongoing | Modern web (partial) | Nelson |
| Digital cash / untraceable payments | 1980s (David Chaum, eCash/DigiCash) | ~25 years | Bitcoin / cryptocurrency | Chaum |
| Prediction markets ("Idea Futures") | 1988 (Robin Hanson) | ~20 years | Polymarket, Metaculus | Hanson |
| Neural networks / deep learning | 1980s-1990s (Schmidhuber, others) | ~20 years | Modern AI revolution | Multiple |
| The web as an application platform | 1995 (Ben Slivka) | ~10 years | Web apps, SaaS | Slivka |
| Mendel's genetics | 1866 (Gregor Mendel) | ~35 years | Modern genetics | Mendel |
| Continental drift | 1912 (Alfred Wegener) | ~50 years | Plate tectonics | Wegener |
| Horndeski's gravity theory | 1974 (Horndeski) | ~30 years | Modern cosmology | Horndeski |

Each of these existed as a paper, a blog post, a forum thread, or a prototype in the litter web of its era. They were not "old." They were **premature** — correct but unable to thrive because the surrounding ecosystem hadn't caught up.

## 10.3 What the Litter Web Holds Today

There are ideas in the current litter web that will be "new" in 10, 20, or 50 years. They exist now as:

- Old forum posts describing a technical approach before the hardware existed to run it
- Blog posts from 2005 predicting a technology trend that is only now becoming feasible
- Research papers that were peer-reviewed and published but never cited (sleeping beauties)
- Abandoned open-source projects whose core insight was correct but whose timing was wrong
- Personal accounts of medical experiments that worked but were never formally studied
- Startup ideas that failed not becuase the idea was wrong, but because the market wasn't ready
- Theories that were dismissed because they contradicted the consensus of the time

## 10.4 The Litter Web as Prediction Market

The internet moves in waves of public sentiment — what's interesting, what's fundable, what's culturally acceptable. The litter web records what was interesting *before* it became fundable or acceptable. This makes it a **historical prediction market** — a record of what people believed would matter, before the market confirmed or denied it.

Prowl's role is not just to excavate the past. It is to find **ideas that were right early** — whether they were right last year, twenty years ago, or two thousand years ago — and surface them in a context where they can be recognized as new.

This is doubly true across languages. A premature truth discarded by the English-indexed mainstream may still be live in a Chinese medicine board, a Russian science preprint, or a Korean café. Prowl's worldwide, living layer (§2.5) means the prediction market is global: the firehose is not the 2004 time capsule alone, but the worldwide litter being written right now.

## 10.5 Practical Implications for Prowl

The search strategy should not assume that older content is less valuable. In fact:

- **Pre-2010 blogs about AI** may contain foundational insights that were forgotten when the field moved elsewhere
- **2005 forum discussions about prediction markets** may describe mechanisms that are only now technically feasible
- **1990s cryptography papers** on ecash may contain design decisions that are relevant to modern decentralized systems
- **Personal health experiments from 2008** may describe treatments that research is only now beginning to validate
- **Chinese medicine boards on TCM migraine treatment** may describe approaches the magnesium consensus discarded or never indexed — queried directly, before the mainstream formed its view
- **Abandoned open-source projects from 2012** may contain architectural approaches that are novel again

Prowl should explicitly look for **dissonance between when an idea appeared and when it seems relevant.** If a forum post from 2004 describes something that sounds like it should have been written in 2024, that's a signal — not of old content, but of content that was ahead of its time.

---

### Section 10.2

The following table focuses specifically on cases where a discarded or premature idea directly led to a multi-billion-dollar industry or company. These are not intellectual curiosities — they are the strongest evidence that the litter web holds immense latent economic value.

| Idea | First Proposed | Dormant Period | Re-emerged As | Economic Impact |
|------|---------------|----------------|---------------|-----------------|
| Prediction markets ("Idea Futures") | 1988 (Robin Hanson) | ~30 years | Polymarket, Kalshi, Metaculus | Kalshi $2B+, Polymarket $500M+. Dismissed as gambling for decades. The core mechanism (information aggregation via financial incentives) was sound but legally and technically unworkable until modern blockchain + regulatory shifts. |
| Digital cash / blind signatures | 1980s (David Chaum, DigiCash) | ~25 years | Bitcoin, Ethereum, entire crypto industry | Peak crypto market cap ~$3T. Chaum's company filed for bankruptcy in 1998. His blind signature technology is the direct intellectual precursor to modern cryptocurrency. The idea was correct; the infrastructure (internet penetration, digital identity, cryptographic primitives) was not ready. |
| Relational database model | 1970 (Edgar Codd, IBM) | ~10 years | Oracle, SQL databases | Oracle alone ~$300B+ market cap. Codd's paper was treated as internal research at IBM and nearly shelved. Larry Ellison commercialized it after reading the paper. |
| Weak ties theory | 1973 (Mark Granovetter) | ~30 years | LinkedIn, social networking | LinkedIn acquired for $30B. A sociology paper about how people find jobs through acquaintances rather than close friends became the structural model for professional social networking. |
| Stealth aircraft theory | 1962 (Pyotr Ufimtsev) | ~20 years | F-117, B-2, modern stealth | ~$200B+ stealth aircraft industry. Ufimtsev's paper on diffraction theory was dismissed by the Soviet military. Lockheed used it to design the F-117 after finding the paper in a library. |
| Neural networks / deep learning | 1980s-1990s (Schmidhuber, Werbos, others) | ~20 years | Modern AI (NVIDIA, OpenAI, DeepMind, Google) | Trillions in market value. Foundational research on backpropagation, CNNs, vanishing gradients was largely abandoned in the "AI Winter" of the 1990s. Computing power caught up ~2012. |
| Class-based n-gram language models | 1992 (IBM Research) | ~20 years | Word embeddings, modern NLP, Renaissance Technologies | Renaissance Technologies ~$100B+ AUM. The same statistical rigor applied to language was applied to financial markets by the paper's authors. |
| Photophone (fiber optic communication) | 1880 (Alexander Graham Bell) | ~90 years | Fiber optics, internet backbone | Trillions in telecommunications infrastructure. Bell's device transmitted sound via light beams but was called "impractical." Modern fiber optics use the same principle. |
| Phonautograph (sound recording) | 1860 (Edouard-Leon Scott de Martinville) | ~150 years | Digital audio reconstruction, audio forensics | Sound recording industry ~$50B+. Scott's device recorded sound waves on paper but had no playback mechanism. Digital reconstruction in 2008 revealed recordings 17 years before Edison. |
| Unsupervised learning for classification | 2012 (Google / Jeff Dean) | ~5 years | Recommendation engines (Meta, ByteDance, Google) | Revenue in tens of billions from ad targeting. A paper on AI recognizing cats from unlabeled YouTube videos demonstrated unsupervised learning at scale, becoming foundational for modern recommendation systems. |

# 17. Use Cases Beyond the Litter Web

Prowl's architecture (find → extract → reason → structure → share) is domain-agnostic. Beyond exploring the litter web:

**Investigative:** OSINT/Bellingcat-style, legal discovery/FOIA, due diligence, journalism
**Medical/Health:** Rare disease research, real-world drug effects, alternative treatments
**Historical/Preservation:** Digital archaeology, genealogy, language preservation
**Business/Competitive:** Competitive intelligence, patent/prior art, alternative data/finance
**Academic/Creative:** Literature review, post-publication peer review, worldbuilding
**Personal:** Second brain, any topic accumulation

The share feature (§19) makes it collaborative — any domain where multiple people research the same thing benefits.

---

# 21. Business Model & Sustainability

Prowl is free, local-first, and open. Sustainability comes from three sources. This is the **decided model** — not a list of options.

## 21.1 Free Use (core)

- **Self-hosted**: SearXNG + Firecrawl via Docker (user's own infra)
- **Local wikis**: no cost, no account, no limits
- **Static share**: Nekoweb (free), in-browser LLM (no API cost)
- **Uncensored models**: user brings own Venice key (BYOK)

The entire core experience is free. No paywall, no tier, no account required.

## 21.2 Donations

Development sustained by community donations (Patreon, GitHub Sponsors, Ko-fi, crypto). Donors may get recognition in docs and optional roadmap voting — but donations are not required for any feature.

## 21.3 $5 Sellable Wikis

Users who build valuable deep-dive wikis (§12) can mark them **sellable** at a flat **$5**:

```
User builds wiki (deep-dive)
    -> Marks "sellable" ($5)
    -> Wiki listed in Prowl registry (static index)
    -> Buyer pays $5
    -> Gets wiki (download or fork on their own instance)
    -> Seller + platform split (e.g., 80/20)
```

**Why $5:**
- Low enough for impulse purchase of valuable research
- High enough to incentivize quality wikis
- Flat pricing = zero complexity

**Technical model:**
- Wikis are static (markdown + assets) — portable, no server
- Registry is a static index (list of wikis + payment links)
- Payment via Stripe / crypto / Buy-Me-A-Coffee (user's own link)
- No central hosting required — aligns with local-first philosophy (§13, §19)

**Virtuous loop:**
1. User builds wiki on topic X
2. Marks sellable ($5)
3. Others buy, build on it, sell their extensions
4. Knowledge compounds across people AND creates value exchange

This model keeps the core free and open while letting skilled researchers monetize their work. The $5 wiki marketplace is the only commercial layer — everything else is donation-supported or free.

---

# 22. Future Value Discovery (Concept Note)

**Vision:** The most valuable content in the litter web is the dormant idea — something proposed 10-30 years ago that is only now becoming feasible (§10.2). Prowl can be used to systematically find these premature truths.

**Dissonance scoring:** Measure the gap between when an idea first appeared and when it becomes relevant. High dissonance + recent resurrection signal = ripening opportunity.

**Polymarket integration:** Cross-reference Prowl findings with prediction markets. If Prowl finds early signals (dormant idea resurfacing) that has no market yet, that's an informational edge. If a market exists, Prowl's litter-web research can inform market outcomes.

**Idea rating (filtering signal from noise):**
- Credibility of proposer (anonymous forum vs known researcher)
- Feasibility at time of proposal vs feasibility now
- Market timing — is the window open?
- Resurrection momentum — recent activity around the idea

**Repeated trend cycles:** Ideas cycle every ~20-40 years. Identify the cycle length per category to predict the next iteration. Examples: prediction markets (1988→2018), digital cash (1980s→2009), neural networks (1980s→2012).

**Bet-to-test loop:** Use prediction markets as a validation mechanism before building. If litter-web research gives a betting edge and the bet wins, conviction is validated → build. If the bet loses, the research was wrong → saved months of wasted building.

*This section is a concept note — the full system for dormant idea discovery, dissonance scoring, and Polymarket integration is planned for a future major version.*

---

# 13.6 Why Not Cloud Exa/Firecrawl?

| Aspect | Cloud (Exa/Firecrawl) | Self-Hosted (SearXNG + Firecrawl) |
|--------|----------------------|--------------------------------------|
| Cost | $/query | $0 |
| Privacy | Data sent to vendor | Fully local |
| Censorship | Vendor filters apply | No filtering |
| Reliability | Depends on vendor uptime | You control it |
| Litter-web access | Vendor may block | You control engine list |

The self-hosted stack fully replaces Exa + Firecrawl cloud for $0 and full privacy.

