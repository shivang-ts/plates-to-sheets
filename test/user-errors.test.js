import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatUserError, resultFromError } from "../lib/user-errors.js";

describe("formatUserError", () => {
  it("formats cancelled exports", () => {
    assert.equal(formatUserError({ cancelled: true }), "Export cancelled.");
  });

  it("maps auth errors", () => {
    const msg = formatUserError({ authError: true, message: "Session expired" });
    assert.equal(msg, "Session expired");
  });
});

describe("resultFromError", () => {
  it("returns structured failure", () => {
    const result = resultFromError({ message: "Network down", authError: false });
    assert.equal(result.ok, false);
    assert.equal(result.error, "Network down");
  });
});
