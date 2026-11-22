# Architecture and implementation contract

Status: approved baseline, updated November 17, 2026.

## Product scope

صرفه is a Persian-first food and wellbeing project with editorial publishing alongside a single-store commerce platform. Visitors can read practical food and health content, browse the public catalog, manage customer accounts, and review their own order reservations. Owners manage category definitions, products, variants, prices, inventory, publication, localized homepage content and imagery, blog posts, and order reservations. Payment collection and fulfillment remain later launch gates and are intentionally out of scope for the current implementation.

Confirmed languages: Persian (`fa`, default) and Kurdish Sorani (`ckb`), both in Arabic script with RTL layout. All storefront and CMS interface text uses shared or module-owned translation dictionaries. Locale selection persists and updates both `lang` and `dir`; server rendering reads the same preference. Product/category content needs a clear localization path, translated sample inventory, and an explicit fallback when a stored translation is missing.

Confirmed store direction: groceries and household essentials, including rice, cooking oil, tomato paste, pantry groceries, detergents, and essential food staples. Use category-specific package, weight, and volume configurations. Generated product images and sample prices are preview content until replaced or approved against real inventory. Keep detergents clearly identified as household goods rather than food.

Confirmed selling market: Iran; the owner requested toman for customer-facing prices and selected BitPay Iran. The owner confirmed the provider amount is in rials. Storefront and CMS prices remain toman-facing while stored order/payment values use the explicit Rial currency; convert at the provider boundary and test the factor of ten. Existing USD preview prices are not exchange-rate conversions and must not be relabeled as toman.

Working assumptions: one currency per cart, one store, one owner account initially. Tax, shipping, payment provider, real inventory and the payment adapter's expected monetary unit must be confirmed before checkout implementation. Keep currency explicit; language does not select monetary units. Do not infer a legal market from the developer's location.

## Modular monolith

Use one Next.js App Router deployment with PostgreSQL and Prisma. This keeps initial operations simple while preserving independent domain APIs. Use server rendering for catalog pages and small client components for variant selection, cart, navigation, and theme preference. Prefer a server-side data access layer; do not send full database records or secrets into client components.

```text
src/app/                    Route composition, metadata, layouts, error boundaries
src/components/ui/          Domain-independent UI primitives and form fields
src/components/storefront/  Shared storefront composition
src/lib/                    Server infrastructure and pure cross-domain utilities
src/modules/catalog/        Categories, configuration, products, variants, publication
src/modules/identity/       Owner login, session verification, authorization
src/modules/cart/           Client cart and quantity/price presentation
src/modules/orders/         Internal order pricing, reservations and expiry
src/modules/customer-account/ Customer credentials, customer session and profile
src/modules/blog/           Editorial posts, validation, persistence and public queries
prisma/                     PostgreSQL schema, versioned migrations, sample seed
docs/                       Architecture, design, roadmap, review evidence
```

Each module exposes a small public entry point. Keep repositories, validation, services, and domain components inside the module as its complexity grows. Separate server and browser entry points where needed so a client import cannot pull database code into the bundle. Shared components depend on primitives and infrastructure, never on catalog or identity. Route files may compose multiple public modules. A future dependency boundary check belongs in CI.

## Catalog model

- Brand: stable identifier, unique slug, name, optional description and localized presentation, plus an active/archive state. Products may reference one brand; active brand filters expose only brands with published products. The owner manages brands separately and assigns them from the product editor. Sample catalog and blog content intentionally do not invent brands.

- Category: stable identifier, unique slug, name, description, optional parent. Reject hierarchy cycles. Attribute inheritance is explicit; initial configuration is per-category unless implemented and tested otherwise.
- Attribute definition: stable key, label, type (`text`, `number`, `boolean`, `select`), required flag, permitted select options. Reject duplicate keys and malformed options.
- Product: category reference, unique slug, name, plain-text description, local image paths, publication state. Public queries return published products only. The `images` column stores paths, not image bytes; Persian and Sorani name/description variants live in the `translations` JSON value.
- Variant: product reference, globally unique SKU, readable name, typed attribute values, integer minor-unit price, currency, nonnegative stock. Category definitions validate every variant at the service boundary.
- Product presentation: show a starting price for multiple variants, then the selected variant's actual price and availability. A cart line identifies a variant, not merely a product.

