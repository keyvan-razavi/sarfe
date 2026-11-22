# صرفه design system

## Direction

Food and wellbeing editorial with a grocery store as one practical path: confident Persian/Sorani typography, generous image areas, quiet surfaces, and green used with purpose. The homepage uses a split-stage composition: an owner-managed food photograph stays sticky within a bounded editorial frame beside the story column on desktop; on mobile the image leads the stacked reading flow. The image frame must not grow with very tall viewports, which can crop square food photography into a narrow strip. Health awareness and food culture lead into a separate store section. The site canvas is centered and capped at 1440px while individual reading measures remain narrower.

صرفه’s confirmed inventory direction is rice, cooking oil, tomato paste, pantry groceries, detergents, and essential food staples. Use cohesive green-and-neutral grocery photography and clear packaging/quantity information. Generated images and sample prices remain explicitly labeled preview content. Do not fabricate brands, reviews, ratings, customer counts, health claims, environmental claims, or discounts. Verify packaging and images against actual inventory before launch and record image provenance.

The user supplied a logo and grocery imagery on November 8, 2026. The original logo JPEG remains preserved; the shared logo component uses its extracted alpha silhouette and semantic foreground token so the green rectangle does not appear. Hero, category, and sample product images use local files under `public/images/grocery`; the storefront does not request remote image URLs. Owners can upload product images in the CMS; development files live under `.local/media/products`, while PostgreSQL stores their local asset paths. Replace sample imagery with verified inventory photos before launch, and configure durable production media storage before enabling uploads there.

The supplied files are JPEG artwork, not font files. The raster logo preserves the exact supplied lettering. Interface typography follows the references' bold Persian style using an Arabic-capable local/system font stack, with normal letter spacing and adequate line height. Exact font matching requires the original licensed font binaries. Promotional text embedded in the supplied posters is reference content; it does not configure shipping, pickup, pricing or inventory policies.

## Color roles

Use semantic CSS custom properties. Components use roles rather than literal colors. These values are design starting points; verify actual foreground/background pairs, including interactive states.

| Role          | Light     | Dark      | Purpose                            |
| ------------- | --------- | --------- | ---------------------------------- |
| Background    | `#F5F7F2` | `#101B17` | Main page canvas                   |
| Surface       | `#FFFFFF` | `#182820` | Inputs, content surfaces           |
| Surface muted | `#E9EFE8` | `#21382C` | Quiet grouping and media ground    |
| Text          | `#172C24` | `#EFF6EE` | Primary readable content           |
| Muted text    | `#506359` | `#B3C6B7` | Supporting text                    |
| Primary       | `#153E35` | `#99D5BC` | Primary actions and active choices |
| On primary    | `#FFFFFF` | `#10271D` | Text on action background          |
| Border        | `#C6D4C9` | `#496253` | Controls and functional dividers   |
| Focus         | `#237758` | `#B6ED8A` | Visible keyboard outline           |

The supplied identity adds fixed roles in both themes: `--color-brand-green: #00472C`, `--color-brand-yellow: #FFD400`, and `--color-brand-ink: #00472C`. General interface surfaces continue to follow the selected theme. Yellow against brand green has approximately 7.57:1 contrast; use yellow text on the green brand field rather than pale interface surfaces.

Define semantic success, warning and destructive roles in both themes. Errors also use text and icons; selection uses text/weight/state as well as color. Marketing surfaces use flat color. Reserve shadows for floating dialogs and menus.

## Type and spacing

The required languages are Persian and Kurdish Sorani, both RTL. Default to Persian, provide an accessible language selector, set the correct document language, and use logical CSS properties. Choose a font with Persian and Sorani glyph coverage; reliable local fallbacks include Tahoma and a suitable Arabic sans family. Validate joined letters, Kurdish characters, mixed-script SKUs, numeric prices, and long translated labels. Use `bdi` or explicit direction for URLs/SKUs when needed. Translate navigation, empty/error states, forms, cart and CMS. Keep currency separate from locale.

Admin reporting dates use the Jalali calendar. A single paired date-range picker displays and selects both boundaries together, while its submitted values remain validated ISO Gregorian dates for stable server filtering. Report date labels and order timestamps use Jalali formatting in Tehran time.

