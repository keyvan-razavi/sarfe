import assert from "node:assert/strict";
import test from "node:test";
import { previewHomePageContent } from "../src/modules/home-content/fixtures";
import { homePageContentSchema, parseStoredHomePageContent } from "../src/modules/home-content/validation";
import { canSelectMediaFiles, currentMediaPaths, mergeUploadedMediaPaths } from "../src/components/ui/media-picker-state";

test("preview homepage content is valid localized content and preserves local image defaults", () => {
  assert.deepEqual(parseStoredHomePageContent(previewHomePageContent), previewHomePageContent);
  assert.match(previewHomePageContent.fa.heroImage, /^\/images\//);
  assert.match(previewHomePageContent.ckb.aboutImageAlt, /./);
});

test("homepage content rejects remote, malformed, and traversal image paths", () => {
  for (const path of ["https://example.test/hero.jpg", "//example.test/hero.jpg", "/images/../private.jpg", "/uploads/hero.jpg"]) {
    const result = homePageContentSchema.safeParse({
      ...previewHomePageContent,
      fa: { ...previewHomePageContent.fa, heroImage: path },
    });
    assert.equal(result.success, false, path);
  }
});

test("homepage content requires complete copy and meaningful alt text in both locales", () => {
  const noCopy = { ...previewHomePageContent, ckb: { ...previewHomePageContent.ckb, aboutBody: " " } };
  assert.equal(homePageContentSchema.safeParse(noCopy).success, false);
  const noAlt = { ...previewHomePageContent, fa: { ...previewHomePageContent.fa, heroImageAlt: "" } };
  assert.equal(homePageContentSchema.safeParse(noAlt).success, false);
});

test("media picker treats a cleared slot as empty and lets a single image be replaced", () => {
  const cleared = [""];
  assert.deepEqual(currentMediaPaths(cleared), []);
  assert.equal(canSelectMediaFiles(cleared, 1, 1), true);
  assert.deepEqual(mergeUploadedMediaPaths(cleared, ["/api/media/new.jpg"], 1), ["/api/media/new.jpg"]);

  const current = ["/api/media/current.jpg"];
  assert.equal(canSelectMediaFiles(current, 1, 1), true);
  assert.deepEqual(mergeUploadedMediaPaths(current, ["/api/media/replacement.png"], 1), ["/api/media/replacement.png"]);
  assert.equal(canSelectMediaFiles(current, 1, 20), true);
  assert.deepEqual(mergeUploadedMediaPaths(current, ["/api/media/another.jpg"], 20), ["/api/media/current.jpg", "/api/media/another.jpg"]);
});
