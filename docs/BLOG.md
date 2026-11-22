# Blog owner guide

The blog is a Persian-first editorial area managed by the store owner. Public routes are `/blog` and `/blog/[slug]`. Owner routes are `/admin/blog`, `/admin/blog/new`, and `/admin/blog/[id]/edit`.

## Access and preview

Sign in through the owner login at `/admin/login`. Persistent editing requires a configured owner account, `DATABASE_URL`, and the blog migration applied to PostgreSQL. If the database is not configured, public blog pages show an explicitly labeled empty preview and the editor is read-only. A configured database error is surfaced; it does not switch to preview. See [local PostgreSQL and owner CMS setup](../README.md#local-postgresql-and-owner-cms).

## Create and publish

From `/admin/blog`, choose the new-post action. Enter the required Persian title, excerpt, and content. You can leave the entire Sorani section blank to use Persian as the fallback. If you add any Sorani translation content, Sorani title and excerpt are both required; Sorani blocks and SEO fields are optional. Tags and cover image/alt are shared by the post, not translated per locale.

Enter a unique slug using lowercase ASCII letters or digits separated by single hyphens, for example `how-to-store-rice`. Keep it between 2 and 120 characters. The slug forms the public URL; changing it changes the URL, so preserve a published slug when possible. Enter tags separated by commas (Arabic commas are also accepted): at most 12 unique tags, each no longer than 40 characters.

Choose a status and press **Save**. The form does not autosave. Publishing makes the post visible immediately and sets its publication time. Saving edits while it stays published preserves that time. Changing status to draft or archived clears it; publishing again sets a new time. Draft and archived posts do not appear in public lists, direct slug pages, search results, filters, or the sitemap. Public search and tag filters operate on published posts, and the list is paginated.

To remove a post, use its delete action and check the required confirmation. Deletion is permanent: there is no trash or undo.

## Build the article

Add blocks in the order readers should see them, then use the move controls to reorder. Remove a block with its remove control. Supported blocks are:

- Paragraph
- Heading (H2 or H3)
- Quote
- Bulleted list or numbered list
- Inline image
- Product reference

Paragraph, heading, quote, and list text accept this limited inline Markdown:

| Formatting | Example |
| --- | --- |
| Bold | `**important**` |
| Italic | `*emphasis*` |
| Highlight | `==key point==` |
| Link | `[read more](/about)` |

The toolbar wraps selected text in bold, italic, highlight, or link markup. The live block preview updates as you edit, without saving or publishing the post. Links may use HTTPS destinations without embedded credentials, or local absolute paths beginning with one `/` (not `//` and not traversal paths). Raw HTML is not supported. The editor provides text fields and a block preview; it is not a full WYSIWYG editor.

## Images and products

A post may have a cover; if you add one, provide its alt text. Inline image blocks require alt text and may include a caption. Use local `/images/...` assets or generated `/api/media/...` paths. The owner-protected media uploader accepts JPEG, PNG, or WebP images up to 8 MiB per file. Images uploaded in local development live under `.local/media/products`; PostgreSQL stores their paths. Local disk is not durable production storage. Configure durable shared or object storage before relying on uploads in production.

A product block references a currently public catalog product by slug. The slug must resolve when saving, and the product is resolved again for public rendering; if the product becomes unavailable, the block is omitted. Product references use slugs rather than stable product IDs, so changing a product slug breaks an existing reference. Confirm product visibility and slug before saving.

The related-content fields let the editor connect a post to other published posts and public products. Choose posts and products in the editor; those links are validated on save and resolved again for storefront display. Unpublished or removed references are hidden publicly. Seeded editorial examples include these connections so the public blog has a useful starting point after the project seed is run.

## Search appearance and reading time

SEO title and description are optional per-language fields. When absent, the post title and excerpt are used. Public pages provide article metadata and include only currently published posts in the sitemap. Displayed reading time is estimated from text content at 200 words per minute, rounded up with a one-minute minimum; it is an estimate.

The editor does not support scheduling, revision history, autosave, or trash recovery. For architecture and roadmap status, see [architecture](ARCHITECTURE.md) and [roadmap](ROADMAP.md).
