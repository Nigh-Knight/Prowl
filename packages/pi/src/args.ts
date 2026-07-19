// Token-based argument parser for `/prowl search` flags.
//
// Uses strict token-by-token matching instead of substring search so that
// `--reader` does not accidentally enable `--read` (Issue 1 / Q5).

export interface ParsedProwlArgs {
  /** The search query (all non-flag tokens joined back together). */
  query: string;
  /** When true, run EXTRACT (Firecrawl) on a bounded set before SYNTHESIZE. */
  readMode: boolean;
  /** When true, emit structured stage telemetry. */
  debug: boolean;
}

/**
 * Parse `/prowl search <rest>` into its structured components.
 *
 * Flags (`--read`, `--debug`) are consumed as distinct tokens. Everything
 * else is treated as part of the query string, preserving word boundaries.
 * This prevents substring corruption (e.g. `--reader` does NOT enable read
 * mode).
 */
export function parseProwlArgs(args: string): ParsedProwlArgs {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  let readMode = false;
  let debug = false;
  const rest: string[] = [];

  for (const tok of tokens) {
    if (tok === "--read") { readMode = true; continue; }
    if (tok === "--debug") { debug = true; continue; }
    rest.push(tok);
  }

  return { query: rest.join(" "), readMode, debug };
}
