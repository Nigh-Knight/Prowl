// PresenterPort adapter bound to pi's appendEntry + ui.notify + setWidget.
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
  /**
   * Set or clear a persistent widget above the editor.
   * Pass a string array for simple text, or undefined to clear.
   * Pattern: ctx.ui.setWidget("prowl-stream", ["Streaming text..."])
   */
  setWidget?(key: string, content: string[] | undefined): void;
}

/**
 * Build a PresenterPort bound to the live pi command context.
 *
 * - `present` writes a durable, normally-styled transcript entry via
 *   `pi.appendEntry("prowl-result", ...)` — not gray/muted, not ephemeral.
 * - `progress` sends transient status to `ui.notify` (gray/muted ephemeral).
 * - `setStatus` writes/clears a persistent footer status line via `ui.setStatus`.
 * - `stream` updates a live widget with the accumulating synthesis text so the
 *   user sees text appear incrementally (like ai model streaming).
 */
export function presenterPort(
  pi: { appendEntry(customType: string, data?: unknown): void },
  ui: PiPresenterUi,
): PresenterPort {
  // Buffer for accumulating streaming text chunks.
  let streamBuffer = "";

  return {
    async present(result: PresenterResult): Promise<void> {
      // Clear any live streaming widget before writing the final entry.
      ui.setWidget?.("prowl-stream", undefined);
      streamBuffer = "";
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
    async stream(chunk: string): Promise<void> {
      // Append chunk and update the widget so the user sees text grow live.
      streamBuffer += chunk;
      ui.setWidget?.("prowl-stream", [streamBuffer]);
    },
  };
}
