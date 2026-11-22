# صرفه store

A Persian-first food and wellbeing project with editorial publishing and a grocery store, built on Next.js, PostgreSQL, an owner CMS, green light/dark themes, and Persian plus Kurdish Sorani RTL interfaces.

The current development milestone covers catalog browsing, category configuration, product variants, owner management, a browser cart, customer order reservations, operational order reporting, Persian-first blog publishing, and an explicitly local mock payment review. The mock is not a payment gateway: it does not move money, mark orders paid, or fulfill orders. Real payment collection and fulfillment remain later roadmap phases. See the [blog owner guide](docs/BLOG.md) for publishing instructions and current editor limits.

The store is named **صرفه**. Sample inventory covers rice, cooking oil, tomato paste, pantry staples and detergents, with package weight/volume variants. Local generated product photography has [recorded provenance](public/images/grocery/README.md). The supplied logo, grocery hero and delivery illustration establish the deep-green/yellow identity; their [asset notes](public/images/brand/README.md) explain source files and typography. The confirmed customer-facing unit is toman; stored money keeps an explicit ISO currency.

## Project contract

- [Engineering rules](AGENTS.md): implementation delegation, module boundaries, reuse, and completion requirements.
- [Architecture](docs/ARCHITECTURE.md): domain ownership, data model, authorization, extension protocol, operations.
- [Design system](docs/DESIGN_SYSTEM.md): green palette, themes, RTL/language behavior, responsive and accessibility criteria.
- [Roadmap](docs/ROADMAP.md): implementation phases, Luna work packages, acceptance scenarios, launch gates.
- [Review evidence](docs/REVIEW.md): actual verification results and remaining limitations.

## Local development

Use Node.js 22+ and npm. Install the locked dependencies, then run the app:

```bash
npm ci
npm run dev
```

Open localhost on port 3000. When `DATABASE_URL` is absent, the storefront uses explicitly labeled read-only sample data and CMS writes are disabled. When it is configured, the application reads and writes through PostgreSQL. Persian is the default; the language selector switches to Kurdish Sorani. Both layouts are RTL. The language choice does not change the product currency.

Checkout policy values are server-only environment settings. `CHECKOUT_SHIPPING_MINOR` and `CHECKOUT_TAX_MINOR` are explicit fixed amounts in the configured ISO currency's minor units; set their matching stable policy labels and `CHECKOUT_POLICY_ID` as well. Blank values keep checkout disabled. These settings are an implementation seam, not a verified Iranian tax or shipping rule. Production checkout is off unless `CHECKOUT_ENABLED=true`, and enabling it does not configure or activate BitPay payments.

For local checkout/UI review only, set `MOCK_PAYMENTS_ENABLED="true"` in `.env` and restart the development server. With no checkout policy configured, the demo uses clearly labeled zero toman delivery/tax estimates; use only disposable development data. Register/sign in at `/account/register` or `/account/login`, add an in-stock item, then visit `/checkout`. After creating a reservation, the customer can record an approved or declined mock attempt. The order stays `RESERVED` in either case. Never enable this mock in a production deployment.

## Local PostgreSQL and owner CMS

Open `http://localhost:3000/admin/login` to inspect the sign-in page. There is no default administrator email or password. Product/category editing requires a working PostgreSQL connection and the owner credentials below.

This project includes PostgreSQL 17 binaries and a data directory under the ignored `.local/postgresql/` folder. The local server is configured for `127.0.0.1:5432`; it is manually managed by the project scripts and does not install or register an operating-system service. Check its state, start it when stopped, and stop it when finished:

```bash
npm run db:local:status
npm run db:local:start
npm run db:local:stop
```

Run the lifecycle commands from the project host. A restricted execution sandbox may report PostgreSQL stopped because it cannot see the host process or network; confirm the host status before attempting to start it. If the development environment or machine restarts, check status and start PostgreSQL again. The local application role is `sarfe` and is intentionally not a PostgreSQL administrator. The local setup utility `node scripts/local-db-setup.mjs` is for a newly initialized, already running local cluster only; run it once as the local cluster administrator. It creates local app/test databases and writes randomized connection credentials to `.env`. Do not run it against an already provisioned cluster.

Keep `.env` local and untracked. Start from `.env.example` only when needed, and configure `DATABASE_URL`, a unique `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH`. Generate a password hash with `npm run admin:hash -- "your-long-owner-password"`; escape each `$` as `\$` in `.env` because Next.js expands unescaped dollar signs, even inside quotes. Do not put real credentials in docs, command history, or source control. For the provisioned local database, make sure `DATABASE_URL` points to the `sarfe_store` database.

Apply reviewed migrations and seed sample inventory in a development database:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Run the seed only against a disposable development database. Do not seed production. `/api/health` reports readiness only after a real database `SELECT 1`; it returns unavailable when the database is unconfigured or unreachable. The CMS has no default owner password or preview authentication bypass.

