import { getCredentials, saveCredentials } from "../storage.js";
import { resolveZomatoResId } from "./res-id.js";
import { mapWithConcurrency } from "../export-context.js";

const ORDER_HISTORY_URL = "https://api.zomato.com/merchant-gw/web/order/history/get-all-v2";
const ORDER_DETAILS_URL = "https://www.zomato.com/merchant-api/orders/order-details";

const ZOMATO_API_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/json",
  dnt: "1",
  origin: "https://www.zomato.com",
  priority: "u=1, i",
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
  "x-client-id": "zomato_web_merchant",
  "x-zomato-app-version": "2",
  "x-zomato-source-identifier": "merchant-dashboard",
};

const ZOMATO_DETAILS_HEADERS = {
  accept: "application/json, text/plain, */*",
  dnt: "1",
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "user-agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
  "x-client-id": "zomato_web_merchant",
  "x-zomato-app-version": "2",
  referer: "https://www.zomato.com/partners/onlineordering/orderHistory/",
};

function randomTraceId() {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  let id = "web";
  for (let i = 0; i < 8; i++) id += hex();
  id += "-";
  for (let i = 0; i < 4; i++) id += hex();
  id += "-4";
  for (let i = 0; i < 3; i++) id += hex();
  id += "-";
  id += ["8", "9", "a", "b"][Math.floor(Math.random() * 4)];
  for (let i = 0; i < 3; i++) id += hex();
  id += "-";
  for (let i = 0; i < 12; i++) id += hex();
  return id;
}

export function defaultZomatoDateRange(daysBack = 0) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return `${fmt(start)},${fmt(end)}`;
}

async function buildCookieHeader() {
  const urls = [
    "https://www.zomato.com",
    "https://zomato.com",
    "https://api.zomato.com",
  ];
  const seen = new Set();
  const parts = [];

  for (const url of urls) {
    const cookies = await chrome.cookies.getAll({ url });
    for (const cookie of cookies) {
      if (!seen.has(cookie.name)) {
        seen.add(cookie.name);
        parts.push(`${cookie.name}=${cookie.value}`);
      }
    }
  }

  return parts.join("; ");
}

async function buildAuthContext() {
  const creds = await getCredentials("zomato");
  const cookieHeader = creds.cookieHeader || (await buildCookieHeader());

  if (!cookieHeader && !creds.authToken) {
    const err = new Error("Not logged in to Zomato. Open the partner dashboard to capture session.");
    err.authError = true;
    throw err;
  }

  return { creds, cookieHeader };
}

function throwZomatoApiError(data, fallback) {
  const err = new Error(
    data?.display?.subtitle || data?.message || fallback || "Zomato API failed"
  );
  if (data?.code === 1020 || /auth|author/i.test(data?.message ?? "")) {
    err.authError = true;
  }
  throw err;
}

async function ensureResId(creds, cookieHeader) {
  const resId = resolveZomatoResId(creds, cookieHeader);
  if (!resId) {
    const err = new Error(
      "Restaurant ID (res_Id) not found. Open the Zomato partner dashboard or enter res_Id manually (e.g. 22737520)."
    );
    err.authError = true;
    throw err;
  }
  if (resId !== creds.resId) {
    await saveCredentials("zomato", { resId });
  }
  return resId;
}

function buildHistoryHeaders(creds, cookieHeader) {
  const headers = {
    ...ZOMATO_API_HEADERS,
    cookie: cookieHeader,
    "x-zomato-trace-id": randomTraceId(),
  };
  if (creds.csrf) headers["x-zomato-csrft"] = creds.csrf;
  if (creds.mxCsrf) headers["x-zomato-mx-csrf-token"] = creds.mxCsrf;
  return headers;
}

function buildDetailsHeaders(creds, cookieHeader) {
  const headers = {
    ...ZOMATO_DETAILS_HEADERS,
    cookie: cookieHeader,
    "X-Zomato-Trace-Id": randomTraceId(),
  };
  if (creds.csrf) headers["x-zomato-csrft"] = creds.csrf;
  return headers;
}

function buildOrderHistoryBody(resId, createdAt, postbackParams = "", limit = 10) {
  return {
    res_Id: String(resId),
    limit,
    order_type: "",
    created_at: createdAt,
    postback_params: postbackParams,
    state: "",
    rating: "",
    get_filters: !postbackParams,
  };
}