Store flexible attribute values in PostgreSQL JSONB with typed service validation. Keep IDs, relationships, SKU, publication, price and stock in relational columns. Add foreign keys, uniqueness constraints, nonnegative price/stock checks, and indexes for public category/status/slug queries. A category definition change must validate existing variants or reject the change with an actionable error.

## Persistence and mutations

Only the server owns the Prisma client. Use one development client instance to avoid hot-reload connection growth. Commit generated SQL migrations as the schema history. Use the pinned Prisma version's migration commands: development migration generation locally, reviewed deployment migrations in release automation. Keep sample seeding explicit, repeatable, and separate from production startup.

Validate all inputs on the server, authorize the caller, execute transactional changes, then invalidate relevant catalog views. Editing product variants must be atomic. Slug and SKU collisions produce useful errors. Publication updates immediately change public visibility. Return safe error messages while logging operational context without credentials.

When `DATABASE_URL` is absent, an explicitly labeled read-only preview may use fixtures. Configured database failures remain failures. Preview mode cannot mutate CMS data. Preview must not be used for launch acceptance.

## Identity and security

The CMS uses one configured owner identity with a password hash and a signed, expiring, HttpOnly cookie. Customer accounts are persisted in PostgreSQL with normalized unique email, scrypt password hashes, and a separate signed cookie audience and cookie name. Credentials and signing secrets come from environment variables; authentication fails closed when secrets are missing. Customer order reads scope every query to the verified session's customer ID. Checkout derives an optional customer link only from that session; guest orders remain unlinked, and historic guest orders are never attached by matching email. Customer profile updates do not allow changing email or password. Check authorization in every server action, independent of layout redirects. Use secure cookies in production, SameSite controls, request-origin protections, and generic authentication failures.

Before public admin access, add owner provisioning/rotation, audit records, and operational monitoring. Before staff accounts, replace the single-owner adapter with persisted identities and explicit owner/editor roles. The initial owner-only catalog uploader validates JPEG, PNG, and WebP content, rejects external image URLs and SVG, and saves files in `.local/media/products` for development; PostgreSQL stores generated `/api/media/<id>.<extension>` paths. Production deployment must provide a durable shared volume or replace the local storage adapter with object storage, with deployment-specific access control and malware handling, before accepting live uploads.

## New module protocol

1. Write its purpose, owned data, inputs/outputs, permissions, and acceptance tests.
2. Expose a narrow public API. Extend shared primitives only for reusable interaction behavior.
3. Add a migration for owned data and a repository/service for mutations.
4. Register routes, CMS navigation, and settings explicitly at the application composition layer.
5. Test behavior and cross-module contracts. Document migration, observability, and rollback implications.

Use direct calls initially. Introduce an outbox and asynchronous domain events when orders/payments need retryable side effects. Avoid in-process events as a guarantee of durable payment or stock work.

### Blog content module

The `blog` module owns `BlogPost` rows and the `BlogStatus` enum. A post stores a unique lowercase hyphenated slug, `DRAFT`/`PUBLISHED`/`ARCHIVED` status, optional local cover path and matching alt text, up to 12 shared tags, localized JSON content, publication time, and timestamps. Persian content is required; Kurdish Sorani content is optional and falls back to Persian. Each translation contains title, excerpt, ordered content blocks, SEO title, and SEO description. Blocks use stable IDs and one of `paragraph`, `heading`, `quote`, `bulletList`, `orderedList`, `image`, or `product`; headings use level 2 or 3. Product blocks and editable related-product links store mutable catalog slugs, which the service validates against the catalog's public product API before saving. Editable related-post links likewise store slugs and are validated against published posts. Public rendering resolves references again through public APIs, so a later-unpublished product or post is omitted; changing a referenced slug breaks the stored link.

The `home-content` module owns the localized homepage copy and the two editorial image paths used for the hero and about section. Every image displayed in featured product cards comes from the catalog product's managed image paths. The homepage keeps food and wellbeing publishing as its primary path and presents shopping in a separate catalog section. Stored home-content JSON is merged with bilingual defaults before validation so older records continue to render after copy fields evolve.

