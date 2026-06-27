#!/usr/bin/env node
/**
 * Generate Chrome Web Store screenshots (1280×800) from static UI mocks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "store", "screenshots");
const CSS_PATH = path.join(ROOT, "popup", "popup.css");
const CSS = fs.readFileSync(CSS_PATH, "utf8");

const FRAME_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: 1280px;
    height: 800px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  }
  .frame {
    width: 1280px;
    height: 800px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 72px;
    padding: 48px 64px;
  }
  .copy { max-width: 420px; color: #1a1a1a; }
  .copy .badge {
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #5f6368;
    margin-bottom: 16px;
  }
  .copy h2 {
    font-size: 42px;
    line-height: 1.15;
    font-weight: 700;
    margin: 0 0 16px;
  }
  .copy p {
    font-size: 18px;
    line-height: 1.5;
    color: #444;
    margin: 0;
  }
  .popup-shell {
    width: 320px;
    flex-shrink: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
    background: #f8f9fa;
  }
  .popup-shell body,
  .popup-shell .container { width: 320px; }
`;

function popupShell(bodyClass, innerHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>${FRAME_CSS}${CSS}</style>
</head>
<body class="${bodyClass}">
  <div class="frame">
    ${innerHtml}
  </div>
</body>
</html>`;
}

const screens = [
  {
    file: "01-platform-picker.png",
    html: popupShell(
      "",
      `
    <div class="copy">
      <div class="badge">Plates to Sheets</div>
      <h2>Pick Swiggy or Zomato</h2>
      <p>One extension for both partner dashboards. Choose your platform and export orders to CSV.</p>
    </div>
    <div class="popup-shell">
      <div class="container">
        <header>
          <h1>Plates to Sheets</h1>
          <p class="subtitle">Partner order export to CSV</p>
          <div class="header-actions">
            <button class="link-btn" type="button">Help</button>
            <button class="link-btn" type="button">Privacy</button>
          </div>
        </header>
        <section>
          <p class="section-label">Choose a platform</p>
          <div class="platform-grid">
            <button class="platform-card platform-card--swiggy" type="button">
              <span class="platform-card__name">Swiggy</span>
              <span class="platform-card__hint">Partner dashboard</span>
            </button>
            <button class="platform-card platform-card--zomato" type="button">
              <span class="platform-card__name">Zomato</span>
              <span class="platform-card__hint">Partner dashboard</span>
            </button>
          </div>
        </section>
      </div>
    </div>`
    ),
  },
  {
    file: "02-swiggy-ready.png",
    html: popupShell(
      "platform-swiggy",
      `
    <div class="copy">
      <div class="badge">Swiggy Partner</div>
      <h2>Logged in &amp; ready</h2>
      <p>Session captured from your partner dashboard. Export order history with one click.</p>
    </div>
    <div class="popup-shell">
      <div class="container">
        <header>
          <h1>Plates to Sheets</h1>
          <p class="subtitle">Swiggy partner export</p>
          <div class="header-actions">
            <button class="link-btn" type="button">Switch platform</button>
            <button class="link-btn" type="button">Help</button>
            <button class="link-btn" type="button">Privacy</button>
          </div>
        </header>
        <section>
          <div class="status status--logged-in">
            <span class="status-dot"></span>
            <span>Logged in</span>
          </div>
          <p class="info-text">Restaurant ID: 1381814</p>
          <button class="btn btn--primary" type="button">Fetch &amp; Export CSV</button>
          <button class="btn btn--ghost" type="button">Clear credentials</button>
        </section>
      </div>
    </div>`
    ),
  },
  {
    file: "03-export-progress.png",
    html: popupShell(
      "platform-zomato",
      `
    <div class="copy">
      <div class="badge">Zomato Partner</div>
      <h2>Export with progress</h2>
      <p>Pick a date range, fetch orders, and save a CSV locally on your device.</p>
    </div>
    <div class="popup-shell">
      <div class="container">
        <header>
          <h1>Plates to Sheets</h1>
          <p class="subtitle">Zomato partner export</p>
          <div class="header-actions">
            <button class="link-btn" type="button">Switch platform</button>
            <button class="link-btn" type="button">Help</button>
            <button class="link-btn" type="button">Privacy</button>
          </div>
        </header>
        <section>
          <div class="status status--logged-in">
            <span class="status-dot"></span>
            <span>Logged in</span>
          </div>
          <p class="info-text">Restaurant ID: 22737520</p>
          <label class="field-label">Start date</label>
          <input type="date" value="2026-06-01" />
          <label class="field-label">End date</label>
          <input type="date" value="2026-06-27" />
          <button class="btn btn--primary" type="button" disabled>Fetch &amp; Export CSV</button>
          <div class="export-progress">
            <p class="export-progress__text">Fetching order details… 18/42</p>
            <div class="export-progress__track">
              <div class="export-progress__bar" style="width: 43%"></div>
            </div>
            <button class="btn btn--ghost btn--small" type="button">Cancel export</button>
          </div>
        </section>
      </div>
    </div>`
    ),
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = path.join(OUT_DIR, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.error("puppeteer not installed. Run: npm install");
    process.exit(1);
  }

  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  for (const screen of screens) {
    const htmlPath = path.join(tmpDir, screen.file.replace(".png", ".html"));
    fs.writeFileSync(htmlPath, screen.html);
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.screenshot({
      path: path.join(OUT_DIR, screen.file),
      type: "png",
    });
    console.log("Wrote", path.join(OUT_DIR, screen.file));
  }

  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
