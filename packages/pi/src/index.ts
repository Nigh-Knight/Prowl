// prowl-pi — pi extension adapter for Prowl.
//
// Extension entry point: registers the /prowl command family and binds core
// ports to pi tools.
//
// Phase 2 spike proved pi command registration + argument parsing + rendering
// work end-to-end. Phase 4 promoted the spike's presenter into a reusable
// `presenterPort` factory (packages/pi/src/pi-ports.ts). Phase 6 now wires the
// real behavior: `/prowl search <topic>` invokes the core `search()` composer
// (PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT) with the injected
// `searxngClient` (SearchPort), `modelClient` (ModelPort), and `presenterPort`
// (PresenterPort). Snippets-only by default — no Firecrawl in this phase.

import { search } from "prowl-core";
import { presenterPort, type PiPresenterUi } from "./pi-ports.ts";

// Adapter port objects injected into the core composer (Phase 6). Imported
// for local use by the search handler; `presenterPort` is imported above.
import { modelClient } from "./model-client.ts";
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

/** Minimal command-context view: just the UI render surface Prowl uses. */
interface PiCommandContext {
  ui: PiPresenterUi;
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
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

      if (sub !== "search") {
        ctx.ui.notify(
          "Prowl: only 'search' is wired. Try /prowl search <topic>.",
          "info",
        );
        return;
      }

      const presenter = presenterPort(ctx.ui);
      try {
        // Phase 6: real vertical slice. Core composer owns orchestration;
        // adapters inject concrete ports. Snippets-only (no Firecrawl).
        await search(
          { query: rest },
          { search: searxngClient, model: modelClient, present: presenter },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Prowl search failed: ${message}`, "error");
      }
    },
  });
}
