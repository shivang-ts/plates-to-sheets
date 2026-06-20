import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidZomatoResId,
  parseResIdFromAuthToken,
  resolveZomatoResId,
} from "../lib/zomato/res-id.js";

describe("isValidZomatoResId", () => {
  it("accepts typical outlet ids", () => {
    assert.equal(isValidZomatoResId("22737520"), true);
  });

  it("rejects timestamps", () => {
    assert.equal(isValidZomatoResId("1781928102966"), false);
  });
});

describe("resolveZomatoResId", () => {
  it("prefers stored resId", () => {
    assert.equal(resolveZomatoResId({ resId: "22737520" }, ""), "22737520");
  });

  it("parses resId from JWT payload", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64");
    const payload = Buffer.from(JSON.stringify({ rrm: { 22737520: [1] } })).toString("base64");
    const token = `${header}.${payload}.sig`;
    assert.equal(resolveZomatoResId({ authToken: token }, ""), "22737520");
  });
});

describe("parseResIdFromAuthToken", () => {
  it("returns null for invalid token", () => {
    assert.equal(parseResIdFromAuthToken("not-a-jwt"), null);
  });
});
