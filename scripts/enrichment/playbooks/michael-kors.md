# Michael Kors enrichment playbook

- Official site: https://www.michaelkors.com/ (SFCC / Fossil Group)
- PDP pattern: `https://www.michaelkors.com/{slug}/{SKU}.html`
  - Example: https://www.michaelkors.com/mini-lexington-black-tone-watch/MK7688.html
- IMS SKUs are compact (`MK7688`).
- Resolve: `--url` / CSV `official_url` → `REF_URLS` → search probe → fixture.
- Specs: PDP bullet list (`• Stainless steel`, `• 33mm case`, …) + JSON-LD Product.
- Images: `assets.michaelkors.com/transform/ECOM_Image_Large/…/MK7688-…` — SKU-strict filter; sniff bytes via `imageExtFromBuffer` / `lib/imageDownload.js`.
- Field normalization: shared `lib/normalize.js` (Quartz; Stainless Steel; case size; strap colour; Women→Female).
- Price: USD on michaelkors.com — leave IMS price alone unless `--include-price`.
- Enrichment does **not** auto-publish. Prefer official MK CDN; retailers only on miss.
- **Blockers:** Akamai **403** for Node/curl. Save browser PDP HTML to `fixtures/michael-kors-<SKU>.html` and use `--prefer-fixture`. CDN image URLs remain reachable.

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
node run-michael-kors.js MK7688 --url 'https://www.michaelkors.com/mini-lexington-black-tone-watch/MK7688.html' --prefer-fixture --download-images --out output/michael-kors-batch
node run-michael-kors.js --csv input/michael-kors-skus.csv --prefer-fixture --download-images --out output/michael-kors-batch
node run-michael-kors.js MK7688 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/michael-kors`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Michael Kors** / `#progress/michael-kors`
