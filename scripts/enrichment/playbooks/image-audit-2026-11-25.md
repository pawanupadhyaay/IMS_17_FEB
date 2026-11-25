# Image audit — gallery pollution + magic-byte extensions

Date: 2026-11-25. Trigger: Tissot blank tiles (WebP saved as PNG) + strap/related SKUs in gallery.

## Systemic fixes

| Area | Change |
|------|--------|
| `lib/http.js` | `imageExtFromBuffer` (magic bytes → Content-Type → URL) |
| All `run-*.js` | Download uses sniff; wipe SKU image dir before save |
| `preview-server.js` | `/media` Content-Type from magic bytes |
| `lib/imageDownload.js` | Shared helper for future CLIs |

## Brand extractors

| Brand | Pollution risk | Filter |
|-------|----------------|--------|
| Tissot | High (SFCC related + straps) | Full compact SKU in `product-pictures` filename |
| Seiko (global HTML) | High (related carousel) | Require SKU or country-base in path |
| Casio | Medium | Model/SKU in path; keep og:image |
| Fossil | Medium | SKU required on detail/deal/product image paths |
| Longines | Low–med | Drop gallery files embedding a different `L########` |
| Balmain / Rado / Titan | Low | Already Magento/SFCC SKU-in-filename |
| Timex / Seiko India | Low | Shopify product JSON is product-scoped |
| Emporio Armani / AX | Low | CDN path must include SKU |

## Batch repair

- Renamed mismatched local files (WebP↔jpg/png) across priority + recover batches — **0 mismatches** left on recheck.
- Seiko: stripped cross-SKU URLs from `products.json` (15 SKUs / 157 URLs).
- Tissot proof: stripped strap/related URLs.

## Verify

1. https://samay-test.cognaitive.in — open Timex / Rado / Titan / Seiko / Armani SKUs; tiles must not be blank.
2. Seiko global fallback SKUs should show **only** that model (often 1–3 shots after cleanup).
3. Re-download with `--download-images` picks correct extensions going forward.
