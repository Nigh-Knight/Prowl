// Phase 2 spike: minimal presenter shim.
//
// Binds the pi host render surface (ctx.ui.notify) discovered during the spike.
// This proves the PresenterPort seam end-to-end against the real pi UI without
// pulling in any search/model work. A fuller PresenterPort adapter lands in
// Phase 4 (packages/pi/src/pi-ports.ts) once the host surface is locked down.

import type { PresenterPort } from "prowl-core";

/** Minimal structural view of the pi command context's render surface. */
export interface SpikeCommandContext {
  ui: {
    notify(message: string, level?: "info" | "warning" | "error"): void;
  };
}

/**
 * Build a PresenterPort bound to the live pi command context.
 * The host surface is `ctx.ui.notify` — confirmed working in the Phase 2 spike.
 */
export function createSpikePresenter(ctx: SpikeCommandContext): PresenterPort {
  return {
    async present(content: string): Promise<void> {
      ctx.ui.notify(content, "info");
    },
  };
}
