# Prowl `/search` — Observed Issues and Research Questions

## Test context

These observations come from manually running the current Prowl v0.1.0
`/prowl search` command.

Primary test query:

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

Secondary test query:

```text
/prowl search "find me sites that showcase the designs i want to be able
to find sites that showcase styles from the late 2000s and 2010s, sites
that use, but not exclusively sites that use frutiger aero and metalheart"
```

The intended product role is an internal EccoMuse research tool for finding
historical web UI styles, aesthetics, personal sites, music-web culture, and
implementation/design references. Results should support real exploration,
not simply provide generic contemporary inspiration links.

---

# Confirmed observations

## Issue 1: Final results visually resemble model reasoning

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

The final answer should render as a normal, readable assistant response:
white/default text, clear headings, concise findings, and a source list.

It should not visually resemble hidden reasoning, an internal progress state,
or a muted/thinking panel.

### Actual behavior

The final search output is rendered in a gray/muted style that resembles model
thinking rather than a completed response.

### Scope

- Mode: Normal search
- Reproducibility: [fill in after another run: always / sometimes / once]
- Evidence: [attach screenshot or paste a short output excerpt if possible]

### Research questions

1. Which Pi rendering API/channel/component is used for the final Prowl result?
2. Is Prowl accidentally writing the completed result to a reasoning,
   progress, diagnostic, or muted output channel?
3. What rendering API should Prowl use for a normal final assistant answer?
4. Is the gray styling controlled by Prowl, Pi, or the terminal/theme?

### Acceptance criteria

- Completed `/prowl search` results display in the normal final-response style.
- Diagnostic/progress output, if retained, is visually distinct from the final
  answer and does not replace it.
- No internal reasoning text is presented as the user-facing result.

---

## Issue 2: Result sets lack breadth, depth, and source diversity

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

Results should explore the query through multiple relevant and distinct paths.

For this query, useful variety could include:
- Actual Neocities or other personal/fansite examples
- Independent music blogs or webzines
- Articles or archives discussing personal-web aesthetics
- Historical web-design references
- Design-community discussion only when it materially adds context
- Source-specific leads that enable further exploration

The output should not be dominated by generic design inspiration pages,
one platform, one domain, or one narrow interpretation of the query.

### Actual behavior

The search returned fewer sources than desired and the sources did not provide
enough breadth, depth, or distinctive exploration for the goal.

### Scope

- Mode: Normal search
- Reproducibility: [fill in]
- Evidence: [paste returned sources/output]

### Research questions

1. How many raw results does SearXNG return for a Prowl search?
2. How many results are retained, removed, ranked, or passed to synthesis?
3. Are query variations generated before search, or is only the literal user
   query sent to SearXNG?
4. Which engines are queried for this command, and which engines actually
   contribute results?
5. Does the current implementation use only one SearXNG call, one engine, or
   a bounded set of top results?
6. Is result diversity currently measured by domain, source type, aesthetic
   category, query variation, or engine?
7. What is the smallest in-scope change that would improve breadth without
   turning v0.1.0 into a large research-agent system?

### Acceptance criteria

- Prowl exposes or logs enough information to determine raw-result count,
  selected-result count, queries issued, and contributing engines.
- Search output contains meaningfully different domains and source types where
  the available results permit it.
- A single platform, domain, or aesthetic does not dominate unless the user
  explicitly asks for it.

---

## Issue 3: Duplicate and same-domain results are not removed

### Command

```text
/prowl search "find me sites that showcase the designs i want to be able
to find sites that showcase styles from the late 2000s and 2010s, sites
that use, but not exclusively sites that use frutiger aero and metalheart"
```

### Expected behavior

Prowl should identify and suppress:
- Exact duplicate URLs
- Near-duplicate URLs
- Repeated pages from the same domain when they add little new value
- Search-result pages, discussion pages, or mirrors that merely repeat the
  same underlying reference

