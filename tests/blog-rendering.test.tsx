import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineText } from "@/modules/blog/inline";
import { ArticleContent } from "@/modules/blog/article-content";

test("InlineText renders the supported markdown subset and escapes raw markup", () => {
  const html = renderToStaticMarkup(<p><InlineText text={'<script>alert("x")</script> **bold** *italic* ==key== [safe](/products/rice) [unsafe](javascript:alert(1))'} /></p>);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<mark>key<\/mark>/);
  assert.match(html, /<a href="\/products\/rice">safe<\/a>/);
  assert.match(html, /unsafe/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<script>/);
});

test("InlineText opens only validated HTTPS links in a new tab", () => {
  const html = renderToStaticMarkup(<InlineText text="[guide](https://example.com/guide)" />);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer noopener"/);
});

test("article product blocks disappear when the public product lookup has no visible product", () => {
  const html = renderToStaticMarkup(<ArticleContent locale="fa" blocks={[{ id: "product", type: "product", text: "", productSlug: "hidden-product" }]} />);
  assert.equal(html, '<div class="blog-article-body"></div>');
});
