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