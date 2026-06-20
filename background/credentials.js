import {
  authTokenFromCookieHeader,
  isValidZomatoResId,
  normalizeResId,
  parseResIdFromAuthToken,
  resIdFromRequestBody,
  resolveZomatoResId,
} from "../lib/zomato/res-id.js";
import { saveCredentials as persistCredentials } from "../lib/storage.js";

function parseRequestBody(details) {
  if (!details.requestBody?.raw?.length) return null;
  try {
    return details.requestBody.raw
      .map((part) => (part.bytes ? new TextDecoder("utf-8").decode(part.bytes) : ""))
      .join("");
  } catch {
    return null;
  }
}

function headerValue(headers, name) {
  const header = headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}

function restaurantIdFromSwiggyBody(bodyText) {
  if (!bodyText) return null;
  try {
    const parsed = JSON.parse(bodyText);
    const map = parsed?.restaurantTimeMap;
    if (Array.isArray(map) && map[0]?.restaurantId) {
      return Number(map[0].restaurantId);
    }
    if (parsed?.restaurantId) return Number(parsed.restaurantId);
  } catch {
    // ignore
  }
  return null;
}

function resIdFromZomatoBody(bodyText) {
  return resIdFromRequestBody(bodyText);
}

function buildZomatoPartial(cookieHeader, csrf, mxCsrf, authToken) {
  const partial = {};
  if (cookieHeader) partial.cookieHeader = cookieHeader;
  if (csrf) partial.csrf = csrf;
  if (mxCsrf) partial.mxCsrf = mxCsrf;
  if (authToken) partial.authToken = authToken;

  const resIdFromJwt = parseResIdFromAuthToken(authToken);
  if (resIdFromJwt) partial.resId = resIdFromJwt;

  return partial;
}

export function registerWebRequestCapture() {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const token = headerValue(details.requestHeaders, "access_token")
        || headerValue(details.requestHeaders, "accesstoken");
      if (token) {
        void persistCredentials("swiggy", { accessToken: token });
      }

      if (details.url.includes("api.zomato.com")) {
        const cookieHeader = headerValue(details.requestHeaders, "cookie");
        const csrf = headerValue(details.requestHeaders, "x-zomato-csrft");
        const mxCsrf = headerValue(details.requestHeaders, "x-zomato-mx-csrf-token");
        const authToken = authTokenFromCookieHeader(cookieHeader);
        const partial = buildZomatoPartial(cookieHeader, csrf, mxCsrf, authToken);

        if (Object.keys(partial).length > 0) {
          void persistCredentials("zomato", partial);
        }
      }
    },
    {
      urls: [
        "https://rms.swiggy.com/*",
        "https://*.swiggy.com/*",
        "https://api.zomato.com/*",
      ],
    },
    ["requestHeaders"]
  );

  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.method !== "POST") return;
      const bodyText = parseRequestBody(details);

      if (details.url.includes("rms.swiggy.com")) {
        const restaurantId = restaurantIdFromSwiggyBody(bodyText);
        if (restaurantId) {
          void persistCredentials("swiggy", { restaurantId });
        }
      }

      if (details.url.includes("api.zomato.com")) {
        const resId = resIdFromZomatoBody(bodyText);
        if (resId) {
          void persistCredentials("zomato", { resId });
        }
      }
    },
    { urls: ["https://rms.swiggy.com/*", "https://api.zomato.com/*"] },
    ["requestBody"]
  );
}
