# Rado enrichment playbook

- Official India site: https://www.rado.com/en_in/
- PDP pattern: `https://www.rado.com/en_in/{slug}-{sku}.html`
  - Example: https://www.rado.com/en_in/florence-diamonds-r48921703.html
- IMS SKUs are compact refs (`R48921703`). Site uses the same reference.
- Resolve: warm `media/sitemap_en_in.xml` (fallback `en_us` / `default`), match URL suffix `-{sku}.html`.
- Specs: technical-details accordion (`h4` / `p` pairs under Global features / Case / Dial / Movement / Bracelet). Water resistance often only in description (“50 meters of water resistance”).
- Images: `rado.com/media/catalog/product/…` filenames containing the SKU (`*_sld_web`, `_a_1`, `_b`, …). Skip related-product thumbs. Strip `/cache/…` and `?im=` transforms.
- Field normalization: shared `lib/normalize.js` (Women→Female; Quartz; Stainless Steel; 50 meters→`50m (5 ATM)`; Five year→`5 years`).
- Price: INR on en_in — leave IMS price alone unless `--include-price`.
- Blockers: Node live fetch works with browser UA (outside sandbox). Magento search can hang — prefer sitemap. Fixture: `fixtures/rado-R48921703.html`.
- Enrichment does **not** auto-publish. Prefer rado.com CDN; retailers only on miss.

## India retailer fallback (official miss only)

Shared chain (`lib/retailerFallback.js` preset `luxury`):

1. **The Collective** (`source: thecollective`)
2. **Tata Cliq Luxury** (`source: tatacliq`) — always kept in chain
3. **TGT Luxe** (`source: tgtluxe`)
4. **Ethos** (`source: ethos`) — miss-recovery; CF may require `fixtures/ethos-{SKU}.html`

Known recoveries: `R22894153` → Tata Cliq `…/p-mp000000010718112`; `R22910153` → Ethos `product-rado-coupole-r22910153.html`.

Pass `--collective-url` / `--tatacliq-url` / `--tgtluxe-url` when search is flaky.

## CLI

```bash
cd scripts/enrichment
node run-rado.js R48921703 --url 'https://www.rado.com/en_in/florence-diamonds-r48921703.html'
node run-rado.js --csv input/rado-skus.csv --download-images --out output/rado-batch
node run-rado.js R48921703 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/rado`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Rado** / `#progress/rado`
