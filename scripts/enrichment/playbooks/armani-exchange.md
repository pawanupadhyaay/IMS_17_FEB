# Armani Exchange enrichment playbook

- Official site: https://www.armani.com/ (Armani Exchange line)
- PDP pattern: `https://www.armani.com/en-in/armani-exchange/{slug}-cod-{SKU}-{COLOR}/`
  - Example: https://www.armani.com/en-in/armani-exchange/quartz-watch-cod-AX5742-NLP-NLC/
- IMS SKUs are compact refs (`AX5742`). Site uses the same reference in the URL / Nuxt payload.
- Resolve: `options.officialUrl` / CSV `official_url` / `REF_URLS` → fixtures → live fetch → search soft-fallback.
- Specs: JSON-LD Product + Nuxt `__NUXT_DATA__` `technicalDetails` (`<br>`-separated unlabeled list) + editorial description.
- Images: prefer `assets-cf.armani.com/image/upload/…` URLs containing the SKU (`_F_`, `_D_`, `_R_`).
- Field normalization: shared `lib/normalize.js`.
- Price: may be USD/EUR/INR on armani.com locale — leave IMS price alone unless `--include-price`.
- Fallbacks on official miss/block: **Amazon.in → Tata Cliq Luxury → Ethos** (`lib/retailerFallback.js` preset `armani`). Tata Cliq REF recoveries include AX2706, AX2716, AX4301. Pass `--amazon-url` or CSV `amazon_url` when needed.
- Blockers: bot walls / region catalog on armani.com; Amazon captcha; Ethos Cloudflare. Fixtures: `fixtures/armani-exchange-{SKU}.html`, `fixtures/amazon-{SKU}.html`, `fixtures/ethos-{SKU}.html`.
- Enrichment does **not** auto-publish.
- Distinct from **Emporio Armani** (`emporio-armani` / `AR*` SKUs) — do not share batch dirs.

## CLI

```bash
cd scripts/enrichment
node run-armani-exchange.js AX5742
node run-armani-exchange.js AX5742 --url 'https://www.armani.com/en-in/armani-exchange/quartz-watch-cod-AX5742-NLP-NLC/'
node run-armani-exchange.js AX5742 --amazon-url 'https://www.amazon.in/Armani-Exchange-Womens-Three-Hand-Stainless/dp/B0HKY9XL53'
node run-armani-exchange.js --csv input/armani-exchange-skus.csv --download-images --out output/armani-exchange-batch
node run-armani-exchange.js AX5742 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/armani-exchange`
- Brand label: **Armani Exchange** (also accepts `AX` alias in detector)
- Fill-empty only; does **not** publish

## Preview

- Brand **Armani Exchange** / `#progress/armani-exchange`
