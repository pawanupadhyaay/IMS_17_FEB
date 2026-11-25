# Emporio Armani enrichment playbook

- Official site: https://www.armani.com/en/emporio-armani/
- PDP pattern: `https://www.armani.com/en/emporio-armani/{slug}-cod-{SKU}-{COLOR}/`
  - Example: https://www.armani.com/en/emporio-armani/quartz-watch-cod-AR70021-NLP-NLC/
  - India locale: `/en-in/emporio-armani/…` (same SKU path)
- IMS SKUs are compact refs (`AR70021`).
- Resolve: known `REF_URLS` / CSV `official_url` → live armani.com → on miss/block **Amazon.in → Tata Cliq → Ethos**.
- Specs: JSON-LD Product + Nuxt `__NUXT_DATA__` `technicalDetails` (`<br>`-separated: movement, dial, size, case, strap color, strap material, water).
- Images: prefer `assets-cf.armani.com` CDN; retailer images only on miss.
- Gender: `productgender` attr / woman breadcrumb → Female.
- Price: official often USD on ROW; retailer INR — leave IMS price alone unless `--include-price`.
- Fallbacks: `--amazon-url` / CSV `amazon_url`; Tata Cliq REF URLs in `lib/retailerFallback.js` (e.g. AR11123, AR1704); Ethos last.
- Official fixture: `fixtures/emporio-armani-AR70021.html`. Enrichment does **not** auto-publish.

## CLI

```bash
cd scripts/enrichment
node run-emporio-armani.js AR70021 --download-images --out output/emporio-armani-batch
node run-emporio-armani.js --csv input/emporio-armani-skus.csv --download-images --out output/emporio-armani-batch
node run-emporio-armani.js AR70021 --prefer-fixture
node run-emporio-armani.js AR70021 --amazon-only --amazon-url 'https://www.amazon.in/Emporio-Armani-Black-Watch-AR70021/dp/B0H8YBZ2L9'
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/emporio-armani`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Emporio Armani** / `#progress/emporio-armani`
