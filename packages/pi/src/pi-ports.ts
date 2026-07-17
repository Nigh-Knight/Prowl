// Minimal PresenterPort adapter bound to the pi host render surface.
//
// Phase 4: turns the Phase 2 spike (which proved `ctx.ui.notify` works as the
// render surface) into a reusable, structurally-typed PresenterPort. We avoid
// importing from @earendil-works/pi-coding-agent so the adapter stays decoupled
// from pi internals and type-checks without the pi package installed locally
// (per architecture guidance: "Adapters own Pi UI", structural typing only).

import type { PresenterPort } from "prowl-core";

/**
 * Minimal structural view of the pi UI surface Prowl needs to render output.
 * Mirrors `ctx.ui.notify` confirmed working in the Phase 2 spike.
 */
export interface PiPresenterUi {
  notify(message: string, level?: "info" | "warning" | "error"): void;
}

/**
 * Build a PresenterPort bound to the live pi command context's UI surface.
 * The host render call is `notify` (not a `present` method) — confirmed in
 * the Phase 2 spike against the real pi runtime.
 *
 * Returns a `PresenterPort` so Phase 5's core `search` composer can inject it
 * unchanged alongside `searxngClient` (SearchPort) and `modelClient` (ModelPort).
 */
export function presenterPort(ui: PiPresenterUi): PresenterPort {
  return {
    async present(content: string): Promise<void> {
      ui.notify(content, "info");
    },
  };
}
