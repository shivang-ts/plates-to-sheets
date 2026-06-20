# Plates to Sheets

Chrome extension to export order history from **Swiggy Partner** and **Zomato Partner** to CSV — from plates to spreadsheets.

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder
4. Reload the extension after updates, then refresh any open partner tabs

## Usage

1. Click the extension icon
2. Choose **Swiggy** or **Zomato** — the UI theme matches your selection
3. Click **Open Partner Dashboard** and log in if needed
4. Re-open the popup — status should show **Logged in**
5. Click **Fetch & Export CSV**

Use **Switch platform** in the header to change between Swiggy and Zomato. Click **Help** in the popup for a full guide.

### Export progress & cancel

- A progress bar shows the current step (history, order details, customer info, CSV).
- **Cancel export** stops the job — no file is saved if you cancel before completion.
- Zomato exports can take several minutes for large date ranges (one API call per order, throttled to avoid rate limits).

### Swiggy

- Dashboard: `https://partner.swiggy.com/food`
- Fetches orders via `fetchOrders` (`INITIAL_LOAD` + `lastUpdatedTime: null`)
- Enriches each unique customer with `rxcx/info` (`rtr`, `ntr`, `customer_order_count`)
- Manual credentials: `access_token` + `restaurantId`

### Zomato

- Login: `https://www.zomato.com/partners/login`
- Paginated order history via `get-all-v2`, then per-order `order-details`
- Date range picker for `created_at` — defaults to **today only**; widen start/end dates as needed (e.g. `2026-06-06,2026-06-13`)
- Manual credentials: `res_Id` (+ optional CSRF tokens)
- Uses the same CSV column schema as Swiggy

## CSV columns

`order_id`, `order_status`, `placed_time`, `ordered_time`, `pickedup_time`, `food_prep_time`, `delivered_time`, `customer_id`, `customer_name`, `customer_area`, `customer_distance_km`, `rtr`, `ntr`, `customer_order_count`, `items_summary`, `item_count`, `bill`, `discount`, `bill total`, `REV`, `packing_charge`, `delivery_partner`, `channel`, `offer_description`

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Not logged in | Open the partner dashboard again; wait a few seconds for capture |
| Access denied / wrong outlet | Select the correct restaurant in the partner app |
| Invalid `res_Id` | Use your outlet ID (e.g. `22737520`), not a timestamp |
| No orders | Widen the date range (Zomato) or confirm orders in the dashboard |
| Extension context invalidated | Reload the extension, then refresh partner tabs |

## Debugging

- **Popup console**: right-click extension icon → Inspect popup
- **Service worker**: `chrome://extensions` → Service worker link
- Look for `[SwiggyOrders]` or `[ZomatoOrders]` log prefixes

## Project structure

```
manifest.json
lib/
  platforms.js         — Swiggy/Zomato config & themes
  storage.js           — per-platform credentials
  export-context.js    — progress reporting, cancel, concurrency pool
  user-errors.js       — user-facing error messages
  swiggy/              — Swiggy fetch + export
  zomato/              — Zomato fetch + export
help/help.html         — in-extension help page
popup/
background/
content/               — per-platform credential capture
```

## Privacy

Order data is fetched from Swiggy/Zomato APIs using your browser session and processed locally. Nothing is sent to third-party servers. See `help/help.html` for more detail.

## Git hooks (optional)

To block Cursor co-author lines from ever landing in commits:

```bash
git config core.hooksPath .githooks
```

Also turn off **Cursor Settings → Agents → Attribution → Commit Attribution**.
