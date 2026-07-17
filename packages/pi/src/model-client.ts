// ModelPort adapter — uses pi's currently-selected model instead of a separate
// OpenAI client. This lets Prowl run on whatever model pi is configured with
// (e.g. Qwen 3.6-plus), with no PROWL_MODEL_API_KEY / PROWL_MODEL_BASE_URL needed.
//
// Pattern mirrors pi's own example extensions (qna.ts): read `ctx.model`, resolve
// its credentials through `ctx.modelRegistry.getApiKeyAndHeaders(model)`, and call
// `complete()` from @earendil-works/pi-ai/compat. The adapter is built per-call
// because it needs the live command context (model + registry), which only exists
// inside the handler — not at extension load time.

import { complete, type UserMessage } from "@earendil-works/pi-ai/compat";
import type { ModelPort } from "prowl-core";

/**
 * Minimal structural view of the pi command context Prowl needs: the active
 * model, its credential registry, and the current abort signal. Mirrors the
 * fields pi's ExtensionCommandContext exposes, without importing the full type
 * (so the adapter stays decoupled and type-checks in isolation).
 */
export interface ProwlModelContext {
  model: { id: string; provider: string } | undefined;
  modelRegistry: {
    getApiKeyAndHeaders(model: { id: string; provider: string }): Promise<
      | { ok: true; apiKey?: string; headers?: Record<string, string> }
      | { ok: false; error: string }
    >;
  };
  signal?: AbortSignal;
}

/**
 * Build a ModelPort bound to pi's active model for this command invocation.
 * Throws a clear error if no model is selected in pi (the user sets it there).
 */
export function modelPortFromContext(
  ctx: ProwlModelContext,
): ModelPort {
  const model = ctx.model;
  if (!model) {
    throw new Error(
      "Prowl needs a model: select one in pi (e.g. Qwen 3.6-plus). No model is currently active.",
    );
  }

  return {
    async generate(prompt: string): Promise<string> {
      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        throw new Error(
          auth.ok
            ? `No API key configured in pi for ${model.provider}/${model.id}.`
            : auth.error,
        );
      }

      const userMessage: UserMessage = {
        role: "user",
        content: [{ type: "text", text: prompt }],
        timestamp: Date.now(),
      };

      const response = await complete(
        model as never,
        { messages: [userMessage] },
        {
          apiKey: auth.apiKey,
          headers: auth.headers,
          signal: ctx.signal,
        },
      );

      return response.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");
    },
  };
}
