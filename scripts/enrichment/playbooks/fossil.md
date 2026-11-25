# Fossil enrichment playbook

- Official India site: https://www.fossil.in/
- PDP pattern: `https://www.fossil.in/products/{slug}/{SKU}.html`
  - Example: https://www.fossil.in/products/neutra-chronograph-amber-leather-watch/FS5512.html
  - Search: `https://www.fossil.in/search?q=FS5512` (then follow PDP link)
- Images: `https://img.fossil.in/uploads/fsin/dealimages/…/detailimages/{sku}_N.png|.webp`
- Specs: Product Details / Key Features labels (Dial Color, Case Size, Movement, Gender, Case Water Resistance, Warranty, …) + JSON-LD.
- Field normalization: shared `lib/normalize.js` (Men→Male, 5 ATM→`50m (5 ATM)`, 2 Years→`2 years`).
- Price: INR MRP on fossil.in — leave IMS price alone unless `--include-price`.
- **Blockers:** Akamai **403** for Node/curl. Save browser PDP HTML to `fixtures/<SKU>.html` and use `--prefer-fixture`. Preview UI “Use HTML fixture” works the same.
- Fixtures: `fixtures/FS5512.html`, `fixtures/ES5498.html`.

## CLI

```bash
cd scripts/enrichment
node run-fossil.js FS5512 --prefer-fixture
node run-fossil.js ES5498 --prefer-fixture
node run-fossil.js --csv input/fossil-skus.csv --prefer-fixture --out output/fossil-batch
```

## IMS

- **Get details** → `POST /api/products/:id/enrich` or `/enrich/fossil`
- Fill-empty only; does **not** publish
