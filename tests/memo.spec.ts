import { expect, test } from "@playwright/test";

import { normalizeMemo } from "../src/lib/memo";

test.describe("N5 memo normalization", () => {
  test("distinguishes absent, empty, and normalized values", () => {
    expect(normalizeMemo(undefined)).toEqual({ status: "absent" });
    expect(normalizeMemo(" \r\n\t ")).toEqual({
      status: "ready",
      value: null,
      scalarLength: 0
    });
    expect(normalizeMemo("  first\r\nsecond\rlast  ")).toEqual({
      status: "ready",
      value: "first\nsecond\nlast",
      scalarLength: 17
    });
  });

  test("counts Unicode scalar values without normalizing them", () => {
    expect(normalizeMemo("😀")).toEqual({
      status: "ready",
      value: "😀",
      scalarLength: 1
    });
    expect(normalizeMemo("e\u0301")).toEqual({
      status: "ready",
      value: "e\u0301",
      scalarLength: 2
    });
    expect(normalizeMemo("あ".repeat(1000))).toEqual({
      status: "ready",
      value: "あ".repeat(1000),
      scalarLength: 1000
    });
    expect(normalizeMemo("あ".repeat(1001))).toEqual({
      status: "invalid",
      reason: "too_long",
      scalarLength: 1001
    });
  });

  test("rejects unpaired surrogates and accepts valid pairs", () => {
    expect(normalizeMemo("\ud800")).toEqual({
      status: "invalid",
      reason: "unpaired_surrogate"
    });
    expect(normalizeMemo("\udc00")).toEqual({
      status: "invalid",
      reason: "unpaired_surrogate"
    });
    expect(normalizeMemo("\ud83d\ude00")).toEqual({
      status: "ready",
      value: "😀",
      scalarLength: 1
    });
  });
});
