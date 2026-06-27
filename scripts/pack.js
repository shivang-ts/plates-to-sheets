#!/usr/bin/env node
/**
 * Build a Chrome Web Store upload zip (extension runtime files only).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ZIP_NAME = "plates-to-sheets.zip";
const ZIP_PATH = path.join(DIST, ZIP_NAME);

const INCLUDE = [
  "manifest.json",
  "background",
  "content",
  "popup",
  "lib",
  "help",
];

const ICONS = ["icons/icon-16.png", "icons/icon-48.png", "icons/icon-128.png"];

function main() {
  const missing = [
    ...INCLUDE.filter((entry) => !fs.existsSync(path.join(ROOT, entry))),
    ...ICONS.filter((entry) => !fs.existsSync(path.join(ROOT, entry))),
  ];
  if (missing.length) {
    console.error("Missing required paths:", missing.join(", "));
    process.exit(1);
  }

  fs.mkdirSync(DIST, { recursive: true });
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

  const zipArgs = ["-r", ZIP_PATH, ...INCLUDE, ...ICONS];
  execSync(`zip ${zipArgs.map((a) => JSON.stringify(a)).join(" ")}`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  const { size } = fs.statSync(ZIP_PATH);
  console.log(`\nCreated ${ZIP_PATH} (${(size / 1024).toFixed(1)} KB)`);
  console.log("Upload this file in Chrome Web Store Developer Dashboard → New item.");
}

main();
