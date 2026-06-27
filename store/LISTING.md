# Chrome Web Store listing — Plates to Sheets

Copy-paste fields for the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Upload package

```
dist/plates-to-sheets.zip
```

Build with: `npm run pack`

---

## Store listing

| Field | Value |
|-------|-------|
| **Name** | Plates to Sheets |
| **Summary** (132 chars max) | Export Swiggy & Zomato partner order history to CSV on your device. No third-party servers. Not affiliated with Swiggy or Zomato. |
| **Category** | Productivity |
| **Language** | English |
| **Privacy policy** | https://shivang-ts.github.io/plates-to-sheets/privacy.html |
| **Support email** | shivang.shukla1799@gmail.com |
| **Store icon** | `icons/icon-128.png` |
| **Screenshots** | `store/screenshots/01-platform-picker.png`, `02-swiggy-ready.png`, `03-export-progress.png` |

### Detailed description

```
Plates to Sheets helps restaurant partners export order history from Swiggy Partner and Zomato Partner to CSV files on your computer.

• Export orders with item details, timings, billing, and customer fields
• Data stays on your device — no servers operated by the extension author
• Clear credentials anytime from the popup
• Built-in help and privacy policy

How it works
1. Choose Swiggy or Zomato in the popup
2. Open the partner dashboard and log in
3. Click Fetch & Export CSV

You must be logged into the relevant partner dashboard to export. Not affiliated with or endorsed by Swiggy or Zomato.
```

---

## Trader & data use

- **Trader:** Yes
- **Data use certification:** User data is not sold. Data is used only to provide the extension's functionality (local CSV export).

---

## Permission justifications

Paste when prompted during review.

### storage
Saves platform choice, optional debug flag, and Swiggy credentials locally so export works across browser restarts.

### cookies
Reads Zomato session cookies at export time to authenticate with Zomato partner APIs. Full cookie strings are not stored.

### webRequest
Observes auth headers and request bodies on partner domains only, to capture the user's own session when they use the partner dashboard.

### tabs
Opens Swiggy/Zomato partner login pages and in-extension Help/Privacy pages.

### downloads
Saves exported CSV files to the user's chosen download folder.

### Host permissions (partner.swiggy.com, rms.swiggy.com)
Content scripts and API calls for Swiggy partner order export.

### Host permissions (zomato.com, www.zomato.com, api.zomato.com)
Content scripts, session cookies, and API calls for Zomato partner order export.

---

## Notes for reviewers (optional field)

```
Credential capture runs only when the user opens Swiggy or Zomato partner dashboards. MAIN-world content scripts hook fetch/XHR on those partner sites solely to read the user's own auth headers. Order data is processed locally and exported to CSV; nothing is transmitted to servers operated by the extension author.
```

---

## Distribution

Recommended initial visibility: **India** (primary audience), then expand as needed.
