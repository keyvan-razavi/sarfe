import assert from "node:assert/strict";
import test from "node:test";
import { hasNonEmptySeoFilters, localizedSeoUrls } from "../src/lib/seo";

test("localized canonical URLs preserve paths and expose both language variants", () => {
  const urls = localizedSeoUrls(new URL("https://shop.example.com"), "/blog/food%20guide");
  assert.equal(urls.fa.canonical, "https://shop.example.com/blog/food%20guide?lang=fa");
  assert.equal(urls.ckb.canonical, "https://shop.example.com/blog/food%20guide?lang=ckb");
  assert.deepEqual(urls.fa.languages, { fa: urls.fa.canonical, ckb: urls.ckb.canonical, "x-default": urls.fa.canonical });
  assert.equal(urls.ckb.languages, urls.fa.languages);
});

test("canonical builder rejects protocol-relative paths", () => {
  const urls = localizedSeoUrls(new URL("https://shop.example.com"), "//outside.example/path");
  assert.equal(urls.fa.canonical, "https://shop.example.com/?lang=fa");
});

test("filtered listing parameters are noindex candidates, while blank filters are not", () => {
  assert.equal(hasNonEmptySeoFilters({ q: "rice", lang: "fa" }, ["q", "tag"]), true);
  assert.equal(hasNonEmptySeoFilters({ tag: ["", "health"] }, ["q", "tag"]), true);
  assert.equal(hasNonEmptySeoFilters({ q: "   ", lang: "ckb" }, ["q", "tag"]), false);
  assert.equal(hasNonEmptySeoFilters({ lang: "fa" }, ["q", "tag"]), false);
});