The source list should maximize useful variety. One domain may have more than
one result only when each page makes a clearly different contribution.

### Actual behavior

The output repeated or heavily clustered around Frutiger Aero Archive-related
pages. The user requested Frutiger Aero and Metalheart, but the result set
overrepresented Frutiger Aero and did not sufficiently explore the broader
request.

Observed source pattern, abbreviated:

```text
1. Frutiger Aero Archive - Aero Webring
2. What do you think about Metalheart? - Frutiger Aero Archive Forum
3. The Frutiger Aero Hub
4. Frutiger Aero Archive - Metalheart / Depthcore Wallpapers
5. Frutiger Aero Website Design - Pinterest
6. Frutiger Aero Archive - Neocities mirror/reference
7. Frutiger Aero Website - Pinterest
8. The Frutiger Aero Archive - Hacker News
```

### Research questions

1. Where in the pipeline are exact URL deduplication, canonical URL
   normalization, hostname/domain grouping, and near-duplicate detection done?
2. If those controls exist, why did these repeated or closely related sources
   survive selection?
3. Does the system retain top-ranked SearXNG results without a per-domain cap?
4. Does the model receive duplicate-heavy candidates and then reproduce them
   in the final output?
5. Does the planner split a multi-aesthetic request into balanced subqueries,
   such as one for Frutiger Aero and one for Metalheart?
6. What domain-diversity rule can be added without hiding legitimately useful
   multi-page sources?

### Acceptance criteria

- Exact duplicates never appear in final sources.
- Candidate URLs are canonicalized before selection where feasible.
- By default, no more than [choose 1 or 2] final results come from one root
  domain unless the user requests a domain-specific search.
- A multi-part query receives coverage across its named concepts rather than
  allowing one concept to consume the entire result set.
- The final source list makes clear why each selected source is distinct.

---

## Issue 4: Relevance filtering is insufficient

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

Each final source should have an identifiable relationship to the user’s
actual request. For this query, relevance should center on Neocities,
personal web, fansites, music-web culture, web design, or the specified
aesthetic context.

A source can be tangential if it helps discover a relevant community, term,
or historical lead, but Prowl should explain that connection.

### Actual behavior

A result about goth online groups from the 1980s to early 1990s was included:

```text
Info on goth online groups circa 80s to early 90s - Reddit
https://www.reddit.com/r/goth/comments/tonl0r/info_on_goth_online_groups_circa_80s_to_early_90s/
```

The connection to the requested topic was not clear.

### Research questions

1. Is source relevance currently assessed only through SearXNG rank/snippets,
   through a model, or both?
2. What candidate information is supplied to the model: title, URL, snippet,
   source domain, query variant, engine, or full page content?
3. Does the model explicitly reject candidates that fail the user’s request?
4. Is the final source list selected by code, by the model, or by a mixture?
5. Why did the cited Reddit result pass the current selection path?
6. Can Prowl implement a bounded relevance-reranking stage on retrieved
   candidates before synthesis?

### Desired behavior

For a bounded candidate set, Prowl should use the configured model to assess
whether each candidate materially serves the user’s request, using title,
URL, snippet, and query context.

This should be a structured selection/reranking step, not an unbounded
multi-agent loop. The model should be allowed to reject weak candidates,
identify duplicates, and label the reason a retained source is relevant.

### Acceptance criteria

- Each final source passes an explicit relevance check against the user query.
- Irrelevant sources are excluded or clearly labeled as tangential discovery
  leads.
- The system logs or can display the reason each final source was retained.
- Relevance filtering is bounded and cost-aware, using a limited candidate set
  rather than recursively evaluating every possible result.

---

## Issue 5: Pinterest was included despite being low-value for this task

### Command

```text
/prowl search "find me sites that showcase the designs i want to be able
to find sites that showcase styles from the late 2000s and 2010s, sites
that use, but not exclusively sites that use frutiger aero and metalheart"
```

### Actual behavior

