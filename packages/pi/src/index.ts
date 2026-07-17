// prowl-pi — pi extension adapter for Prowl.
//
// Extension entry point: registers the /prowl command family and binds core
// ports to pi tools.
//
// Phase 2 spike proved pi command registration + argument parsing + rendering
// work end-to-end. Phase 4 promoted the spike's presenter into a reusable
// `presenterPort` factory (packages/pi/src/pi-ports.ts). Phase 6 wires the real
// behavior: `/prowl search <topic>` invokes the core `search()` composer
// (PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT) with the injected
// `searxngClient` (SearchPort), a model adapter bound to pi's active model (ModelPort),
// and `presenterPort` (PresenterPort). Snippets-only by default — no Firecrawl. Phase 7 adds
// `--read` evidence mode: when set, a bounded, diverse set (3–5 URLs) is
// extracted via `scrapePort` (ScrapePort) and its markdown flows into
// SYNTHESIZE. Firecrawl is never called unless --read is passed.

import { search } from "prowl-core";
import { presenterPort, type PiPresenterUi } from "./pi-ports.ts";
import { modelPortFromContext } from "./model-client.ts";
import { scrapePort } from "./firecrawl-client.ts";
import { searxngClient } from "./searxng-client.ts";

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
  pi.registerCommand("prowl", {
    description: "Prowl — litter-web metasearch. Try: /prowl search <topic>",
    handler: async (args: string, ctx: PiCommandContext) => {
      // Pi splits the command on the first space: `/prowl search hello` ->
      // name "prowl", args "search hello". The subcommand is the first token.
      const trimmed = args.trim();
      const spaceIdx = trimmed.indexOf(" ");
      const sub = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
      let rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

      if (sub !== "search") {
        ctx.ui.notify(
          "Prowl: only 'search' is wired. Try /prowl search <topic> (add --read for evidence mode).",
          "info",
        );
        return;
      }

      // Parse the explicit --read flag (evidence mode). Stays off by default so
      // Firecrawl is never called unless the user opts in.
      let readMode = false;
      const readFlagIdx = rest.indexOf("--read");
      if (readFlagIdx !== -1) {
        readMode = true;
        rest = (
          rest.slice(0, readFlagIdx) + " " + rest.slice(readFlagIdx + "--read".length)
        )
          .replace(/\s+/g, " ")
          .trim();
      }

      if (!rest) {
        ctx.ui.notify(
          "Prowl: provide a topic, e.g. /prowl search --read <topic>.",
          "info",
        );
        return;
      }

      const presenter = presenterPort(ctx.ui);
      try {
        // Core composer owns orchestration; adapters inject concrete ports.
        // Snippets-only by default; `scrape` is passed only when --read is set,
        // so the default path makes zero Firecrawl calls. The model adapter is
        // built from the live pi context so Prowl uses pi's active model.
        await search(
          { query: rest, readMode },
          {
            search: searxngClient,
            model: modelPortFromContext(ctx),
            present: presenter,
            scrape: readMode ? scrapePort : undefined,
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Prowl search failed: ${message}`, "error");
      }
    },
  });
}
