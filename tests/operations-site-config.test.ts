import assert from "node:assert/strict";
import test from "node:test";
import { getIndexableSiteUrl, getProductionSiteUrl } from "../src/lib/site-config";

test("site URL accepts a public HTTPS origin and rejects unsafe or malformed URLs", () => {
  assert.equal(getProductionSiteUrl("https://shop.example.com")?.origin, "https://shop.example.com");
  for (const value of [
    undefined,
    "http://shop.example.com",
    "https://localhost",
    "https://store.localhost",
    "https://10.0.0.8",
    "https://192.168.1.4",
    "https://user:secret@shop.example.com",
    "https://shop.example.com/path",
    "https://shop.example.com/?preview=1",
    "not a URL",
  ]) {
    assert.equal(getProductionSiteUrl(value), null, String(value));
  }
});

test("indexing needs explicit opt-in, production mode, and a safe HTTPS origin", () => {
  const base = { appUrl: "https://shop.example.com", indexable: "true", nodeEnv: "production" };
  assert.equal(getIndexableSiteUrl(base)?.origin, "https://shop.example.com");
  assert.equal(getIndexableSiteUrl({ ...base, indexable: "false" }), null);
  assert.equal(getIndexableSiteUrl({ ...base, indexable: undefined }), null);
  assert.equal(getIndexableSiteUrl({ ...base, nodeEnv: "development" }), null);
  assert.equal(getIndexableSiteUrl({ ...base, appUrl: "http://shop.example.com" }), null);
  assert.equal(getIndexableSiteUrl({ ...base, appUrl: "https://127.0.0.1" }), null);
});
