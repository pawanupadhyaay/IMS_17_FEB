# Samay product enrichment pipelines

Brand-by-brand scrapers that pull **official manufacturer** PDP copy, specs, and image URLs into IMS-ready CSV + SEO JSON.

Rules (see repo-root `New_Joinee_Product_Enrichment_Task.md`):

- Prefer **official brand** sites for images and copy.
- **India miss-recovery** (shared `lib/retailerFallback.js`; Tata Cliq always in chain unless skipped):
  - Balmain: **Tata Cliq Luxury** (`source: tatacliq`)
  - Longines / Rado: **Collective → Tata Cliq → TGT Luxe → Ethos**
  - Emporio Armani / Armani Exchange: **Amazon.in → Tata Cliq → Ethos**
  - Ethos often Cloudflare-blocks Node; use REF URLs / `fixtures/ethos-{SKU}.html`. Helios stays out of scope.
- Keep existing IMS `price` / `inventory` unless missing and explicitly approved (`--include-price` is opt-in).
- **Publish policy:** `Approved enrichment ⇒ isPublished true immediately (sold-out allowed).`
  - **Scrape / Scan / Pull alone never publishes** (`scrape ≠ approve`).
  - **Approve** (IMS **Approve & go live**) or **apply from an approved batch** (`apply-*-batch.js`, preview approve) sets `isPublished=true` when title + ≥1 usable image exist — inventory may be **0**.
- **Staff wins (non-destructive merge):** scraped data only fills empty/null/blank fields on existing products. Non-empty title, description, specs, prices, and images are never overwritten unless `--force-overwrite` / `forceOverwrite=true` (default **OFF**). See `lib/merge.js`.

**Canonical path:** all enrichment lives under `scripts/enrichment/` (this folder). The top-level `enrichment/` directory only redirects here.

## Titan

Playbook: [`playbooks/titan.md`](playbooks/titan.md)

### Run (reference SKU NU95198WM01)

```bash
cd scripts/enrichment

# Offline / Cloudflare bypass: parse saved official HTML
node run-titan.js NU95198WM01 --html fixtures/NU95198WM01.html --download-images --out output/titan-NU95198WM01

# Alias fixture + site style code also work
node run-titan.js 95198WM01 --html fixtures/titan-95198WM01.html --prefer-fixture --out output/titan-NU95198WM01
```

SKU mapping: IMS `NU95198WM01` ↔ site style `95198WM01` / pid `nu95198wm01`. Constrained fields go through shared [`lib/normalize.js`](lib/normalize.js) (no brand-local enum maps).

## Titan

Playbook: [`playbooks/titan.md`](playbooks/titan.md)

Official site is **titan.co.in** (SFCC / Demandware, INR). IMS SKUs use a `NU` prefix; the site uses style code `95198WM01` / pid `nu95198wm01`.

### Run (reference SKU NU95198WM01)

```bash
cd scripts/enrichment

# Fixture parse (recommended — Cloudflare often blocks Node HTML)
node run-titan.js NU95198WM01 --html fixtures/NU95198WM01.html --download-images --out output/titan-NU95198WM01

# Style code form is equivalent
node run-titan.js 95198WM01 --prefer-fixture --download-images

# Live fetch (may 403 behind Cloudflare)
node run-titan.js NU95198WM01 --download-images --out output/titan-live-NU95198WM01

# From input CSV
node run-titan.js --csv input/titan-skus.csv --prefer-fixture --download-images
```

Preview UI: select **Brand → Titan**, SKU `NU95198WM01`, check **Use HTML fixture** if live fails.

### Notes (Titan)

- Cloudflare frequently blocks Node/curl HTML; static Catalog images usually still download.
- Gender `Women` → `Female`; `Metal` → `Stainless Steel`; `24 Months` → `2 years`.
- Dial `Purple` → IMS `Purple` (added to dialColor / strapColor options).
- INR sale/MRP stay in `priceSource` unless `--include-price`.
- **`TWEG*` is Timex**, not Titan — use the Timex pipeline below.

## Timex

