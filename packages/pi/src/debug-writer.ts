// debug-writer.ts — ndjson debug telemetry writer for the pi adapter.
//
// Writes structured stage telemetry to ~/.prowl/debug-last.jsonl, one JSON
// object per line, each with a timestamp. The file is overwritten on each
// search (not appended indefinitely).

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { TelemetryEvent } from "prowl-core";

const DEBUG_DIR = join(homedir(), ".prowl");
const DEBUG_PATH = join(DEBUG_DIR, "debug-last.jsonl");

/**
 * Create a debug sink that writes ndjson to ~/.prowl/debug-last.jsonl.
 * Each line is a JSON object with the TelemetryEvent fields plus a timestamp.
 * The file is truncated on creation (first write) and appended-to thereafter
 * for the duration of a single search.
 */
export function createDebugSink(): { write: (event: TelemetryEvent) => void; close: () => void } {
  // Ensure directory exists
  if (!existsSync(DEBUG_DIR)) {
    mkdirSync(DEBUG_DIR, { recursive: true });
  }

  // Truncate/create the file
  writeFileSync(DEBUG_PATH, "", "utf-8");

  return {
    write(event: TelemetryEvent): void {
      try {
        const line = JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + "\n";
        writeFileSync(DEBUG_PATH, line, { flag: "a", encoding: "utf-8" });
      } catch (err) {
        console.warn(`[prowl] failed to write debug event: ${err instanceof Error ? err.message : err}`);
      }
    },
    close(): void {
      // No-op for Sync writes — file handle released after each writeFileSync.
    },
  };
}