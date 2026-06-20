/**
 * Zomato restaurant IDs are typically 5–9 digits (e.g. 22737520).
 * Reject timestamps and other large numbers wrongly captured from storage/URLs.
 */
export function isValidZomatoResId(id) {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (!/^\d{5,9}$/.test(s)) return false;
  const n = Number(s);
  // Reject values that look like unix timestamps (seconds)
  if (n >= 1_000_000_000) return false;
  return true;
}

export function normalizeResId(id) {
  if (!isValidZomatoResId(id)) return null;
  return String(id).trim();
}

export function parseResIdFromAuthToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const rrm = payload?.rrm;
    if (!rrm || typeof rrm !== "object") return null;

    const ids = Object.keys(rrm).filter(isValidZomatoResId);
    if (ids.length === 1) return ids[0];
    if (ids.length > 1) return ids[0];
  } catch {
    // ignore decode errors
  }
  return null;
}

export function authTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/X-Zomato-Mx-Auth-Token=([^;]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export function resIdFromRequestBody(bodyText) {
  if (!bodyText) return null;
  try {
    const parsed = JSON.parse(bodyText);
    const id = parsed?.res_Id ?? parsed?.res_id;
    return normalizeResId(id);
  } catch {
    return null;
  }
}

export function resolveZomatoResId(creds, cookieHeader) {
  const fromStorage = normalizeResId(creds?.resId);
  if (fromStorage) return fromStorage;

  const token = creds?.authToken || authTokenFromCookieHeader(cookieHeader);
  const fromJwt = parseResIdFromAuthToken(token);
  if (fromJwt) return fromJwt;

  return null;
}