Two Pinterest idea pages appeared in the final results:

```text
Frutiger Aero Website Design
https://www.pinterest.com/ideas/frutiger-aero-website-design/947896208184/

Frutiger Aero Website
https://www.pinterest.com/ideas/frutiger-aero-website/915409399331/
```

### Concern

Pinterest may occasionally be useful as a discovery lead, but it is usually
not a strong primary source for the actual sites, historical implementations,
or source-specific design analysis this search is meant to find.

### Research questions

1. Is Pinterest intentionally allowed, blocked, down-ranked, or unclassified?
2. Did it enter through a specific engine or query variation?
3. Did it receive a high rank because of keyword overlap, domain authority,
   lack of filtering, or model selection?
4. Should Pinterest be excluded by default, down-ranked, or retained only as
   a clearly labeled discovery lead?
5. Is this policy configurable by search intent?

### Acceptance criteria

- Pinterest does not consume scarce slots in a final research source list
  unless it adds unique value.
- If retained, Pinterest is labeled as a discovery/moodboard lead rather than
  evidence of an original web implementation.
- The source policy is explicit and testable.

---
---

## Issue 6: No visible search-in-progress state or streamed result

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

When `/prowl search` begins, Pi should immediately show that work is in
progress.

At minimum, the user should see a clear, persistent status indicator such as:

```text
Searching…
```

or:

```text
Searching SearXNG and selecting sources…
```

The final response should also stream into the terminal as it is generated,
or otherwise transition clearly from a working state into a completed result.

The status should be useful without exposing private model reasoning. It should
communicate high-level pipeline stages only, for example:

```text
Searching the web…
Found 34 candidates…
Removing duplicates and selecting diverse sources…
Writing findings…
```

### Actual behavior

After sending `/prowl search`, there is a noticeable period with no visible
feedback at all. The terminal appears idle: there is no spinner, progress
message, status line, partial response, or indication that Prowl is searching.

When the search finishes, the entire response appears all at once rather than
streaming in.

### User impact

This makes the command feel unresponsive or broken during slow searches.
Because Prowl may call SearXNG and a model, waiting without feedback creates
uncertainty about whether the command was accepted, is still running, or has
failed silently.

### Scope

- Mode: Normal search
- Reproducibility: [fill in: always / sometimes / once]
- Evidence: Screenshot `image-2.jpg` shows no visible in-progress state before
  the output appears.

### Research questions

1. Which stages of `/prowl search` can take noticeable time: query planning,
   SearXNG request, normalization, source selection, model synthesis, or
   final rendering?
2. Does the extension currently emit any progress events or status messages?
3. Which Pi APIs support transient status text, a spinner/progress indicator,
   or streaming output?
4. Is the model call configured as non-streaming, or is streaming available but
   not forwarded into Pi’s normal assistant-output channel?
5. Can Prowl provide high-level progress without displaying chain-of-thought,
   hidden prompts, internal ranking scores, or raw model reasoning?
6. What happens when a search fails or exceeds a timeout while a progress state
   is active? Is the user shown a clear error and recovery action?

### Acceptance criteria

- Within approximately one second of accepting `/prowl search`, Pi displays a
  visible “Searching…” or equivalent in-progress indicator.
- The indicator remains visible until Prowl returns a final result or a clear
  error state.
- The final result streams through the normal Pi assistant-response path where
  supported; if streaming is not feasible, Prowl clearly replaces the active
  status with the completed result.
- Progress messages expose only user-safe stage names, never hidden reasoning
  or chain-of-thought.
- Failures replace the working indicator with a visible, actionable error.

---

## Issue 7: The search command and final answer are not represented as a normal Pi conversation turn

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

A Prowl search should appear as a normal, legible Pi interaction:

1. The user’s command/prompt is visible in the session transcript.
2. Prowl’s final answer appears as a normal assistant response, using the
   regular response styling.