Playbook: [`playbooks/timex.md`](playbooks/timex.md)

Official India store: **shop.timexindia.com** (Shopify, INR). IMS model numbers are `TWEG*`.

```bash
cd scripts/enrichment

node run-timex.js --csv input/timex-skus.csv --download-images --out output/timex-batch
# or single SKU
node run-timex.js TWEG26300 --download-images --out output/timex-batch
```

Preview UI: select **Brand → Timex**, SKU `TWEG26300`.

## Rado

Playbook: [`playbooks/rado.md`](playbooks/rado.md)

Official India site: **rado.com/en_in** (Magento / Hyvä). Resolve PDPs via `media/sitemap_en_in.xml` (`…/{slug}-{sku}.html`). Reference SKU **R48921703** (Florence Diamonds).

```bash
cd scripts/enrichment
node run-rado.js R48921703 --download-images --out output/rado-batch
node run-rado.js --csv input/rado-skus.csv --download-images --out output/rado-batch
node run-rado.js R48921703 --prefer-fixture
```

Preview UI: select **Brand → Rado**, SKU `R48921703`. Official miss → Collective / Tata Cliq / TGT Luxe (same as Longines).

## Emporio Armani

Playbook: [`playbooks/emporio-armani.md`](playbooks/emporio-armani.md)

Official **armani.com** first (JSON-LD + Nuxt specs / `assets-cf.armani.com` images). On miss or bot wall → **Amazon.in**. Reference SKU **AR70021**.

```bash
cd scripts/enrichment
node run-emporio-armani.js AR70021 --download-images --out output/emporio-armani-batch
node run-emporio-armani.js --csv input/emporio-armani-skus.csv --download-images --out output/emporio-armani-batch
node run-emporio-armani.js AR70021 --prefer-fixture
node run-emporio-armani.js AR70021 --amazon-only --amazon-url 'https://www.amazon.in/Emporio-Armani-Black-Watch-AR70021/dp/B0H8YBZ2L9'
```

Preview UI: select **Brand → Emporio Armani**, SKU `AR70021`. Progress: `#progress/emporio-armani`.

## Armani Exchange

Playbook: [`playbooks/armani-exchange.md`](playbooks/armani-exchange.md)

Official **armani.com** first (JSON-LD + Nuxt specs / `assets-cf.armani.com` images). On miss or bot wall → **Amazon.in**. Reference SKU **AX5742**. Distinct from Emporio Armani (`AR*` / `emporio-armani-batch`).

```bash
cd scripts/enrichment
node run-armani-exchange.js AX5742 --download-images --out output/armani-exchange-batch
node run-armani-exchange.js --csv input/armani-exchange-skus.csv --download-images --out output/armani-exchange-batch
node run-armani-exchange.js AX5742 --prefer-fixture
node run-armani-exchange.js AX5742 --amazon-only --amazon-url 'https://www.amazon.in/Armani-Exchange-Womens-Three-Hand-Stainless/dp/B0HKY9XL53'
```

Preview UI: select **Brand → Armani Exchange**, SKU `AX5742`. Progress: `#progress/armani-exchange`.

## Balmain

Playbook: [`playbooks/balmain.md`](playbooks/balmain.md)

### Run (reference SKU B48303382)

```bash
cd scripts/enrichment

# Live fetch + stage images (preferred when network allows)
node run-balmain.js B48303382 --download-images --out output/live-B48303382

# Offline / Akamai bypass: parse saved official HTML
node run-balmain.js B48303382 --html fixtures/B48303382.html

# From input CSV
node run-balmain.js --csv input/balmain-skus.csv --html fixtures/B48303382.html

# Force official PDP URL
node run-balmain.js B48303382 --url 'https://www.balmainwatches.com/en/balmain-sedirea-woman-swiss-quartz-watch-31mm-sapphire-b48303382.html'

# India-only / official 404 → Tata Cliq Luxury fallback (CSV column tataCliqUrl also works)
node run-balmain.js B41023124 --tatacliq-url 'https://luxury.tatacliq.com/balmain-classic-r-men-41-mm/p-mp000000008717054' --download-images
```

