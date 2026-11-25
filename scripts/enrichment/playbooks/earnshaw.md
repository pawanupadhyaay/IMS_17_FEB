# Earnshaw enrichment playbook

- Official site: https://thomas-earnshaw.com/ (Shopify)
- PDP pattern: `https://thomas-earnshaw.com/products/{handle}`
  - Example: https://thomas-earnshaw.com/products/engineer-arkwright-skeleton-automatic-trafalgar-teal-es-8334-44
- Product JSON: append `.json` to the PDP path (Shopify).
- IMS SKUs are hyphenated (`ES-8334-44`). Compact merge key strips separators (`ES833444`).
- Resolve: `--url` / CSV `official_url` → `REF_URLS` → Shopify predictive search → handle probe.
- IMS typo map: `ES-8006-ll` → `ES-8006-II` (ll/II lookalike).
- Specs: PDP specifications table (`table_title` / `table_content`). Water resistance uses the **active** ATM marker (e.g. 5 ATM).
- Images: Shopify CDN filenames containing the SKU (`ES-8334-44-*.png|jpg`). SKU-strict filter; sniff bytes via `imageExtFromBuffer` / `lib/imageDownload.js`.
- Field normalization: shared `lib/normalize.js` (Automatic; Stainless Steel; case size; strap colour).
- Price: USD on thomas-earnshaw.com — leave IMS price alone unless `--include-price`.
- Enrichment does **not** auto-publish. Prefer official Earnshaw CDN; retailers only on miss.

## India retailer fallback (official miss only)

Shared chain (`lib/retailerFallback.js` preset `luxury`):

1. **The Collective** (`source: thecollective`)
2. **Tata Cliq Luxury** (`source: tatacliq`) — always kept in chain
3. **TGT Luxe** (`source: tgtluxe`)
4. **Ethos** (`source: ethos`) — miss-recovery; CF may require `fixtures/ethos-{SKU}.html`

Pass `--collective-url` / `--tatacliq-url` / `--tgtluxe-url` / `--ethos-url` when search is flaky.

## CLI

```bash
cd scripts/enrichment
node run-earnshaw.js ES-8334-44 --url 'https://thomas-earnshaw.com/products/engineer-arkwright-skeleton-automatic-trafalgar-teal-es-8334-44'
node run-earnshaw.js --csv input/earnshaw-skus.csv --download-images --out output/earnshaw-batch
node run-earnshaw.js ES-8334-44 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/earnshaw`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Earnshaw** / `#progress/earnshaw`