Workspace operations recorded November 8, 2026: the host PostgreSQL server was verified running on `127.0.0.1:5432`; migrations were applied to both the application and dedicated test databases; the development seed ran twice and produced five categories and five published products. A local custom-format dump with mode `0600` was restored to a separate temporary database; category/product/variant/migration counts matched at 5/5/9/2, then the temporary database was dropped. All 11 PostgreSQL integration tests passed, including real owner login and CMS create/edit/publish authorization checks, invalid-input rollback, active-reservation stock guards, concurrent order reservations, and one-time cancellation/expiry restoration. Browser review of the CMS is still pending; production backup retention/monitoring is not covered by the local restore drill. The seed remains strictly development-only.

Visit `/admin/login`. Publication controls determine which products appear publicly. Product variants carry SKU, typed category attributes, stock, price in integer minor units, and explicit ISO currency. Category and product editors use structured controls. The owner dashboard also provides `/admin/content` for editing Persian and Sorani homepage copy about nourishment, health awareness, food culture, and Sarfe, along with the hero and about images. Featured product imagery remains managed on each product. Uploads go through the owner-protected media endpoint and are written to `.local/media/products` during development; PostgreSQL stores the validated local paths and homepage translations. External image URLs are rejected. Configure durable shared/object storage before production uploads.

Blog posts are managed at `/admin/blog`; public posts appear at `/blog` and `/blog/[slug]`. Blog data requires the configured owner account and PostgreSQL migrations. Without a database, the blog shows a labeled empty preview and the editor is unavailable.

## Customer accounts and orders

Customers can create an account at `/account/register`, sign in at `/account/login`, update their profile, and view only their own order reservations at `/account`. Orders created while signed in are linked from the server-verified session; guest orders remain guest orders. The owner dashboard at `/admin/orders` filters reservations by date, status, customer identity, order ID, and SKU; it shows saved order/customer/address/item snapshots and can cancel an active reservation to release its stock. The admin overview at `/admin` includes date-filtered operational charts and counts for reserved, expired, and canceled orders. These are reservation reports, not revenue analytics. The current lifecycle has no real payment or fulfillment state. Do not use integration-test credentials as real accounts; configure and protect the production session secret and database before public registration.

For a schema change, create and inspect a development migration with `npm run db:migrate -- --name descriptive_change`. Commit the migration through the project's normal review process. Deployments apply reviewed migrations once with `npm run db:deploy`; do not run the development migration command in production.

## Backup and restore

The bundled PostgreSQL tools can make and restore local custom-format backups. Run them only when `DATABASE_URL` is securely available in the current shell, and keep backup files outside the repository in encrypted storage with restricted permissions. For the local server:

```bash
export LD_LIBRARY_PATH="$PWD/.local/postgresql/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
PGTOOLS="$PWD/.local/postgresql/root/usr/lib/postgresql/17/bin"
umask 077
"$PGTOOLS/pg_dump" --format=custom --no-owner --dbname="$DATABASE_URL" --file="/secure-backups/sarfe-store.dump"
```

Create the backup destination directory in advance or replace `/secure-backups` with an existing restricted, encrypted location. Restore drills must target a separate, empty database, never the active application database. Create that target with the local cluster administrator or managed-database administrator, set `RESTORE_DATABASE_URL` to it through the approved secret mechanism, then restore and verify application reads:

```bash
"$PGTOOLS/pg_restore" --no-owner --exit-on-error --dbname="$RESTORE_DATABASE_URL" "/secure-backups/sarfe-store.dump"
```

The `sarfe` application role cannot create databases. Production backup retention, encryption, monitoring, point-in-time recovery, and restore drills must use the managed PostgreSQL provider's supported procedures. The local dump command alone is not production backup evidence.

## Production deployment

Production needs a separately provisioned managed PostgreSQL database, TLS/pooling settings from its provider, secret-managed owner credentials, reviewed migrations, and a controlled build/deploy workflow. Set `APP_URL` to the public HTTPS origin. Indexing stays disabled unless `STORE_INDEXABLE=true` is explicitly set in production with a valid public HTTPS `APP_URL`. Never use the local `.local/postgresql` cluster as production infrastructure.

Deployment migrations use `npm run db:deploy` after review; sample seeding is development-only. After deploy, verify `/api/health`, public catalog visibility, protected CMS behavior, and operational alerts. SEO/headers and local database lifecycle groundwork do not complete the production launch gate; see [review evidence](docs/REVIEW.md) and [roadmap](docs/ROADMAP.md).

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run test:postgres
npm run db:validate
npm run build
```

Prisma validation requires a syntactically valid `DATABASE_URL`; migration and seed verification require a running PostgreSQL instance. Read the review record before treating a phase as verified or preparing a public deployment.
# sarfe
