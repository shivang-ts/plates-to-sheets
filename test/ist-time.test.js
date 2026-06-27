import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { utcIsoToIstLocal } from "../lib/ist-time.js";

describe("utcIsoToIstLocal", () => {
  it("converts Zulu timestamps to IST without suffix", () => {
    assert.equal(utcIsoToIstLocal("2026-06-20T17:55:40Z"), "2026-06-20T23:25:40");
    assert.equal(utcIsoToIstLocal("2026-06-20T18:40:09Z"), "2026-06-21T00:10:09");
  });

  it("passes through non-UTC timestamps unchanged", () => {
    assert.equal(utcIsoToIstLocal("2026-06-12T23:35:40"), "2026-06-12T23:35:40");
  });

  it("returns empty for missing values", () => {
    assert.equal(utcIsoToIstLocal(""), "");
    assert.equal(utcIsoToIstLocal(null), "");
  });
});