Or from repo root:

```bash
node scripts/enrichment/run-balmain.js B48303382 --download-images --out scripts/enrichment/output/live-B48303382
```

### Output

Written under `output/<timestamp>/` (or `--out`):

| File | Purpose |
|------|---------|
| `products.json` | Full extracted fields + extras + SEO |
| `import.csv` | Matches `GET /api/import/sample` (one row per image) |
| `seo.json` | Sidecar for Product Modal / PATCH (import CSV has no SEO columns) |
| `not_found.json` | SKUs that did not resolve (never silent) |
| `images/` | Only if `--download-images` |

### Merge policy (staff wins)

Implemented in [`lib/merge.js`](lib/merge.js):

| Situation | Behaviour |
|-----------|-----------|
| Existing field empty/null/blank | **fill** from scrape |
| Existing field already set | **skip** (keep staff) |
| Images already present **and reachable** | **skip** gallery |
| No images yet, or all URLs broken/403/404 | **fill** gallery (broken treated as empty) |
| New SKU | apply all non-empty scraped fields |
| `--force-overwrite` | replace non-empty fields (destructive; off by default) |
| Scrape / Scan / Pull | **never** sets `isPublished` (`scrape ≠ approve`) |
| Approve / approved-batch apply | **`isPublished=true` immediately** if title + ≥1 image (inventory 0 OK) |

Policy string: **Approved enrichment ⇒ isPublished true immediately (sold-out allowed).** See [`lib/publishOnApprove.js`](lib/publishOnApprove.js).

CLI: pass `--existing products-from-ims.json` so `import.csv` blanks already-set cells (IMS import only writes non-empty cells). Writes `merge-report.json`.

IMS CSV import (`POST /api/import/csv`) also applies the same fill-empty-only patch on updates unless `?forceOverwrite=true`.

Preview UI: **Merge preview** panel → `POST /api/merge-preview` (sample existing product, or live IMS on `:5055` when authorized).

### Local preview UI

Minimal browser UI to verify a scrape (title, specs, price note, images, merge fill/skip, raw JSON). Supports **Balmain / Titan / Timex / Tissot / Fossil / Casio / Seiko / Longines / Rado / Emporio Armani / Armani Exchange** via a brand select. Not the storefront. See [`playbooks/brands-status.md`](playbooks/brands-status.md).

```bash
node scripts/enrichment/preview-server.js
# open http://localhost:5056
```

Or from this folder: `node preview-server.js`. Port defaults to **5056** (`PORT` env overrides). Check **Use HTML fixture** if live Akamai/Cloudflare fetch fails. **Download images** stages files under `output/preview-<SKU>-…/images/` and serves them at `/media/…`.

Reviewer host (Cloudflare Tunnel): **https://samay-test.cognaitive.in** → local `:5056` (named tunnel; see `scripts/enrichment/tunnel/`).

### Constrained field normalization

IMS Product Modal / Dashboard dropdowns (`frontend/src/constants/productOptions.js`) and store filters expect fixed option strings. Scrapes often differ in wording/casing. Shared normalizer: [`lib/normalize.js`](lib/normalize.js) (+ [`lib/gender.js`](lib/gender.js) for gender). Applied on Balmain/Tata Cliq scrape, `scrapedToIncoming` / Scan·Pull merge, and CSV import. **Unknown → blank** (never invent outside the allowed set).

