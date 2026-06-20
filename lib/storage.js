import {
  isValidZomatoResId,
  resolveZomatoResId,
} from "./zomato/res-id.js";

const CREDENTIALS_KEY = "credentials";
const SESSION_CREDENTIALS_KEY = "credentialSession";

/** Persisted across browser restarts */
const LOCAL_PLATFORM_KEYS = {
  swiggy: ["accessToken", "restaurantId"],
  zomato: ["resId"],
};

/** Cleared when browser session ends */
const SESSION_PLATFORM_KEYS = {
  zomato: ["csrf", "mxCsrf", "authToken"],
};

const STRIPPED_KEYS = ["cookieHeader"];

function pickKeys(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      out[key] = obj[key];
    }
  }
  return out;
}

function stripForbidden(obj) {
  const out = { ...obj };
  for (const key of STRIPPED_KEYS) delete out[key];
  return out;
}

async function readLocalCredentials() {
  const { credentials = {} } = await chrome.storage.local.get(CREDENTIALS_KEY);
  return credentials;
}

async function readSessionCredentials() {
  const { credentialSession = {} } = await chrome.storage.session.get(SESSION_CREDENTIALS_KEY);
  return credentialSession;
}

async function writeLocalCredentials(credentials) {
  await chrome.storage.local.set({ [CREDENTIALS_KEY]: credentials });
}

async function writeSessionCredentials(credentialSession) {
  await chrome.storage.session.set({ [SESSION_CREDENTIALS_KEY]: credentialSession });
}

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

  const credentials = await readLocalCredentials();
  let localChanged = false;
  const session = await readSessionCredentials();
  let sessionChanged = false;

  for (const platformId of Object.keys(credentials)) {
    const creds = credentials[platformId];
    if (!creds || typeof creds !== "object") continue;

    for (const key of STRIPPED_KEYS) {
      if (key in creds) {
        delete creds[key];
        localChanged = true;
      }
    }

    const sessionKeys = SESSION_PLATFORM_KEYS[platformId] ?? [];
    for (const key of sessionKeys) {
      if (creds[key] !== undefined) {
        session[platformId] = { ...(session[platformId] ?? {}), [key]: creds[key] };
        delete creds[key];
        localChanged = true;
        sessionChanged = true;
      }
    }

    if (platformId === "zomato" && creds.resId && !isValidZomatoResId(creds.resId)) {
      delete creds.resId;
      localChanged = true;
    }
  }

  if (localChanged) await writeLocalCredentials(credentials);
  if (sessionChanged) await writeSessionCredentials(session);
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
  const credentials = await readLocalCredentials();
  const session = await readSessionCredentials();
  const local = stripForbidden(credentials[platformId] ?? {});
  const sess = session[platformId] ?? {};
  return { ...local, ...sess };
}

export async function saveCredentials(platformId, partial) {
  await migrateStorage();
  const clean = stripForbidden({ ...partial });

  const localKeys = LOCAL_PLATFORM_KEYS[platformId] ?? [];
  const sessionKeys = SESSION_PLATFORM_KEYS[platformId] ?? [];

  const localPartial = pickKeys(clean, localKeys);
  const sessionPartial = pickKeys(clean, sessionKeys);

  if (platformId === "zomato" && localPartial.resId && !isValidZomatoResId(localPartial.resId)) {
    delete localPartial.resId;
  }

  const credentials = await readLocalCredentials();
  const session = await readSessionCredentials();
  const currentLocal = credentials[platformId] ?? {};
  const currentSession = session[platformId] ?? {};

  let changed = false;

  if (Object.keys(localPartial).length > 0) {
    const updated = { ...currentLocal, ...localPartial };
    if (JSON.stringify(updated) !== JSON.stringify(currentLocal)) {
      credentials[platformId] = updated;
      changed = true;
    }
  }

  if (Object.keys(sessionPartial).length > 0) {
    const updated = { ...currentSession, ...sessionPartial };
    if (JSON.stringify(updated) !== JSON.stringify(currentSession)) {
      session[platformId] = updated;
      changed = true;
    }
  }

  if (!changed) return;

  await writeLocalCredentials(credentials);
  await writeSessionCredentials(session);
}

export async function clearCredentials(platformId) {
  await migrateStorage();
  const credentials = await readLocalCredentials();
  const session = await readSessionCredentials();
  delete credentials[platformId];
  delete session[platformId];
  await writeLocalCredentials(credentials);
  await writeSessionCredentials(session);
}

export function isSwiggyLoggedIn(creds) {
  return Boolean(creds.accessToken && creds.restaurantId);
}

export function isZomatoLoggedIn(creds) {
  if (!resolveZomatoResId(creds, "")) return false;
  return Boolean(creds.csrf || creds.mxCsrf || creds.authToken);
}

export function isLoggedIn(platformId, creds) {
  if (platformId === "zomato") return isZomatoLoggedIn(creds);
  return isSwiggyLoggedIn(creds);
}