3. Sources appear as part of that final answer, once.
4. Progress or diagnostic output is clearly secondary and temporary.

Conceptually, the transcript should resemble:

```text
You:
 /prowl search "neocities music fansite design personal web aesthetic"

Prowl:
 [normal assistant-styled final response]

 Sources:
 1. ...
 2. ...
```

### Actual behavior

The command/prompt is not visibly represented as a normal user message in the
resulting Pi interaction.

The returned Prowl content appears as gray/muted text that resembles Pi’s
thinking, system, diagnostic, or non-final output rather than an assistant
answer. The result also contains two separate `Sources:` blocks: one compact
numbered URL list and one repeated title-plus-URL list.

### Evidence

- `image.jpg`: normal Pi interaction; the user-facing request and assistant
  response are visually distinct.
- `image-2.jpg`: Prowl output; the search result is gray/muted, lacks a visible
  user prompt/command turn, and duplicates the source listing.

### User impact

The search feels ephemeral and detached from the conversation rather than like
a real Pi command result. It is difficult to review what was requested, tell
where the answer begins, or treat the output as a reliable research record.

### Research questions

1. Does `/prowl search` register as a Pi command, write directly to a custom
   terminal renderer, or emit messages outside Pi’s normal conversation
   history?
2. Which message role/channel is used for:
   - the original command input,
   - progress output,
   - final synthesis,
   - source rendering?
3. Why is the final result routed to a gray/muted/thinking-like renderer
   instead of Pi’s normal assistant response renderer?
4. Why are sources rendered twice?
5. Is Pi suppressing the slash command from the visible transcript by design,
   or is Prowl bypassing the normal message/session API?
6. What is the correct Pi extension API for creating a visible user-facing
   command result without pretending that Prowl-generated text is user input?

### Acceptance criteria

- Each `/prowl search` run is represented in the active Pi transcript with the
  original search query visible.
- The final Prowl answer uses Pi’s normal final-assistant-response styling,
  not a muted, reasoning-like, diagnostic, or progress style.
- Sources are displayed once in a consistent readable format.
- Progress information is temporary and visually distinct from the final
  answer.
- The normal Pi conversation remains readable when multiple Prowl searches are
  performed.

---

## Issue 8: Prowl results are not persisted in the Pi session transcript

### Command

```text
/prowl search "neocities music fansite design personal web aesthetic"
```

### Expected behavior

A completed Prowl search should be retained in the current Pi session so that
the user can:

- Scroll back to review the query, findings, and sources
- Resume the session later and see prior Prowl searches
- Ask a follow-up based on a previous search result
- Preserve the result as part of the project’s research trail
- Use normal Pi session/history behavior

The desired persistence is **Pi session history**, not necessarily a new
Prowl database or a cross-session knowledge system.

### Actual behavior

The Prowl search result appears to be fully ephemeral. It is not retained as a
normal session turn or available after leaving/reopening the interaction.

The command, final response, and source list are therefore not reliably
present in session history.

### User impact

Prowl is intended for EccoMuse research and discovery. If search results do
not persist in the normal Pi session, the tool loses much of its value as a
research workflow: useful findings, URLs, and context can disappear after a
single run.

It also prevents a future lightweight follow-up workflow because later turns
cannot reliably refer to the prior result.

### Scope

This issue requests persistence in **the existing Pi session transcript only**.

It does not request:
- A database
- Cross-session semantic memory
- RAG
- A catalog/index of every past search
- A new `/prowl query` or `/prowl chat` feature
- Automatic scraping or storage of external pages

### Research questions

1. Where does Pi persist normal user and assistant messages for the active
   session?
2. Does Prowl currently use an ephemeral UI write/notification API rather than
   the API that creates persisted transcript entries?
3. Can a slash-command extension create a persisted assistant message or attach
   a durable result to the current session?
4. Is the user’s original `/prowl search` command intentionally excluded from
   session history, and if so, can the normalized search query be stored as
   durable metadata or visible transcript content?