async function fetchOrderHistoryPage(resId, createdAt, postbackParams, headers, limit) {
  const bodyJson = JSON.stringify(buildOrderHistoryBody(resId, createdAt, postbackParams, limit));

  console.log("[ZomatoOrders] get-all-v2 request:", {
    postbackParams: postbackParams || "(first page)",
    body: bodyJson,
  });

  const response = await fetch(ORDER_HISTORY_URL, {
    method: "POST",
    headers,
    body: bodyJson,
  });

  if (response.status === 401 || response.status === 403) {
    const err = new Error("Zomato authentication failed. Please log in again.");
    err.authError = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Zomato history API failed (${response.status} ${response.statusText})`);
  }

  const data = await response.json();
  if (data?.status === "failed") {
    throwZomatoApiError(data, "Zomato order history request failed");
  }

  return data;
}

export async function fetchAllOrderHistorySnippets(options = {}) {
  const { creds, cookieHeader } = await buildAuthContext();
  const resId = options.resId ?? (await ensureResId(creds, cookieHeader));
  const createdAt = options.createdAt ?? defaultZomatoDateRange(options.daysBack ?? 0);
  const limit = options.limit ?? 10;
  const ctx = options.ctx ?? null;

  const headers = buildHistoryHeaders(creds, cookieHeader);
  const allSnippets = [];
  let postbackParams = "";
  let hasMore = true;
  let page = 0;
  const maxPages = options.maxPages ?? 100;

  ctx?.report({
    phase: "history",
    current: 0,
    total: 0,
    message: "Loading order history…",
  });

  while (hasMore && page < maxPages) {
    ctx?.checkCancelled();

    const data = await fetchOrderHistoryPage(resId, createdAt, postbackParams, headers, limit);
    const snippets = data?.snippets ?? [];
    allSnippets.push(...snippets);

    console.log("[ZomatoOrders] history page", page + 1, "— snippets:", snippets.length, "hasMore:", data?.hasMore);

    ctx?.report({
      phase: "history",
      current: allSnippets.length,
      total: data?.hasMore ? allSnippets.length + limit : allSnippets.length,
      message: `Loading order history… ${allSnippets.length} found`,
    });

    hasMore = Boolean(data?.hasMore);
    postbackParams = data?.postbackParams ?? "";
    page += 1;

    if (hasMore && !postbackParams) break;

    if (hasMore) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log("[ZomatoOrders] total history snippets:", allSnippets.length);
  return allSnippets;
}

export async function fetchOrderDetails(tabId, authContext = null, signal = null) {
  const { creds, cookieHeader } = authContext ?? (await buildAuthContext());
  const headers = buildDetailsHeaders(creds, cookieHeader);
  const url = `${ORDER_DETAILS_URL}?tab_id=${tabId}&view=order-history`;

  console.log("[ZomatoOrders] order-details request:", { tabId });

  const response = await fetch(url, { method: "GET", headers, signal });

  if (response.status === 401 || response.status === 403) {
    const err = new Error("Zomato authentication failed. Please log in again.");
    err.authError = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Zomato order-details failed (${response.status}) for order ${tabId}`);
  }

  const data = await response.json();

  if (data?.status === "failed") {
    throwZomatoApiError(data, `Order details failed for ${tabId}`);
  }

  if (data.status !== "success" || !data.order) {
    throw new Error(`Invalid order-details response for order ${tabId}`);
  }

  console.log("[ZomatoOrders] order-details response:", { tabId, orderId: data.order.id });
  return data;
}

export async function fetchAllOrderDetails(snippets, options = {}) {
  const authContext = options.authContext ?? (await buildAuthContext());
  const ctx = options.ctx ?? null;
  const concurrency = options.concurrency ?? 3;
  const delayMs = options.delayMs ?? 150;

  const tabIds = snippets.map((s) => s?.id).filter(Boolean);
  if (!tabIds.length) return [];

  ctx?.report({
    phase: "details",
    current: 0,
    total: tabIds.length,
    message: `Fetching order details… 0/${tabIds.length}`,
  });

  const results = await mapWithConcurrency(
    tabIds,
    async (tabId) => {
      try {
        return await fetchOrderDetails(tabId, authContext);
      } catch (err) {
        if (err?.cancelled) throw err;
        console.warn("[ZomatoOrders] order-details failed for", tabId, err.message);
        return null;
      }
    },
    {
      concurrency,
      delayMs,
      ctx,
      onProgress: (completed, total) => {
        ctx?.report({
          phase: "details",
          current: completed,
          total,
          message: `Fetching order details… ${completed}/${total}`,
        });
      },
    }
  );

  return results.filter(Boolean);
}
