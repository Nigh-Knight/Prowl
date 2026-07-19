// Unit tests for parseProwlArgs — token-based argument parser (I1/Q5).
//
// These tests import only from ../src/args.ts and require no credentials or
// live services. They cover substring-safety, flag detection, and edge cases.

import { describe, it, expect } from "bun:test";
import { parseProwlArgs } from "../src/args.ts";

describe("parseProwlArgs", () => {
  it("detects --read as a token and strips it from the query", () => {
    expect(parseProwlArgs("topic --read")).toEqual({
      query: "topic",
      readMode: true,
      debug: false,
    });
  });

  it("detects --debug as a token", () => {
    expect(parseProwlArgs("--debug topic")).toEqual({
      query: "topic",
      readMode: false,
      debug: true,
    });
  });

  it("detects both --read and --debug", () => {
    expect(parseProwlArgs("--read --debug topic")).toEqual({
      query: "topic",
      readMode: true,
      debug: true,
    });
  });

  it("does NOT treat a substring like --reader as the flag (I1)", () => {
    expect(parseProwlArgs("--reader book")).toEqual({
      query: "--reader book",
      readMode: false,
      debug: false,
    });
  });

  it("does NOT corrupt a query containing --reading", () => {
    expect(parseProwlArgs("notes about --reading habits")).toEqual({
      query: "notes about --reading habits",
      readMode: false,
      debug: false,
    });
  });

  it("returns empty query when only flags given", () => {
    expect(parseProwlArgs("--read --debug")).toEqual({
      query: "",
      readMode: true,
      debug: true,
    });
  });

  it("returns empty query and both false for empty input", () => {
    expect(parseProwlArgs("   ")).toEqual({
      query: "",
      readMode: false,
      debug: false,
    });
  });

  it("flags can appear anywhere in the token stream", () => {
    expect(parseProwlArgs("deep topic --read more words")).toEqual({
      query: "deep topic more words",
      readMode: true,
      debug: false,
    });
  });
});