5. What minimal change would preserve the query, final synthesis, and sources
   in the current Pi session without introducing persistent Prowl storage?
6. Does storing the result in Pi’s transcript create any token/context-size
   concerns, and should Prowl cap result length or retain a compact structured
   record?

### Acceptance criteria

- After a completed Prowl search, the active Pi session contains a durable
  record of:
  - the search query,
  - the final answer,
  - the final source list.
- Reopening or resuming the same Pi session preserves that record.
- A later Pi turn can reference the earlier Prowl result from ordinary session
  context, subject to Pi’s normal context-window behavior.
- Prowl does not require a separate database or cross-session memory layer to
  satisfy this issue.
- Failed or cancelled searches leave a clear persisted error/cancellation
  record rather than silently disappearing.

---

## Issue 9: `--read` returns sources that do not exist or cannot be read

### Command

```text
/prowl search --read "given the sites you suggested, are there any blog posts
on how to build sites in the web 2.0 era? like how to make logos in the web
2.0 era?

in addition im thinking of using vectorheart art too, find me sites with free
vectorheart art and free frutiger metro art too, all from the litter web"
```

### Expected behavior

`--read` should only present a source as a usable result after Prowl has
successfully verified that the URL exists and that the selected page can be
retrieved.

Because `--read` represents the “read the actual page” path, its standard
should be stricter than normal snippet-only search:

1. Prowl finds candidate URLs through SearXNG.
2. Prowl selects a bounded set of candidates.
3. Prowl attempts to fetch each selected URL through Firecrawl or the configured
   content-fetching path.
4. Prowl excludes URLs that are dead, unavailable, malformed, blocked, empty,
   unrelated after retrieval, or cannot produce usable content.
5. Prowl synthesizes findings only from successfully retrieved sources.

If a source cannot be read, it should not be cited as though Prowl examined it.

### Actual behavior

The `--read` search led to sites that do not exist at all, or could not be
opened/read as valid sources.

### User impact

This breaks trust in the core promise of `--read`. A source list that contains
dead or fabricated/unverified URLs is worse than a short list, because the user
may spend time trying to follow leads that Prowl did not actually validate.

This is especially damaging for EccoMuse research, where the goal is to find
real historical design references, tutorials, assets, and web artifacts.

### Scope

- Mode: `--read`
- Reproducibility: [fill in: always / sometimes / once]
- Evidence: [paste each invalid URL and what happened when you opened it]
- Distinguish if possible:
  - URL does not resolve / DNS failure
  - HTTP 404 or 410
  - Redirects to an unrelated page
  - Firecrawl retrieval failure
  - Empty or unusable extracted content
  - Source is real but does not support the generated claim

### Research questions

1. Does `--read` actually invoke Firecrawl or another fetcher for every final
   source, or does it sometimes fall back to SearXNG snippets?
2. At what point are URLs selected: before or after a successful fetch?
3. Does the code check HTTP status, final redirect URL, content type, extracted
   text length, or fetch errors before a URL enters the final answer?
4. When Firecrawl fails, does Prowl remove the source, retry it, use a fallback,
   or silently keep the original SearXNG result?
5. Can the model generate URLs that were never returned by SearXNG or never
   successfully fetched?
6. Are malformed URLs, stale SearXNG results, archive captures, and redirect
   chains normalized and validated correctly?
7. Can Prowl preserve a clear distinction between:
   - `Found in search results`
   - `Successfully read`
   - `Could not be read`
8. When too few valid pages remain after validation, does Prowl report that
   honestly rather than fill the final result with weak or invalid sources?

### Acceptance criteria

- Every source presented as a `--read` result was successfully fetched during
  that run.
- Every final URL has a successful final destination and usable extracted
  content, subject to explicit exceptions such as legitimate archive pages.
- Failed, dead, malformed, or empty sources are excluded from final citations.
- The final synthesis is grounded only in successfully retrieved content, not
  in unverified snippet text or model-invented URLs.
