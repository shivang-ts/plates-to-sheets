/**
 * Verbose logging is gated behind settings.debug in chrome.storage.local.
 * Warnings and errors always go to console.
 */

let debugEnabled = false;
let debugLoaded = false;

export function isDebugEnabled() {
  return debugEnabled;
}

export async function loadDebugSetting() {
  try {
    const { settings = {} } = await chrome.storage.local.get("settings");
    debugEnabled = Boolean(settings.debug);
  } catch {
    debugEnabled = false;
  }
  debugLoaded = true;
  return debugEnabled;
}

export async function ensureDebugLoaded() {
  if (!debugLoaded) await loadDebugSetting();
}

export function setDebugEnabled(value) {
  debugEnabled = Boolean(value);
  debugLoaded = true;
}

export function debugLog(tag, ...args) {
  if (!debugEnabled) return;
  console.log(tag, ...args);
}

export function debugWarn(tag, ...args) {
  if (!debugEnabled) return;
  console.warn(tag, ...args);
}
