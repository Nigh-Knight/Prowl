// prowl-pi — pi extension adapter for Prowl.
//
// Extension entry point: registers the /prowl command family and binds core
// ports to pi tools.
//
// Phase 2 spike: proves pi command registration + argument parsing + rendering
// work end-to-end. Only `/prowl search <topic>` is wired; it does NO real
// search or model work yet — it just echoes "registered: <topic>" via the
// presenter shim. Real behavior lands in later phases (search pipeline → 5/6,
// presenter adapter → 4, model client → 3).

import { createSpikePresenter, type SpikeCommandContext } from "./pi-spike.ts";
// Model adapter (Qwen via OpenAI-compatible endpoint). Wire into real
// pipeline phases once the core composer (Phase 5) is ready.
export { modelClient } from "./model-client.ts";

// Minimal structural typing for the pi host surface. We deliberately avoid
// importing from @earendil-works/pi-coding-agent so the adapter stays decoupled
// from pi internals (per architecture guidance) and type-checks without the pi
// package installed locally. The shapes mirror the documented ExtensionAPI /
// ExtensionCommandContext used by the spike.
interface PiExtensionApi {
  registerCommand(
    name: string,
    opts: {
      description: string;
      handler: (args: string, ctx: SpikeCommandContext) => void | Promise<void>;
    },
  ): void;
}

export default function (pi: PiExtensionApi): void {
  pi.registerCommand("prowl", {
    description: "Prowl — litter-web metasearch (spike). Try: /prowl search <topic>",
    handler: async (args: string, ctx: SpikeCommandContext) => {
      // Pi splits the command on the first space: `/prowl search hello` ->
      // name "prowl", args "search hello". The subcommand is the first token.
      const trimmed = args.trim();
      const spaceIdx = trimmed.indexOf(" ");
      const sub = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

      if (sub !== "search") {
        ctx.ui.notify(
          "Prowl spike: only 'search' is wired. Try /prowl search <topic>.",
          "info",
        );
        return;
      }

      const presenter = createSpikePresenter(ctx);
      await presenter.present("registered: " + rest);
    },
  });
}
