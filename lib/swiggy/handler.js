import { ordersToCsv, extractOrders, buildFilename } from "../csv.js";
import { fetchCustomerInfoMap } from "../customer-info.js";
import { authHeaders } from "../swiggy-headers.js";
import { getCredentials } from "../storage.js";
import { debugLog, isDebugEnabled } from "../logger.js";

const FETCH_ORDERS_URL = "https://rms.swiggy.com/orders/v1/fetchOrders";
const LOG = "[SwiggyOrders]";

function buildFetchOrdersBody(restaurantId) {
  return {
    restaurantTimeMap: [{ restaurantId, lastUpdatedTime: null }],
    sourceMessageIdMap: { source: "INITIAL_LOAD" },
  };
}

async function fetchOrders(accessToken, restaurantId) {
  const bodyJson = JSON.stringify(buildFetchOrdersBody(restaurantId));

  debugLog(LOG, "fetchOrders request", { restaurantId });

  const response = await fetch(FETCH_ORDERS_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: bodyJson,
  });

  if (response.status === 401 || response.status === 403) {
    const err = new Error("Authentication failed. Please log in again.");
    err.authError = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`API request failed (${response.status} ${response.statusText})`);
  }

  const data = await response.json();
  const orders = extractOrders(data);

  debugLog(LOG, "fetchOrders ok — orders:", orders.length);

  if (data.statusCode !== 0) {
    const err = new Error(data.statusMessage || "API returned an error.");
    if (/auth|token|unauthorized/i.test(data.statusMessage ?? "")) {
      err.authError = true;
    }
    throw err;
  }

  return { data, orders };
}

export async function exportSwiggyOrders(options = {}) {
  const ctx = options.ctx ?? null;
  const creds = await getCredentials("swiggy");

  if (!creds.accessToken || !creds.restaurantId) {
    return {
      ok: false,
      error: "Not logged in to Swiggy. Open the partner dashboard or enter credentials manually.",
      authError: true,
    };
  }

  ctx?.report({
    phase: "orders",
    current: 0,
    total: 0,
    message: "Fetching orders…",
  });

  ctx?.checkCancelled();

  const { data, orders } = await fetchOrders(creds.accessToken, creds.restaurantId);

  ctx?.report({
    phase: "orders",
    current: orders.length,
    total: orders.length,
    message: `Loaded ${orders.length} order(s)`,
  });

  ctx?.checkCancelled();

  const customerInfoMap = await fetchCustomerInfoMap(
    creds.accessToken,
    creds.restaurantId,
    orders,
    { ctx }
  );

  ctx?.report({
    phase: "csv",
    current: orders.length,
    total: orders.length,
    message: "Building CSV…",
  });

  const csvContent = ordersToCsv(orders, customerInfoMap);
  const filename = buildFilename("swiggy");

  const result = {
    ok: true,
    orderCount: orders.length,
    customerCount: customerInfoMap.size,
    filename,
    csvContent,
    shouldDownload: orders.length > 0,
  };

  if (isDebugEnabled()) {
    result.apiResponse = data;
  }

  return result;
}
