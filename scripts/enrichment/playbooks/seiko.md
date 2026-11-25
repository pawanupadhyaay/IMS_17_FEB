# Seiko enrichment playbook

- **Official India store (preferred):** https://seikowatches.co.in/
  - PDP: `https://seikowatches.co.in/products/{handle}`
  - Example: https://seikowatches.co.in/products/seiko-145th-anniversary-limited-edition-astron-in-edo-purple-hab011j1 (`HAB011J1`)
  - Specs: Shopify `body_html` Product Features bullets (`Gender : Men`, `Movement : GPS Solar`, …). Images on `cdn.shopify.com`.
  - Variant `barcode` often holds the IMS SKU; `sku` may be a numeric EAN.
- **Global fallback:** https://www.seikowatches.com/ (prefer **in-en**)
  - PDP: `https://www.seikowatches.com/{locale}/products/{collection}/{slug}`
  - Soft-404: HTTP 200 + `og:url` → `/error/404` — treat as not found (`404-report.json`).
- Resolve order: `official_url` → predictive `/search/suggest.json` → handle/`products.json` catalog → **fixtures** (CF) → Marsflag + global heuristics.
- Discovery (India): suggest API, URL `…-{sku}`, Shopify `products.json` pages (~319 SKUs), optional catalog crawl.
- Field normalization: shared `lib/normalize.js`. Price INR — leave IMS price alone unless `--include-price`.
- **Do not** use Ethos/Helios. **Do not auto-publish.**
- Blockers: **Cloudflare** on `seikowatches.co.in` for Node (fixture-first). Save `fixtures/<SKU>.json` from browser when live is challenged.
- Leftovers not on India or global: `HGK008P1`, `SKK721P1`, `SNKN58K1`, `SSC763P1`, `SWR080P1`.

## CLI

```bash
cd scripts/enrichment
node run-seiko.js HAB011J1 --prefer-fixture --download-images --out output/seiko-proof
node run-seiko.js --csv input/seiko-skus.csv --out output/seiko-batch --prefer-fixture
node run-seiko.js SPB121J1
```

## IMS

- **Get details** → `POST /api/products/:id/enrich` or `/enrich/seiko`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Seiko**
