// Custom TUI entry renderer for Prowl search results.
//
// Phase 6: Registered via pi.registerEntryRenderer("prowl-result", ...) so that
// entries written by pi.appendEntry("prowl-result", {query, summary, sources})
// render as a normally-styled, durable transcript entry (not gray/muted, not
// ephemeral).

import { Text } from "@earendil-works/pi-tui";

/**
 * Register the "prowl-result" entry renderer with the pi host.
 *
 * @param pi - Structural view of the pi extension API surface needed for
 *   `registerEntryRenderer`. Accepts only the method we need so the adapter
 *   stays decoupled from @earendil-works/pi-coding-agent internals.
 */
export function registerProwlResultRenderer(pi: {
  registerEntryRenderer: (
    customType: string,
    renderer: (...args: unknown[]) => unknown,
  ) => void;
}): void {
  pi.registerEntryRenderer("prowl-result", (entry: unknown) => {
    const data = (entry as { data?: unknown })?.data as
      | { query?: string; summary?: string; sources?: Array<{ title?: string; url?: string }> }
      | undefined;

    if (!data) return new Text("Prowl: no result data");

    const parts: string[] = [];
    parts.push("Prowl Search Result");
    parts.push("");
    parts.push(`Query: ${data.query ?? "(unknown)"}`);
    parts.push("");
    parts.push(data.summary ?? "(no summary)");
    parts.push("");
    parts.push("Sources:");
    if (data.sources && data.sources.length > 0) {
      for (const src of data.sources) {
        const title = src.title ?? "(no title)";
        const url = src.url ?? "(no url)";
        parts.push(`  - ${title} (${url})`);
      }
    } else {
      parts.push("  (none)");
    }

    return new Text(parts.join("\n"));
  });
}
