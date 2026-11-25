# Tissot enrichment playbook

- Official India site: https://www.tissotwatches.com/en-in/
- PDP pattern: `https://www.tissotwatches.com/en-in/{SKU}.html`
  - Example: https://www.tissotwatches.com/en-in/T1564103337100.html
- IMS SKUs are compact (no dots). Site accepts compact path; dotted display form (`T156.410.33.371.00`) appears in page copy.
- Specs: “Watch technical data” section + JSON-LD `Product`.
- Images: `…/Sites-Tissot-Catalogue/…/product-pictures/…` (and `/dw/image/v2/…` CDN variants). Prefer Shadow / DETAIL / B1 / PROFIL / WRIST for the SKU; skip strap thumbs (`T605_*`, `T852_*`).
- Field normalization: shared `lib/normalize.js`. Examples: Burgundy→Bordeaux; Quartz three hands→Quartz; 316L stainless steel & PVD→Stainless Steel; 10 bar→`100m (10 ATM)`; 2 Years of Warranty→`2 years`.
- Price: INR on brand site — leave IMS price alone unless `--include-price`.
- Blockers: generally **live-scrapeable** from Node (unlike Fossil/Casio). Phased-out models may return HTTP 410 with full PDP HTML — still parseable.
- Fixtures: `fixtures/T1564103337100.html`, `fixtures/T1504172209100.html`.

## CLI

```bash
cd scripts/enrichment
node run-tissot.js T1564103337100
node run-tissot.js --csv input/tissot-skus.csv --download-images --out output/tissot-batch
node run-tissot.js T1504172209100 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/tissot`
- Fill-empty only; does **not** publish