| Field | Allowed (IMS) | Scrape synonyms → normalized | Unknown |
|-------|---------------|------------------------------|---------|
| `gender` | Male, Female, Unisex, Pair | Women/Woman/Ladies → **Female**; Men/Man/Gent → **Male**; Unisex/Universal → **Unisex** | blank |
| `movement` | Quartz, Automatic, Mechanical, Solar-Powered, Kinetic, Eco-Drive, Hybrid, Smart | swiss quartz → Quartz; self-winding → Automatic; … | blank |
| `caseShape` | Round, Square, Rectangular, Hexagonal, Octagon, Oval, Asymmetrical, Tonneau | circle → Round; rectangle → Rectangular; … | blank |
| `caseMaterial` | Stainless Steel, Titanium, Gold, Rose Gold, Silver, Plastic, Ceramic, Carbon Fiber, Brass, Aluminum, Resin, Rubber | stainless steel → **Stainless Steel**; steel → Stainless Steel | complex PVD/bicolor phrases → blank |
| `strapMaterial` | Leather, Stainless Steel, Rubber, Silicone, Fabric, Titanium, Ceramic, NATO, Mesh, Gold Plated, Carbon Fiber, Alligator/Crocodile/Calf Leather, Synthetic, Yellow/Red PVD Coating | bracelet → Stainless Steel; nylon → Fabric; … | blank |
| `dialColor` / `strapColor` | Black…Bordeaux list in `productOptions.js` | Mother of Pearl variants → Mother of Pearl; Multicolor → Multi Color; Yellow Gold → Gold; Mirror gold → Gold; gray → Grey | blank |
| `waterResistance` | `10m (1 ATM)` … `1000m (100 ATM)`, Not Water Resistant | `5 bar (~50m)` / `50 m` → **50m (5 ATM)**; `20 bar` → **200m (20 ATM)** | blank |
| `warrantyPeriod` | `1 years` … `7 years` (lowercase “years”) | `2 Years` → **2 years** | blank |
| `category` | Analog, Fashion, Mass, Digital, Smartwatch, Chronograph, Diving, Sports, Luxury, Casual, Formal, Vintage, WatchMaker | case-insensitive exact / common synonyms | blank (usually filled from Brand) |
| `brand` | Brands collection name | `balmain` → Balmain; else trim (prefer exact Brand name match when provided) | keep trimmed |
| `isPublished` | boolean | **never** set by scrape/pull; **Approve / approved-batch apply** sets `true` immediately when title + ≥1 image (sold-out OK) | — |

**Free-text (no enum map):** `title`, `description`, `sku`, `caseSize` (formatted to `NNmm`), `price` / `oldPrice` / `inventory`, SEO fields, `images`, `slug`.

### Notes

- Does **not** set IMS `price` / `inventory` by default (CHF on brand site ≠ INR; Tata Cliq INR also stays in `priceSource` only unless `--include-price`).
- Products include `source: "balmainwatches" | "tatacliq"` — preview UI shows a source badge.
- Strap color is inferred from Case/Outer when Balmain omits a dedicated attribute (official site), then mapped to strapColor options.
- Image URLs prefer uncached Magento paths (`/media/catalog/product/...` without `/cache/<hash>/`); Tata Cliq uses SuperZoom CDN URLs.
- Akamai may block Node/curl on the brand site; use `--html fixtures/<SKU>.html` or browser-saved PDP when live fetch fails. Tata Cliq HTML has been reachable without bot walls so far.
- **IMS UI:** **Get details** on New listings row actions, main inventory list, and Product Modal for **Balmain / Titan / Timex / Tissot / Fossil / Casio / Seiko / Longines / Rado / Emporio Armani / Armani Exchange** (routes by `product.brand` to `POST /api/products/:id/enrich` or brand-specific paths; fill-empty; does **not** publish). **Approve & go live** (owner/admin) publishes immediately.
- **Approved batch apply:** `node scripts/enrichment/apply-balmain-batch.js` (publish default **ON**) and `node scripts/enrichment/apply-titan-batch.js` (`--publish` / `--mark-approved` or brand already in `output/review-approved.json`). Opt out with `--no-publish`. Retrofit unpublished Balmain: `node scripts/enrichment/publish-approved-balmain.js`.

### Next steps after a successful run

1. Import `import.csv` via IMS CSV import (BASIC + images). Existing SKUs only get empty-field fills unless force overwrite.
2. Patch SEO from `seo.json` in Product Modal or API (same staff-wins rules recommended).
3. Verify on `/new-listings` → Brand **Balmain** — chips should clear (price chip stays if IMS price was already 0).
