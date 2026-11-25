# Longines enrichment playbook

- Official site: https://www.longines.com/ (prefer `en-in` locale)
- PDP pattern: `https://www.longines.com/en-in/p/{url_key}`
  - Example: https://www.longines.com/en-in/p/watch-longines-primaluna-l8-115-4-71-6
- IMS SKUs are **compact** (`L81154716`). Official refs are **dotted** (`L8.115.4.71.6`).
  - Layout: `L` + 1 + 3 + 1 + 2 + 1 → `L8.115.4.71.6`
  - URL slug ends with dashed form: `…-l8-115-4-71-6`
- Resolve: warm `en-in` / `en-us` / global `sitemap/products.xml`, match dashed SKU suffix.
- Specs: `__NEXT_DATA__` fallback `ProductPageDocument` + `ProductPageAdditionalDocument` + `ProductAttributes` option labels. JSON-LD Product as fallback.
- Images: `api.ecom.longines.com/media/catalog/product/…` (hero + media_gallery). Skip placeholders.
- Field normalization: shared `lib/normalize.js` (e.g. Opaline Ivory→Ivory; 3 bar→`30m (3 ATM)`; Quartz; Stainless Steel).
- Price: INR on en-in — leave IMS price alone unless `--include-price`.
- Blockers: Node live fetch works outside sandbox with browser UA; HTTP/2 glitches → fixture `fixtures/longines-L81154716.html`.
- Enrichment does **not** auto-publish. Prefer longines.com CDN; retailers only on miss.

## India retailer fallback (official miss only)

When longines.com has no PDP (`sitemap miss` / 404):

1. **The Collective** (`source: thecollective`) — RichRelevance catalog find by `Feature_Subbrand:"Longines"` + compact/dotted SKU; PDP HTML → `productDetails` RSC payload + `imagescdn.thecollective.in`.
2. **Tata Cliq Luxury** (`source: tatacliq`) — always kept in chain; pass `--tatacliq-url` when search fails.
3. **TGT Luxe** (`source: tgtluxe`) — Shopify `search/suggest.json` + `/products/{handle}.json` + `products.json` catalog by variant SKU.
4. **Ethos** (`source: ethos`) — last-resort miss-recovery (`lib/ethos.js`).

Known typo map: **L22734716 → L27734716** (IMS has both; Collective lists Master Collection as L2.773.4.71.6). Batch keeps the IMS/CSV SKU and sets `typoFrom` / `imsSkuAliases`.

Example Collective PDP:

https://www.thecollective.in/p/men-silver-master-collection-watch-l27734716-1006973.html

Example TGT Luxe PDP:

https://tgtluxe.com/products/longines-black-dial-quartz-men-watch-l37403587

## CLI

```bash
cd scripts/enrichment
node run-longines.js L81154716 --url 'https://www.longines.com/p/watch-longines-primaluna-l8-115-4-71-6'
node run-longines.js --csv input/longines-skus.csv --download-images --out output/longines-batch
node run-longines.js L22734716 --collective-url 'https://www.thecollective.in/p/men-silver-master-collection-watch-l27734716-1006973.html' --download-images
node run-longines.js L37403587 --tgtluxe-url 'https://tgtluxe.com/products/longines-black-dial-quartz-men-watch-l37403587' --download-images
node run-longines.js L81154716 --prefer-fixture
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/longines`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Longines** / `#progress/longines`
