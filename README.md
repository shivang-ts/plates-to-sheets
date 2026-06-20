# Plates to Sheets

Chrome extension to export order history from **Swiggy Partner** and **Zomato Partner** to CSV — from plates to spreadsheets.

**Version 3.0.0** — production-hardened build with privacy policy, gated debug logs, session-scoped Zomato tokens, and CI tests.

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder
4. Reload the extension after updates, then refresh any open partner tabs

## Usage

1. Click the extension icon
2. Choose **Swiggy** or **Zomato**
3. Click **Open Partner Dashboard** and log in if needed
4. Re-open the popup — status should show **Logged in**
5. Click **Fetch & Export CSV**

Use **Help** or **Privacy** in the popup for guides and the privacy policy.

### Zomato date range

Defaults to **today only**; widen start/end dates in the popup as needed.

## CSV columns

`order_id`, `order_status`, `placed_time`, `ordered_time`, `pickedup_time`, `food_prep_time`, `delivered_time`, `customer_id`, `customer_name`, `customer_area`, `customer_distance_km`, `rtr`, `ntr`, `customer_order_count`, `items_summary`, `item_variants`, `item_count`, `bill`, `discount`, `bill total`, `REV`, `packing_charge`, `delivery_partner`, `channel`, `offer_description`

## Security & privacy

- **No full cookie strings stored** — Zomato cookies are read via `chrome.cookies` at export time only.
- **Zomato session tokens** (`csrf`, `mxCsrf`, `authToken`) live in `chrome.storage.session` and clear when the browser session ends.
- **Swiggy** `accessToken` + `restaurantId` persist in `chrome.storage.local` (required across restarts).
- See [help/privacy.html](help/privacy.html) for the full privacy policy.

## Debug logging

Off by default. To enable verbose logs in the service worker:

1. `chrome://extensions` → Plates to Sheets → **Service worker** → Application → Storage → Local → set `settings: { "debug": true }`
2. Reload the extension

## Development

```bash
npm test          # unit tests (Node 18+)
```

CI runs on push/PR to `main` via GitHub Actions.

### Git hooks (optional)

```bash
git config core.hooksPath .githooks
```

Also disable **Cursor Settings → Agents → Attribution → Commit Attribution** if you do not want co-author trailers.

## Project structure

```
manifest.json
lib/
  logger.js            — DEBUG-gated logging
  storage.js           — local + session credential split
  swiggy/              — Swiggy fetch + export
  zomato/              — Zomato fetch + export
help/                  — help + privacy pages
test/                  — unit tests
.github/workflows/     — CI
```

## Known Zomato limitations

- `packing_charge` is often empty — the partner API does not expose packaging as a separate line for many outlets.
- `rtr` / `ntr` are not available from Zomato.
- Rider name/pickup may be missing when the API only returns `riderStatus: REQUESTED`.

## License

Private project. Not affiliated with or endorsed by Swiggy or Zomato.
