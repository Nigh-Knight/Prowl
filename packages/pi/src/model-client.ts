// ModelPort adapter — single OpenAI-compatible model used for PLAN + SYNTHESIZE.
//
// v0.1 uses one model (Qwen) for both query planning and synthesis, reached
// through any OpenAI-compatible endpoint (Venice / OpenRouter / a local gateway).
// Adapters own env config: core never touches process.env (per architecture
// guidance). Env is read at module scope and fails fast if the key is missing.

import OpenAI from "openai";
import type { ModelPort } from "prowl-core";

const MODEL = process.env.PROWL_MODEL ?? "qwen3.6-plus";

const client = new OpenAI({
  apiKey: process.env.PROWL_MODEL_API_KEY ?? "",
  baseURL: process.env.PROWL_MODEL_BASE_URL, // OpenAI-compatible (Venice/OpenRouter/etc.)
});

export const modelClient: ModelPort = {
  async generate(prompt: string, opts?: Record<string, unknown>) {
    const res = await client.chat.completions.create({
      model: (opts?.model as string) ?? MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content ?? "";
  },
};
