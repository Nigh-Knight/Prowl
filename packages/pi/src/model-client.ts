// ModelPort adapter — single OpenAI-compatible model used for PLAN + SYNTHESIZE.
//
// v0.1 uses one model for both query planning and synthesis, reached through any
// OpenAI-compatible endpoint (Venice / OpenRouter / a local gateway). The default
// model is Qwen 3.6-plus; override via PROWL_MODEL. Point PROWL_MODEL_BASE_URL at
// your gateway and PROWL_MODEL_API_KEY at its key.
//
// Adapters own env config: core never touches process.env (per architecture
// guidance). The OpenAI client is constructed LAZILY on first use, not at module
// load — this lets the extension load (and /prowl register) even when no model
// credentials are set, exactly like any other pi extension. A missing key only
// surfaces as a clear error when a search actually needs the model.

import OpenAI from "openai";
import type { ModelPort } from "prowl-core";

const MODEL = process.env.PROWL_MODEL ?? "qwen3.6-plus";
const BASE_URL = process.env.PROWL_MODEL_BASE_URL;
const API_KEY = process.env.PROWL_MODEL_API_KEY ?? "";

// Lazily created on first generate() so importing this module never throws on
// missing credentials (which would otherwise block the whole extension from loading).
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  if (!API_KEY) {
    throw new Error(
      "Prowl model not configured: set PROWL_MODEL_API_KEY (and PROWL_MODEL_BASE_URL " +
        "for a non-OpenAI gateway). Default model is qwen3.6-plus.",
    );
  }
  client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  return client;
}

export const modelClient: ModelPort = {
  async generate(prompt: string, opts?: Record<string, unknown>) {
    const res = await getClient().chat.completions.create({
      model: (opts?.model as string) ?? MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content ?? "";
  },
};