- If fewer than the desired number of readable sources survive, Prowl states
  that clearly and returns fewer sources rather than fabricating completeness.
- Optional debug output can show each source’s read status, final URL, and
  failure reason without exposing private model reasoning.

---

## Issue 10: Normal `/prowl search` can produce a response with no sources

### Command

```text
/prowl search "given the sites you suggested, are there any blog posts on how
to build sites in the web 2.0 era? like how to make logos in the web 2.0 era?

in addition im thinking of using vectorheart art too, find me sites with free
vectorheart art and free frutiger metro art too, all from the litter web"
```

### Expected behavior

Normal `/prowl search` may use SearXNG snippets rather than full-page reading,
but it should still return the sources that ground its answer.

At minimum, the output should include:

- A concise response to the request
- A final source list with titles and URLs
- A clear indication when few or no relevant sources were found
- No factual/design recommendation that appears to come from external research
  unless the corresponding sources are shown

If the query is too broad or contains several separate research tasks, Prowl
should still return the best available source set, transparently narrow the
scope, or ask the user to split the request. It should not silently provide an
uncited answer.

### Actual behavior

Running the same request without `--read` returned an answer with no sources.

### User impact

Without sources, the output is not useful as a research result. The user cannot
inspect the claimed tutorials, asset sources, historical references, or design
examples, and cannot distinguish searched evidence from model-generated
general knowledge.

### Scope

- Mode: Normal search, without `--read`
- Reproducibility: [fill in]
- Evidence: [paste the complete output, especially the missing source section]

### Research questions

1. Did SearXNG return zero results, or did results disappear later in the
   pipeline?
2. Was the request transformed into one or more search queries? If so, what
   exact queries were sent?
3. Did query planning fail because the request combines several tasks:
   - Web 2.0 site-building tutorials
   - Web 2.0 logo tutorials
   - Free Vectorheart assets
   - Free Frutiger Metro assets
   - Litter-web constraint
4. Does the normal-search renderer omit the sources section when candidate
   selection yields zero results, even if the model still writes a summary?
5. Is the model allowed to produce a substantive answer when no sources were
   successfully retrieved?
6. Is a source list being generated but dropped because of rendering,
   formatting, parsing, or session-output issues?
7. Does Prowl have a minimum evidence threshold before it can present a
   research-style answer?

### Acceptance criteria

- A normal search with at least one selected result always displays its sources.
- If no relevant sources are returned, Prowl says so plainly and does not
  present unsupported findings as researched conclusions.
- Prowl logs candidate counts through every stage: SearXNG returned,
  normalized, filtered, selected, and rendered.
- The final source section cannot disappear because of an output-formatting or
  parsing failure.
- The user can tell the difference between:
  - “No sources found”
  - “Sources were found but none passed relevance checks”
  - “A retrieval or rendering error occurred”

---

## Issue 11: The active model prompts are not observable or auditable

### Context

Prowl uses a configured model for some part of the search workflow, but the
current behavior makes it unclear what instructions the model receives and
which parts of the result are based on user input, SearXNG results, retrieved
page content, or model interpretation.

This is especially important because the search has shown:
- Irrelevant sources
- Duplicate/same-domain source clustering
- Dead or unreadable `--read` sources
- Source-free normal-search output
- A synthesis tone the user did not explicitly request

### Desired behavior

The user should be able to inspect the effective, sanitized prompt contract
that governs Prowl’s behavior.

This does **not** require exposing hidden model reasoning or API secrets. It
means making Prowl’s operational instructions inspectable, including:

- Search-planning prompt
- Source-selection/relevance prompt, if one exists
- `--read` source-validation prompt, if one exists
- Final-synthesis prompt
- Prompt variables and the structured source data supplied to each stage
- The exact queries generated and sent to SearXNG

### Actual behavior