The public API in `src/modules/blog/index.ts` exposes `getBlogPosts`, `getBlogPostBySlug`, and `getBlogSitemapPosts` with public post and pagination types. Route composition serves `/blog`, `/blog/[slug]`, `/admin/blog`, `/admin/blog/new`, and `/admin/blog/[id]/edit`. Public queries expose only posts whose status is `PUBLISHED` and `publishedAt` is no later than the current time. Search, tag filtering, pagination, sitemap entries, and reading time apply to that visible set. See the [blog owner guide](BLOG.md) for editor workflow and media constraints. Admin reads and mutations in `src/modules/blog/admin.ts` all call `requireOwner`; PostgreSQL is authoritative when configured, database errors propagate, and the missing-database mode is an explicitly labeled empty, read-only preview.

Inline text supports only the renderer's safe markdown subset: `**bold**`, `*italic*`, `==highlight==`, and `[label](destination)`. Raw HTML is rejected. Destinations are HTTPS URLs without credentials or single-slash local paths without traversal. Image blocks and covers accept local `/images/...` or generated `/api/media/...` paths only; image blocks require alt text, and any supplied cover requires alt text. Optional covers use empty image and alt strings. Do not treat this validation as permission to use an HTML renderer: render text nodes and explicitly parsed inline nodes, never raw HTML. Keep media on the existing local development storage path until a durable production media adapter is provided.

The blog migration is additive. If rolling it back, first export or back up all blog content, then drop `BlogPost` and `BlogStatus`; that rollback permanently removes posts and tags. A forward corrective migration is preferred after any environment accepts editorial content. Configured database failures must remain visible rather than falling back to preview. Blog acceptance covers validation and owner/public PostgreSQL behavior, including publication boundaries, uniqueness, product references, and persistence.

## Checkout boundary

The client cart is a convenience, never an authority for payment totals. Future checkout must reload current prices, currency, publication and stock on the server; reserve stock atomically; snapshot order lines; use idempotency keys; verify payment webhook signatures; tolerate duplicate/reordered webhooks; and release expired reservations. Payment, inventory, fulfillment, and notification state transitions require tests before launch.

### Internal reservation API

`orders` exposes server-only reservation creation, cancellation and expiry plus owner-only order review and customer-scoped order history. The checkout route adds request-origin checks and an unguessable idempotency key; customer association is session-derived. Admin cancellation releases stock through the same transactional reservation service. No payment can be accepted through the current reservation module, and order states intentionally stop at `RESERVED`, `EXPIRED`, and `CANCELED`.

The order request contains customer/address details and variant IDs/quantities, never authoritative prices. A catalog-owned transaction seam loads published variants and guards stock changes. Order creation and stock reservation share a serializable PostgreSQL transaction. Persist customer/address and line snapshots; an existing idempotency key must match the canonical request and pricing-policy identity. Shipping/tax policies are explicit server dependencies with versioned identities; quote operations must be read-only and safe to repeat on a transaction retry.

Reservations reduce available variant stock. A terminal cancellation/expiry transition releases the held quantity once. CMS stock changes and variant removal reject active reservations to protect later restoration. Run expiry through trusted operational code; no automatic production scheduler or checkout is implied by the function's existence. PostgreSQL concurrency tests are required before treating these guarantees as verified.

### Local mock payment review and reporting

`PaymentAttempt` is a separate nonproduction-only record for reviewing payment UI outcomes. The service requires `MOCK_PAYMENTS_ENABLED=true` and refuses production regardless of that value. A mock attempt is scoped to the authenticated customer and an active, unexpired reservation, and uses a per-attempt idempotency key. An `APPROVED` mock outcome does not alter `OrderStatus`, release or fulfill stock, or represent provider confirmation or revenue. The app must never send these records to BitPay or include their amount in sales reports. Enable the feature only in isolated local review environments. Operational owner reports aggregate reservation counts by date and status only; no monetary metrics are implied until verified provider settlement and accounting are implemented.

## Operations target

Use managed PostgreSQL with pooling, TLS, backups, and restore drills. Keep secrets out of source control. Separate preview/staging/production data. CI should run lint, typecheck, tests, Prisma validation and production build. Deployment runs reviewed migrations once, followed by smoke checks. Add request/error monitoring, health checks, structured logs, image optimization, sitemap/robots, and performance budgets before public launch.

## Technical references

Consult the installed version alongside these upstream references; documentation can describe a newer major version.

- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Next.js server-side data security: https://nextjs.org/docs/app/guides/data-security
- Prisma migration workflow: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
