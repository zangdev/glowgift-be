# Glowgift Orders Sync & Export API

A lightweight Next.js API that can either:
- Read CSV/Excel data from Google Sheets and create Shopify orders, or
- Fetch Shopify orders and export them to Google Sheets (or CSV).

Deployable to Vercel on the free plan.

## Endpoints

- GET `/api/sync-orders` — Read Sheet/Excel and create Shopify orders.
- GET `/api/export-orders` — Read Shopify orders and export to Google Sheets (or return CSV if no Google credentials).

## Environment Variables (set in Vercel)

- `SHOPIFY_STORE` — Shopify store name (without `.myshopify.com`)
- `SHOPIFY_TOKEN` — Admin API access token
- `GOOGLE_SHEET_URL` — Google Sheet CSV export link, e.g.:
  `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv`
 - `SHEET_NAME` — Optional: sheet/tab name (for Excel).
 - `SHEET_INDEX` — Optional: sheet index starting from 0 (for Excel).
 - `SHEET_HEADER_ROW` — Optional: header row number (1-based). Use this if your headers are on row 2, etc.
 - `GOOGLE_SHEET_ID` — (For export) The target spreadsheet ID to write to. If not set, we auto-parse from `GOOGLE_SHEET_URL`.
 - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — (For export) Service account email with access to the sheet.
 - `GOOGLE_PRIVATE_KEY` — (For export) The service account private key. Escape newlines as `\n` in env.

## How it works — /api/sync-orders

1. Fetches the CSV from `GOOGLE_SHEET_URL`.
2. Parses into JSON rows with columns:
   - `NAME`, `PHONE`, `Address`, `Note`, `SKU`, `Quantity`, `Order Date`
3. For each row (only requiring `Quantity > 0`), optionally looks up the Shopify variant by `SKU` (if present).
4. Creates an order via Shopify REST API with a single line item.
5. Returns a JSON summary of created/failed orders and raw Shopify responses.

Notes:
- If variant lookup by SKU fails, the API returns the Shopify error JSON for that row.
- If a SKU is not found (or not provided), the API creates a fallback custom line item using the `title` equal to the SKU (or `Unknown SKU`) and price `0.00`.
- Rows with `Quantity <= 0` are skipped with a reason.
- You can append `?debug=1` to the endpoint to see a preview of parsed rows.
- You can temporarily override the sheet via `?url=<csv_url>` for testing.

## How it works — /api/export-orders

1. Fetches recent orders from Shopify (default limit=50; up to 250 per call).
2. Flattens each order into one row per line item with columns:
    - `Ngày đặt hàng`, `SKU`, `Order number`, `Product`, `Size/Variant`, `Số lượng`, `Đơn giá`, `NAME`, `PHONE`, `Address`, `Note`, `Giá tổng đơn hàng`, `Tags`.
3. If Google credentials are configured, appends rows to the specified Google Sheet (ID from `GOOGLE_SHEET_ID` or auto-parsed from `GOOGLE_SHEET_URL`); otherwise returns CSV/XLSX.

Notes:
- Share the Google Sheet with the service account email to grant write access.
- Use query params:
   - `?limit=100` to adjust the number of orders.
   - `?format=csv` to force CSV response.
   - `?format=xlsx` to download an Excel file directly.
   - `?sheet=Sheet1` to pick a tab by name, or `?gid=123456` to pick a tab by gid.
   - `?mode=replace` to overwrite the sheet (clear then write) instead of appending.

## Local dev

```bash
# 1) Install deps
npm install

# 2) Create a .env.local with your variables
cat > .env.local <<'EOF'
SHOPIFY_STORE=your-store
SHOPIFY_TOKEN=shpat_...
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/.../gviz/tq?tqx=out:csv
EOF

# 3) Run
npm run dev
# Then visit:
# - http://localhost:3000/api/sync-orders
# - http://localhost:3000/api/export-orders?format=csv
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab.
2. Import the repo in Vercel, framework should auto-detect as Next.js.
3. Set the environment variables in Project Settings → Environment Variables:
   - `SHOPIFY_STORE`, `SHOPIFY_TOKEN`, `GOOGLE_SHEET_URL`.
   - For export: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`.
4. Deploy. Then visit `https://<your-app>.vercel.app/api/sync-orders`.

## Implementation details

- Uses `csv-parse` to parse CSV reliably.
- Uses global `fetch` (Node 18+) for HTTP requests.
- Shopify API version `2024-07`.
- Adds `tags: ["AutoImport"]` and passes `Note` to the order's `note`.
- Also supports Excel `.xlsx` via direct download URL. Select sheet with `?sheet=Sheet1` or `?sheetIndex=0`. If your header row is not the first row (e.g., there's a title row above), pass `?headerRow=2` (1-based).
 - You can set defaults via env: `SHEET_NAME`, `SHEET_INDEX`, `SHEET_HEADER_ROW` (overridden by query params if provided).

## Troubleshooting

- `Cannot fetch Google Sheet`: Check that `GOOGLE_SHEET_URL` is a public CSV export link and accessible.
- For Excel: provide a direct `.xlsx` download URL (OneDrive/SharePoint links often need `download=1`). You can override with `?url=...`. If the first row is not headers, pass `?headerRow=<n>`.
- Shopify errors: The API returns the raw JSON from Shopify in `results[*].shopify` — check for details like invalid token, missing permissions, invalid variant, etc.
- Rate limits: The implementation runs sequentially to be gentle with API limits. For large sheets, consider batching and scheduled triggers.
 - If the response shows only `skipped` with empty values, your link may not be a CSV export. Use `?debug=1` to preview parsed rows and ensure the link ends with `gviz/tq?tqx=out:csv`.
