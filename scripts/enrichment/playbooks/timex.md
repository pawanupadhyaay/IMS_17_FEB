### Brand: Timex

- Official India store: https://shop.timexindia.com/ (Shopify; INR pricing)
- Global site (reference only): https://www.timex.com/ — prefer **Timex India** for TWEG* IMS SKUs
- PDP URL pattern:
  - Sometimes handle = SKU lowercased: `/products/tweg26300`
  - Often slug + SKU: `/products/timex-harborside-round-43mm-black-dial-analog-men-watch-tweg27002`
- Search tips: Shopify predictive search  
  `https://shop.timexindia.com/search/suggest.json?q=TWEG26300&resources[type]=product&resources[limit]=5`  
  Use returned `handle` → `/products/{handle}.json`
- SKU format notes: IMS / India model numbers are **`TWEG*`** (and related `TWEL*` / `TW2*` global style codes on image filenames). Do **not** treat TWEG* as Titan.
- Specs: HTML specs table (`<td>Label</td><td>:</td><td>Value</td>` under Specifications). Product JSON (`.json`) has title, body, gallery, variant SKU/price but **not** the specs table — fetch HTML for attributes.
- Image gallery: Shopify CDN `cdn.shopify.com/.../products|files/...` from `product.images[].src`. Prefer official India CDN only (no Ethos / Helios / Amazon).
- **Field normalization:** shared `lib/normalize.js` only. Typical Timex India values: Men's/Men → Male; `38 MM` → caseSize; `50m` / `50 M` → `50m (5 ATM)`; `1 year warranty…` → `1 years`; Stainless Steel / Brass / Quartz / Analog / Round as usual.
- Common gaps: Handle is not always the SKU — prefer CSV `official_url` or suggest.json. Specs live only in HTML. Price is INR — leave IMS price alone unless `--include-price`.
- Sample SKUs from New listings (unpublished Timex):
  1. TWEG26300 — Q Timex Reissue 38mm Blue Dial
  2. TWEG27002 — Harborside Round 43mm Black Dial
  3. TW2W51300UJ — Marlin Moon Phase
  4. TW2Y81500IK / IMS typo `TW2Y815001K` — Q Marbella (near-match `1K`→`IK`)
- Near-match (conservative): IMS `…1K` / `…LK` / mixed-case `lK` → site `…IK`; also `TWEG260407`→`TWEG26407`, `TWFG*`→`TWEG*`. Keep IMS SKU as merge key; preview shows near badge.
- Batch: `node run-timex.js --csv input/timex-skus.csv --download-images --out output/timex-batch`
- Preview: https://samay-test.cognaitive.in — Brand **Timex** (sidebar filters to Timex batch)
- Do **not** auto-publish; Approve / apply when staff ready.
