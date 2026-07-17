// prowl-pi — pi extension adapter for Prowl.
//
// Extension entry point: registers the /prowl command family and binds core
// ports to pi tools.
//
// Phase 2 spike proved pi command registration + argument parsing + rendering
// work end-to-end (only `/prowl search <topic>` is wired; it does NO real
// search or model work yet — it just echoes "registered: <topic>" via the
// presenter). The spike's `createSpikePresenter` was promoted to a reusable
// `presenterPort` factory in packages/pi/src/pi-ports.ts (Phase 4). Real
// behavior lands in later phases (search pipeline → 5/6, model client → 3).

import { presenterPort, type PiPresenterUi } from "./pi-ports.ts";

// Adapter port objects the minimal search handler injects. Real search/model
// behavior wires these into the core composer (Phase 5) once it lands.
export { modelClient } from "./model-client.ts";
export { searxngClient } from "./searxng-client.ts";
export { presenterPort } from "./pi-ports.ts";

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
      await presenter.present("registered: " + rest);
    },
  });
}