The user does not know what prompt Prowl is operating on, what model stages
exist, or whether the final response is grounded in retrieved sources.

### Research questions

1. What exact system prompt, developer prompt, user prompt, and structured
   data are passed to the model for each stage of `/prowl search`?
2. Which model calls currently exist in normal search and in `--read` mode?
3. What is the configured model at each stage?
4. Which prompt controls:
   - Query generation
   - Candidate relevance and selection
   - Deduplication/diversity, if applicable
   - Full-page validation in `--read`
   - Final summary tone and structure
5. Can the model create claims or URLs not present in the structured candidate
   data it receives?
6. Can the final synthesis run when the evidence set is empty?
7. Are source URLs passed as structured records, or embedded unstructured in
   a large natural-language prompt?
8. Are prompts stored as maintainable versioned files, embedded strings, or
   built dynamically at runtime?

### Desired solution direction

Add a user-controlled, safe inspection mode such as:

```text
/prowl search --debug "..."
```

or:

```text
/prowl inspect last
```

The mode should show:

```text
- Effective search mode: normal or --read
- Model stages invoked
- Sanitized prompt templates or prompt identifiers/version
- Exact SearXNG queries issued
- Requested and contributing search engines
- Candidate counts at each stage
- Candidate URLs, with selection/rejection reasons
- Fetch/read outcomes in --read mode
- Final selected sources
```

It must never show:
- API keys
- Hidden chain-of-thought
- Private model reasoning tokens
- Sensitive configuration values

### Acceptance criteria

- The codebase contains a clear, inspectable definition of every model prompt
  used by `/prowl search`.
- The research artifact identifies the exact prompt text or template path for
  each current model call.
- The user can determine what model stages ran for a specific search.
- The user can inspect exact SearXNG queries and source-selection inputs using
  a safe debug mechanism.
- The final output can be audited back to the selected sources and retrieved
  evidence.
# Product and implementation questions

These are questions to answer through code inspection. They are not assumed
to be bugs until confirmed.

## Source retrieval

1. What exact queries are sent to SearXNG?
2. List the generated queries for each test run and identify whether they were user-written or model-generated.
3. Which SearXNG engines are requested?
4. Which engines responded and contributed final candidates?
5. What raw title, URL, snippet, engine, rank, and query-variation metadata
   is available for each candidate?

## Candidate selection

1. How are raw SearXNG results normalized?
2. How are sources deduplicated: exact URL, canonical URL, hostname, content,
   title similarity, or none?
3. How are candidates ranked?
4. Is there a per-domain cap?
5. Is there a per-aesthetic or per-subquery coverage check for multi-part
   requests?
6. Are known low-value domains blocked or down-ranked?
7. Is a model used to select or rerank sources? If so, what is its structured
   input and output?

## Synthesis

1. What exact system prompt and user prompt are supplied to the model for the
   final search summary?
2. What source data is included in that prompt?
3. Why does the current summary have its current tone?
4. Does the prompt require the model to distinguish confirmed source content
   from inference?
5. Does the prompt require concise, user-facing research findings rather than
   a “thinking” or process-like response?
6. How are source citations in the output linked back to selected candidates?

## Presentation

1. Which Pi output API/channel is used for progress, diagnostics, sources, and
   final synthesis?
2. Why is the final output gray/muted?
3. Can Prowl expose an optional `--debug` mode that shows queries, engines,
   candidate counts, dropped duplicates, and selection reasons without
   cluttering normal user-facing search output?

---

# Scope guard

This is a quality and observability pass for the current local Pi-first
EccoMuse research workflow.

Do not add `/prowl query`, `/prowl chat`, persistent storage, browser
automation, RAG, a public web UI, or an unbounded autonomous research loop.

Prioritize:
1. Correct final-result rendering
2. Observability of queries and candidates
3. URL/domain deduplication and diversity
4. Bounded relevance selection/reranking
5. Clear source-quality policy
6. Better source-grounded synthesis