### Brand: Balmain

- Official site: https://www.balmainwatches.com/en/
- India / region site (if different): none dedicated — global Magento storefront (CHF pricing). **India-only SKUs** (404 on brand site) may use **Tata Cliq Luxury** as fallback for details + images.
- PDP URL pattern: `/en/{slug}-{compactSku}.html` e.g. `...-b48303382.html`
- Search tips: `https://www.balmainwatches.com/en/catalogsearch/result/?q=B48303382` (often redirects straight to PDP). Compact or dotted ref both work (`B48303382` / `B4830.33.82`).
- SKU format notes: IMS compact `B48303382` ↔ official `B4830.33.82` (`B` + 4 + 2 + 2 digits)
- Spec table CSS/selectors: `.additional-attribute span.label` / `span.data` (Magento custom attrs). Also `itemprop="sku"`, `h1 .base[itemprop=name]`, `data-price-amount`.
- Image gallery selectors: `.product.media img` / Magento cache URLs under `/media/catalog/product/…`. Prefer filenames containing the compact SKU; ignore generic `balmain_watches_*` packshots and related-product thumbs.
- **Fallback — Tata Cliq Luxury** (only when official PDP is missing / 404):
  - Prefer official brand images whenever balmainwatches.com resolves.
  - CSV column `tataCliqUrl` (or CLI `--tatacliq-url`). Example: Classic R Men 41 mm → `https://luxury.tatacliq.com/balmain-classic-r-men-41-mm/p-mp000000008717054` (**B41023124**).
  - Parser reads embedded `productDescriptionData` + JSON-LD (title, Model Number, specs, INR price, gallery SuperZoom URLs).
  - If no URL in CSV, best-effort Bing/DuckDuckGo `site:luxury.tatacliq.com <SKU>` resolution — often blocked/captcha'd from Node. **Prefer CSV `tataCliqUrl`**. Tata Cliq on-site search usually returns 0 hits for compact refs.
  - Output marks `source: "tatacliq"` vs `source: "balmainwatches"` for preview / review.
- **Field normalization (IMS enums):** after scrape, `lib/normalize.js` maps constrained specs to Product Modal options. Examples seen on Balmain batches: Women/Men → Female/Male; `Stainless steel` → Stainless Steel; `5 bar (~50m)` → `50m (5 ATM)`; `2 Years` → `2 years`; White/Pink Mother of Pearl → Mother of Pearl; Yellow Gold strap → Gold. Bicolor/PVD case strings that are not in the caseMaterial dropdown are left **blank** for staff. See enrichment README “Constrained field normalization”.
- Common gaps: Akamai bot protection blocks many Node/curl fetches (HTTP/2 stream errors / timeouts). Use `--html fixtures/<SKU>.html` or a browser-saved PDP. Price on brand site is CHF; Tata Cliq shows INR — leave IMS price alone unless `--include-price`. No Ethos / Helios / other competing retailer CDNs.
- Sample SKUs from New listings:
  1. B48303382 (official)
  2. B41023124 (India-only → Tata Cliq Classic R Men 41 mm)
  3. _(add more from New listings → Brand=Balmain → Missing images)_