Start with a reliable Arabic-capable system sans stack (`Noto Sans Arabic`, `Vazirmatn`, then Tahoma) to avoid build-time font downloads. Use locale-aware Persian/Sorani numerals with tabular numeral spacing in tables and prices. Add one locally hosted display family when licensed brand typography is chosen. Body and form text is at least 16px. Small utility text remains comfortably readable. Keep display headlines short; use fluid sizes without clipping or forced multi-line wraps.

Use a 4px spacing base with a small named scale. Mobile gutters 16–20px, desktop 24–40px. Use a consistent content width. Let editorial sections breathe; keep catalog browsing and CMS forms dense enough for their tasks. Choose one control radius and use it consistently. Use at least 44px target sizes for primary controls.

## Reusable components

Shared primitives: Button with semantic variants and loading/disabled behavior; Input, Select, Textarea, Field with label/help/error linkage; Badge; empty/error states; layout/container helpers; theme toggle. Domain components: ProductCard, ProductGrid, VariantSelector, Price, QuantityControl, ProductForm and CategoryForm. Repeated validation, formatting, loading, and error behavior belongs in a common helper or field component.

Keep form guidance from increasing page height under every control. Put short examples in placeholders and longer instructions behind a compact, keyboard-accessible tooltip beside the field or section label. Keep validation errors visible next to the affected field.

Use native HTML semantics first. A link navigates; a button performs an action. Forms expose pending and success/failure states. Validation errors identify the affected field. Password fields use correct autocomplete. Mobile navigation exposes expanded state and remains keyboard usable. A future dialog must manage focus, Escape and return focus.

## Theme behavior

Support system, light, and dark preferences. Set the initial theme before paint, persist explicit choices, and react to OS changes while system mode is active. Set `color-scheme` for native controls. Maintain image and logo readability in both themes. Theme choice is preference data, separate from commerce state.

## Admin and customer workspaces

Dashboard pages use a task-first hierarchy: identify the current workspace and page, show the primary next action, then group summaries, filters, and records by purpose. Admin navigation marks the current route and stays touch-scrollable on narrow screens. Metric blocks use Persian/Sorani locale numerals and concise labels; operational reservation counts must not be presented as revenue. Filters remain visible and retain their submitted values. Order records expose status, date, identity, and a direct detail action without requiring users to open each record to understand its state.

Customer account pages prioritize order history, make account and shopping actions easy to find, and provide a useful first-order empty state. Order detail separates line items and totals from delivery information. Tables may scroll inside a named, keyboard-focusable region on small screens; the page itself must not overflow horizontally. Keep mock-payment language visibly marked as a simulation and keep account/order content in the active RTL locale.

Blog pages use the same semantic theme tokens and RTL typography while giving article text a calm reading measure and clear H2/H3 hierarchy. The owner editor uses labeled fields and explicit block controls for adding, moving, and removing content; its preview is a block preview, not a full WYSIWYG surface. Tags and cover metadata are shared across locales, while article text and SEO fields can use Sorani with Persian fallback. Keep image alternatives meaningful and links visibly identifiable. Blog editor and public-page browser review remains pending; see the [blog owner guide](BLOG.md) and [roadmap](ROADMAP.md).

The homepage hero and about photographs are editable in the owner content panel with localized alt text; featured product photos come from the product CMS. Keep editorial images owner-managed rather than embedding fixed asset mappings into the public page. The global 1440px cap applies consistently across routes, with full responsive width below that limit.

## Responsive acceptance

Review 390px phone, 768px tablet and 1440px desktop; also test narrow 320px layouts, landscape, 200% zoom and long names. Product grids must retain usable prices/actions; forms become one column; CMS tables either transform or scroll inside a labeled region. Page-level horizontal overflow is a failure. All navigation and variant/cart actions must work with touch and keyboard.

Target WCAG 2.2 AA: ordinary text contrast at least 4.5:1, large text and meaningful UI boundaries at least 3:1, visible focus, proper labels, landmark structure, descriptive image alternatives, and status announcements. Honor reduced motion, preserve readable content when animation fails, and keep interactions responsive. Avoid motion that delays buying tasks.

## Visual review evidence

Capture both themes and representative catalog, product, cart and CMS screens at mobile and desktop widths. Record defects, fix the three most material problems, then capture again. Run the frontend skill's linter and browser inspector when available; explain any tool limitations and intentional commerce-specific deviations in `docs/REVIEW.md`.
