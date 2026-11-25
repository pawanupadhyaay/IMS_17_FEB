# Casio enrichment playbook

- Official sources:
  - Global: https://www.casio.com/ (`/{locale}/watches/{line}/product.{MODEL}/`)
  - India authorized store moved to https://casiostore.bhawar.com/ (Cloudflare-blocked for Node)
  - Legacy https://www.casioindiashop.com/ redirects to Bhawar
- **IMS SKUs** are often **India shop codes** (`D275`, `G1736`, `A2429`), while PDPs use **model numbers** (`AE-1500WHX-1AVDF`, `GBM-2100A-8B`).
- Resolve order: `official_url` → CSV/CLI `--model` → `INDIA_CODE_TO_MODEL` map → model parsed from IMS title → SKU-as-model.
- Seeded map (expand as staff confirm): `D275`→`AE-1500WHX-1AVDF`, `D195`→`A1000MCG-9`, `G1736`→`GBM-2100A-8B`, `A2429`→`LTP-VT04D-2A`.
- **Blockers:** Akamai/CF on casio.com + India store for Node/curl. Prefer browser-saved `fixtures/<CODE>.html`. Sample fixtures included for D275 / G1736 (anti-bot).
- Price: leave IMS price alone unless `--include-price`.

## CLI

```bash
cd scripts/enrichment
node run-casio.js D275 --prefer-fixture
node run-casio.js G1736 --model GBM-2100A-8B --prefer-fixture
node run-casio.js --csv input/casio-skus.csv --prefer-fixture --out output/casio-batch
```

## IMS

- **Get details** → `POST /api/products/:id/enrich` or `/enrich/casio`
- Near-match badge when India code maps to a model
- Fill-empty only; does **not** publish
