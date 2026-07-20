// prowl-pi — pi extension adapter for Prowl.
//
// Extension entry point: registers the /prowl command family and binds core
// ports to pi tools.
//
// Phase 6 wired the real behavior: `/prowl search <topic>` invokes the core
// `search()` composer with `searxngClient` (SearchPort), a model adapter
// bound to pi's active model (ModelPort), and `presenterPort` (PresenterPort)
// using `pi.appendEntry()` for durable transcript entries. Phase 7 folds in
// engine bias via LITTER_ENGINES, the custom result renderer, token-based
// `--read`/`--debug` parsing, and a structured debug telemetry sink.

import { search, LITTER_ENGINES } from "prowl-core";
import type { TelemetryEvent } from "prowl-core";
import { presenterPort, type PiPresenterUi } from "./pi-ports.ts";
import { modelPortFromContext } from "./model-client.ts";
import { scrapePort } from "./firecrawl-client.ts";
import { searxngClient } from "./searxng-client.ts";
import { parseProwlArgs } from "./args.ts";
import { registerProwlResultRenderer } from "./result-renderer.ts";
import { createDebugSink } from "./debug-writer.ts";

// Minimal structural view of the pi host surface (registration API + command
// context). Deliberately avoids importing @earendil-works/pi-coding-agent so
// the adapter stays decoupled and type-checks without the pi package installed.
interface PiExtensionApi {
  registerCommand(
    name: string,
    opts: {
      description: string;
      handler: (args: string, ctx: PiCommandContext) => void | Promise<void>;
    },
  ): void;
  appendEntry(customType: string, data?: unknown): void;
  registerEntryRenderer(customType: string, renderer: (...args: unknown[]) => unknown): void;
}

/** Minimal command-context view: the UI render surface Prowl uses, plus the
 * active model + credential registry it needs to run synthesis through pi's
 * own model (see model-client.ts). At runtime pi passes the full context. */
interface PiCommandContext {
  ui: PiPresenterUi;
  model: { id: string; provider: string } | undefined;
  modelRegistry: {
    getApiKeyAndHeaders(model: { id: string; provider: string }): Promise<
      | { ok: true; apiKey?: string; headers?: Record<string, string> }
      | { ok: false; error: string }
    >;
  };
  signal?: AbortSignal;
}

export default function (pi: PiExtensionApi): void {
  // Register the custom entry renderer so that entries written by
  // appendEntry("prowl-result", ...) render as normally-styled, durable
  // transcript entries (not gray/muted, not ephemeral).
  registerProwlResultRenderer(pi);

  pi.registerCommand("prowl", {
    description: "Prowl — litter-web metasearch. Try: /prowl search <topic>",
    handler: async (args: string, ctx: PiCommandContext) => {
      // Pi splits the command on the first space: `/prowl search hello` ->
      // name "prowl", args "search hello". The subcommand is the first token.
      const trimmed = args.trim();
      const spaceIdx = trimmed.indexOf(" ");
      const sub = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

      if (sub !== "search") {
        ctx.ui.notify(
          "Prowl: only 'search' is wired. Try /prowl search <topic> (add --read for evidence mode).",
          "info",
        );
        return;
      }

      // Token-based --read / --debug parsing (no substring corruption — I1/Q5).
      const { query, readMode, debug } = parseProwlArgs(rest);

      if (!query) {
        ctx.ui.notify(
          "Prowl: provide a topic, e.g. /prowl search --read <topic>.",
          "info",
        );
        return;
      }

      // Bind the presenter to pi's appendEntry + ui.notify (Phase 6).
      const presenter = presenterPort(pi, ctx.ui);

      // Structured debug telemetry sink (--debug mode, Issue 6/11).
      const debugSink = debug
        ? ((() => {
            const sink = createDebugSink();
            return (event: TelemetryEvent) => {
              sink.write(event);
              // Also notify in-terminal for immediate visibility
              const counts = event.counts
                ? ` (${Object.entries(event.counts).map(([k, v]) => `${k}=${v}`).join(", ")})`
                : "";
              ctx.ui.notify(`[prowl:${event.stage}] ${event.detail}${counts}`, "info");
            };
          })())
        : undefined;

      try {
        await presenter.progress?.("Searching the litter web...");

        // Core composer owns orchestration; adapters inject concrete ports.
        // LITTER_ENGINES are passed as the default engine set (engine bias,
        // Issue 2). `scrape` is passed only when --read is set, so the
        // default path makes zero Firecrawl calls.
        await search(
          { query, readMode, engines: [...LITTER_ENGINES] },
          {
            search: searxngClient,
            model: modelPortFromContext(ctx),
            present: presenter,
            scrape: readMode ? scrapePort : undefined,
            debug: debugSink,
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Prowl search failed: ${message}`, "error");
      }
    },
  });
}