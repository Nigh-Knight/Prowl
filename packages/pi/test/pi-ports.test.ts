// Unit tests for presenterPort — pi.appendEntry binding (Q2).
//
// These tests import only from ../src/pi-ports.ts and mock a minimal pi/ui
// surface. No credentials or live services needed.

import { describe, it, expect } from "bun:test";
import { presenterPort } from "../src/pi-ports.ts";

describe("presenterPort", () => {
  it("present() calls pi.appendEntry with structured data", async () => {
    const appendCalls: Array<[string, unknown]> = [];
    const pi = {
      appendEntry(customType: string, data?: unknown) {
        appendCalls.push([customType, data]);
      },
    };
    const ui = {
      notify(_message: string, _level?: "info" | "warning" | "error") {},
    };

    const port = presenterPort(pi, ui);
    const result = {
      query: "test query",
      summary: "test summary",
      sources: [
        { title: "Source 1", url: "https://example.com", snippet: "snip" },
      ],
    };

    await port.present(result);

    expect(appendCalls.length).toBe(1);
    const call = appendCalls[0]!;
    expect(call[0]).toBe("prowl-result");
    const data = call[1] as {
      query: string;
      summary: string;
      sources: Array<{ title: string; url: string }>;
    };
    expect(data.query).toBe("test query");
    expect(data.summary).toBe("test summary");
    expect(data.sources.length).toBe(1);
    expect(data.sources[0]!.url).toBe("https://example.com");
  });

  it("progress() calls ui.notify with 'info' level", async () => {
    const notifyCalls: Array<[string, string | undefined]> = [];
    const pi = { appendEntry() {} };
    const ui = {
      notify(
        message: string,
        level?: "info" | "warning" | "error",
      ) {
        notifyCalls.push([message, level]);
      },
    };

    const port = presenterPort(pi, ui);
    await port.progress!("Searching…");

    expect(notifyCalls.length).toBe(1);
    const nc = notifyCalls[0]!;
    expect(nc[0]).toBe("Searching…");
    expect(nc[1]).toBe("info");
  });

  it("handles empty sources list", async () => {
    const appendCalls: Array<[string, unknown]> = [];
    const pi = { appendEntry(customType: string, data?: unknown) { appendCalls.push([customType, data]); } };
    const ui = { notify() {} };

    const port = presenterPort(pi, ui);
    await port.present({
      query: "empty result",
      summary: "No sources found.",
      sources: [],
    });

    const entry = appendCalls[0]!;
    const data = entry[1] as { sources: unknown[] };
    expect(data.sources.length).toBe(0);
  });
});
