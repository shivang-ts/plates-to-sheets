import {
  isValidZomatoResId,
  resolveZomatoResId,
} from "./zomato/res-id.js";

const CREDENTIALS_KEY = "credentials";

export async function migrateStorage() {
  const data = await chrome.storage.local.get(null);
  if (data.accessToken && !data.credentials) {
    await chrome.storage.local.set({
      credentials: {
        swiggy: {
          accessToken: data.accessToken,
          restaurantId: data.restaurantId,
        },
      },
      selectedPlatform: data.selectedPlatform || "swiggy",
    });
    await chrome.storage.local.remove(["accessToken", "restaurantId"]);
  }

  const { credentials = {} } = await chrome.storage.local.get(CREDENTIALS_KEY);
  const zomato = credentials.zomato;
  if (zomato?.resId && !isValidZomatoResId(zomato.resId)) {
    const cleaned = { ...credentials, zomato: { ...zomato } };
    delete cleaned.zomato.resId;
    await chrome.storage.local.set({ [CREDENTIALS_KEY]: cleaned });
  }
}

export async function getSelectedPlatform() {
  await migrateStorage();
  const { selectedPlatform } = await chrome.storage.local.get("selectedPlatform");
  return selectedPlatform || null;
}

export async function setSelectedPlatform(platformId) {
  await chrome.storage.local.set({ selectedPlatform: platformId });
}

export async function getCredentials(platformId) {
  await migrateStorage();
  const { credentials = {} } = await chrome.storage.local.get(CREDENTIALS_KEY);
  return credentials[platformId] ?? {};
}

export async function saveCredentials(platformId, partial) {
  await migrateStorage();
  const { credentials = {} } = await chrome.storage.local.get(CREDENTIALS_KEY);
  const current = credentials[platformId] ?? {};
  const updated = { ...current };

  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined || value === null || value === "") continue;
    if (platformId === "zomato" && key === "resId" && !isValidZomatoResId(value)) {
      console.warn("[zomato] Ignoring invalid resId:", value);
      continue;
    }
    if (value !== current[key]) {
      updated[key] = value;
    }
  }

  if (JSON.stringify(updated) === JSON.stringify(current)) return;

  credentials[platformId] = updated;
  await chrome.storage.local.set({ [CREDENTIALS_KEY]: credentials });
  console.log(`[${platformId}] Credentials saved:`, Object.keys(partial).join(", "));
}

export async function clearCredentials(platformId) {
  await migrateStorage();
  const { credentials = {} } = await chrome.storage.local.get(CREDENTIALS_KEY);
  delete credentials[platformId];
  await chrome.storage.local.set({ [CREDENTIALS_KEY]: credentials });
}

export function isSwiggyLoggedIn(creds) {
  return Boolean(creds.accessToken && creds.restaurantId);
}

export function isZomatoLoggedIn(creds) {
  if (!creds.authToken && !creds.cookieHeader) return false;
  return Boolean(resolveZomatoResId(creds, creds.cookieHeader));
}

export function isLoggedIn(platformId, creds) {
  if (platformId === "zomato") return isZomatoLoggedIn(creds);
  return isSwiggyLoggedIn(creds);
}
