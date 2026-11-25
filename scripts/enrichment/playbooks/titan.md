### Brand: Titan

- Official site: https://www.titan.co.in/
- Platform: Salesforce Commerce Cloud (Demandware / SFCC)
- PDP URL pattern: `/product/{slug}-{styleLower}.html` e.g. `...-95198wm01.html`
- Reference PDP: https://www.titan.co.in/product/titan-purple-dial-analog-watch-for-women-95198wm01.html
- **SKU mapping:** IMS `NU95198WM01` ↔ site style `95198WM01` / `data-pid` `nu95198wm01`. Optional leading `NU`/`nu` is the IMS prefix — strip for catalog images / URL slugs, add for IMS `sku`.
- Spec table CSS/selectors: `.product-specs-attribute` → `.product-specs-name` / `.product-specs-value`. Also `data-pid`, `h1.product-name-heading`, `.salesPriceValue` / `.listPriceValue`, JSON-LD `@graph` Product.
- Image gallery: `hi-res-url` / `/on/demandware.static/-/Sites-titan-master-catalog/.../images/Titan/Catalog/{STYLE}_N.jpg` (and `/dw/image/v2/...` CDN variants). Filenames use **style code** (no NU).
- **Field normalization:** shared `lib/normalize.js` only (no brand-local enum maps). Titan-relevant: Women→Female; Metal→Stainless Steel; 24 Months→2 years; Function Analog→category Analog; Dial Color Purple→Purple.
- Common gaps: Cloudflare blocks Node/curl HTML (403 / challenge page). Use `--html fixtures/NU95198WM01.html` (or `titan-95198WM01.html`) / `--prefer-fixture`. Static catalog images are usually reachable without the HTML bot wall. Price is INR on brand site — leave IMS price alone unless `--include-price`.
- **Near-match** (when exact style/URL/search fails), tried in order:
  1. Expandable `SKU_TYPO_MAP` (e.g. `9210QM01`→`90210QM01`, `134QL01`→`90134QL01`)
  2. Strip/add `NU`/`nu` prefix variants
  3. Digit-insertion / `90`-prefix candidates validated via Catalog image `HEAD` (`…/Catalog/{STYLE}_1.jpg`) — CF-tolerant
  4. `/search?q=` HTML parse when Node is not CF-blocked (often blocked — fall back to fixtures)
  5. Browser / saved HTML only — no headless automation in-tree; save PDP → `fixtures/`
  - Auto-accept **only** a single high-confidence hit (typo map, or edit-distance 1 / `90`-prefix with same letter suffix `QM01`/`WL06`/…). Multiple hits → `not_found.json` with `nearMatchCandidates` for manual pick (never guess).
  - Accepted scrapes set `nearMatch: true`, `matchedStyle`, `imsSku` (original request), `confidence`, `nearMatchMethod`; preview shows a **near match** badge.
  - `TWEG*` codes are **Timex India** model numbers — use `run-timex.js` / `playbooks/timex.md`, not Titan.
- Sample SKUs from New listings (unpublished Titan batch):
  1. NU95198WM01 (Raga Delight purple dial)
  2. 10028QL01, 10063BM01, NU95276QM01, NT1841QC04, …
  3. Full list: `input/titan-skus.csv` → batch output `output/titan-batch/`
