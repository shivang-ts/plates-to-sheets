import {
  authTokenFromCookieHeader,
  parseResIdFromAuthToken,
  resIdFromRequestBody,
} from "../lib/zomato/res-id.js";
import { saveCredentials as persistCredentials } from "../lib/storage.js";
import { debugLog } from "../lib/logger.js";

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

function buildZomatoPartial(cookieHeader, csrf, mxCsrf) {
  const partial = {};
  if (csrf) partial.csrf = csrf;
  if (mxCsrf) partial.mxCsrf = mxCsrf;

  const authToken = authTokenFromCookieHeader(cookieHeader);
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
        debugLog("[SwiggyOrders]", "Captured access token via webRequest");
      }

      if (details.url.includes("api.zomato.com")) {
        const cookieHeader = headerValue(details.requestHeaders, "cookie");
        const csrf = headerValue(details.requestHeaders, "x-zomato-csrft");
        const mxCsrf = headerValue(details.requestHeaders, "x-zomato-mx-csrf-token");
        const partial = buildZomatoPartial(cookieHeader, csrf, mxCsrf);

        if (Object.keys(partial).length > 0) {
          void persistCredentials("zomato", partial);
          debugLog("[ZomatoOrders]", "Captured Zomato session fields:", Object.keys(partial).join(", "));
        }
      }
    },
    {
      urls: [
        "https://rms.swiggy.com/*",
        "https://partner.swiggy.com/*",
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
          debugLog("[SwiggyOrders]", "Captured restaurantId via webRequest");
        }
      }

      if (details.url.includes("api.zomato.com")) {
        const resId = resIdFromRequestBody(bodyText);
        if (resId) {
          void persistCredentials("zomato", { resId });
          debugLog("[ZomatoOrders]", "Captured resId via webRequest");
        }
      }
    },
    { urls: ["https://rms.swiggy.com/*", "https://api.zomato.com/*"] },
    ["requestBody"]
  );
}
