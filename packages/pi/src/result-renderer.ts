// Custom TUI entry renderer for Prowl search results.
//
// Renders entries written by pi.appendEntry("prowl-result", {query, summary, sources})
// as a normally-styled, durable transcript entry with themed colors.
//
// Pattern: entry-renderer.ts:13-17 — Box + theme.fg("accent", ...) + theme.bg("customMessageBg", ...)

import { Box, Text } from "@earendil-works/pi-tui";

/**
 * Minimal theme surface needed by the renderer. Mirrors pi’s theme.fg()/theme.bg()
 * signature so the adapter stays decoupled from @earendil-works/pi-coding-agent internals.
 */
interface RendererTheme {
  fg: (color: string, text: string) => string;
  bg: (color: string, text: string) => string;
}

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
  pi.registerEntryRenderer("prowl-result", (...args: unknown[]) => {
    const entry = args[0];
    const theme = args[2] as RendererTheme | undefined;
    const data = (entry as { data?: unknown })?.data as
      | { query?: string; summary?: string; sources?: Array<{ title?: string; url?: string }> }
      | undefined;

    if (!data) return new Text("Prowl: no result data");

    // Build content lines (theme-agnostic).
    const lines: string[] = [];
    const push = (text: string) => { lines.push(text); };

    // Header
    push("Prowl Search Result");
    push("");

    // Query label
    push(`Query: ${data.query ?? "(unknown)"}`);

    // Separator
    push("\u2500".repeat(40));

    // Summary body
    const summary = data.summary ?? "(no summary)";
    const summaryLines = summary.split("\n");
    for (const line of summaryLines) {
      push(line || " ");
    }

    // Empty line before sources
    push("");

    // Sources header
    push("Sources:");

    // Sources list
    if (data.sources && data.sources.length > 0) {
      for (let i = 0; i < data.sources.length; i++) {
        const src = data.sources[i];
        const title = src?.title ?? "(no title)";
        const url = src?.url ?? "(no url)";
        push(`  ${i + 1}. ${title} \u2014 ${url}`);
      }
    } else {
      push("  (none)");
    }

    // If theme is available, build a styled Box with individual Text children.
    // The theme applies colors per-line: accent header, dim query, muted sources,
    // text body, and a background box via customMessageBg.
    if (theme) {
      const box = new Box(1, 1, (text: string) => theme.bg("customMessageBg", text));

      // Helper: get a line with a fallback for undefined
      const line = (idx: number): string => lines[idx] ?? "";

      // Header — accent color
      box.addChild(new Text(theme.fg("accent", line(0)), 0, 0));

      // Empty line
      box.addChild(new Text(" ", 0, 0));

      // Query label — dim color
      box.addChild(new Text(theme.fg("dim", line(2)), 0, 0));

      // Separator — dim horizontal line
      box.addChild(new Text(theme.fg("dim", line(3)), 0, 0));

      // Summary body — text color
      for (let i = 4; i < 4 + summaryLines.length; i++) {
        const l = line(i);
        if (l === "" || l === " ") {
          box.addChild(new Text(" ", 0, 0));
        } else {
          box.addChild(new Text(theme.fg("text", l), 0, 0));
        }
      }

      // Empty line before sources
      box.addChild(new Text(" ", 0, 0));

      // Sources header — muted color
      const sourcesIdx = 4 + summaryLines.length + 1;
      box.addChild(new Text(theme.fg("muted", line(sourcesIdx)), 0, 0));

      // Sources list — text color, numbered items
      const sourcesStartIdx = sourcesIdx + 1;
      for (let i = sourcesStartIdx; i < lines.length; i++) {
        box.addChild(new Text(theme.fg("text", line(i)), 0, 0));
      }

      return box;
    }

    // No theme — return plain text
    return new Text(lines.join("\n"));
  });
}
