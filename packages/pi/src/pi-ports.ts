// PresenterPort adapter bound to pi's appendEntry + ui.notify.
//
// Phase 6: Rebind from the ephemeral gray/muted ui.notify channel to
// pi.appendEntry("prowl-result", ...) for durable, normally-styled transcript
// entries. Progress messages remain on ui.notify (ephemeral, transient).

import type { PresenterPort, PresenterResult } from "prowl-core";

/**
 * Minimal structural view of the pi UI surface Prowl needs to render output.
 * Mirrors `ctx.ui.notify` confirmed working in the Phase 2 spike.
 */
export interface PiPresenterUi {
  notify(message: string, level?: "info" | "warning" | "error"): void;
  /**
   * Set or clear a persistent status key in the terminal footer.
   * Passing `undefined` as text clears the key.
   * Pattern: ctx.ui.setStatus("status-demo", theme.fg("dim", "Ready"))
   */
  setStatus(key: string, text: string | undefined): void;
}

/**
 * Build a PresenterPort bound to the live pi command context.
 *
 * - `present` writes a durable, normally-styled transcript entry via
 *   `pi.appendEntry("prowl-result", ...)` — not gray/muted, not ephemeral.
 * - `progress` sends transient status to `ui.notify` (gray/muted ephemeral).
 * - `setStatus` writes/clears a persistent footer status line via `ui.setStatus`.
 */
export function presenterPort(
  pi: { appendEntry(customType: string, data?: unknown): void },
  ui: PiPresenterUi,
): PresenterPort {
  return {
    async present(result: PresenterResult): Promise<void> {
      pi.appendEntry("prowl-result", {
        query: result.query,
        summary: result.summary,
        sources: result.sources,
      });
    },
    async progress(message: string): Promise<void> {
      ui.notify(message, "info");
    },
    async setStatus(key: string, text: string | undefined): Promise<void> {
      ui.setStatus(key, text);
    },
  };
}
