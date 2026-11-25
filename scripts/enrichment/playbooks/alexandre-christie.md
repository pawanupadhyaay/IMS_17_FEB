# Alexandre Christie enrichment playbook

- IMS brand spelling: **Alexandre Christie** (not Alexandra). Pipeline slug: `alexandre-christie`.
- Official site: https://www.alexandrechristie.com/ — Node often gets **HTTP 403** (Cloudflare). Prefer retailer PDPs unless an official URL/fixture is provided.
- First SKU: `2B58BFBROBO` — Passion Quartz Multifunction Women 36 mm
  - Tata Cliq Luxury: https://luxury.tatacliq.com/alexandre-christie-passion-quartz-multifunction-women-36-mm-2b58bfbrobo/p-mp000000032996347
- Specs from Tata: SS case/bracelet, brown dial/strap, round 36 mm, quartz, day+date, 30 m WR, 2 yr warranty, mineral glass. Price INR ₹21,995 (not written to IMS by default).
- Images: `img.tatacliq.com` SuperZoom gallery (SKU / MP listing id in path). Sniff bytes via `imageExtFromBuffer` on download.
- Field normalization: shared `lib/normalize.js`.
- Enrichment does **not** auto-publish.

## India retailer fallback

Shared chain (`lib/retailerFallback.js` preset `luxury`):

1. **The Collective** (`source: thecollective`)
2. **Tata Cliq Luxury** (`source: tatacliq`) — always kept in chain; primary source for first SKUs
3. **TGT Luxe** (`source: tgtluxe`)
4. **Ethos** (`source: ethos`) — miss-recovery; CF may require `fixtures/ethos-{SKU}.html`

Pass `--tatacliq-url` / `--collective-url` / `--tgtluxe-url` / `--ethos-url` when search is flaky. Fixture: `fixtures/tatacliq-2B58BFBROBO.html`.

## CLI

```bash
cd scripts/enrichment
node run-alexandre-christie.js 2B58BFBROBO --tatacliq-only --download-images --out output/alexandre-christie-batch
node run-alexandre-christie.js --csv input/alexandre-christie-skus.csv --download-images --out output/alexandre-christie-batch
node run-alexandre-christie.js 2B58BFBROBO --prefer-fixture --html fixtures/tatacliq-2B58BFBROBO.html
```

## IMS

- **Get details** routes by brand → `POST /api/products/:id/enrich` or `/enrich/alexandre-christie`
- Fill-empty only; does **not** publish

## Preview

- https://samay-test.cognaitive.in — Brand **Alexandre Christie** / `#progress/alexandre-christie`
