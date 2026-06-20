import { authHeaders } from "./swiggy-headers.js";
import { mapWithConcurrency } from "./export-context.js";
import { debugLog, debugWarn } from "./logger.js";

const RXCX_INFO_BASE = "https://rms.swiggy.com/api/v1/rxcx/info";
const LOG = "[SwiggyOrders]";

export function extractCustomerIds(orders) {
  const ids = new Set();
  for (const order of orders) {
    const id = order.customer?.customer_id;
    if (id !== undefined && id !== null && String(id).length > 0) {
      ids.add(String(id));
    }
  }
  return [...ids];
}

async function fetchCustomerInfo(accessToken, restaurantId, customerId) {
  const url = `${RXCX_INFO_BASE}?restId=${restaurantId}&customerId=${customerId}`;

  debugLog(LOG, "rxcx/info request", { customerId });

  const response = await fetch(url, { method: "GET", headers: authHeaders(accessToken) });

  if (!response.ok) {
    throw new Error(`rxcx/info failed (${response.status}) for customer ${customerId}`);
  }

  const data = await response.json();
  debugLog(LOG, "rxcx/info ok", { customerId });

  if (data.statusCode !== 0 || !data.data) {
    throw new Error(data.statusMessage || `rxcx/info error for customer ${customerId}`);
  }

  return {
    rtr: data.data.rtr,
    ntr: data.data.ntr,
    orderCount: data.data.orderCount,
  };
}

export async function fetchCustomerInfoMap(accessToken, restaurantId, orders, options = {}) {
  const customerIds = extractCustomerIds(orders);
  const infoMap = new Map();
  const ctx = options.ctx ?? null;
  const concurrency = options.concurrency ?? 3;
  const delayMs = options.delayMs ?? 150;

  if (!customerIds.length) return infoMap;

  debugLog(LOG, "Fetching rxcx/info for", customerIds.length, "customers");

  ctx?.report({
    phase: "customers",
    current: 0,
    total: customerIds.length,
    message: `Fetching customer info… 0/${customerIds.length}`,
  });

  await mapWithConcurrency(
    customerIds,
    async (customerId) => {
      try {
        const info = await fetchCustomerInfo(accessToken, restaurantId, customerId);
        infoMap.set(customerId, info);
        return info;
      } catch (err) {
        debugWarn(LOG, "rxcx/info failed for customer", customerId, err.message);
        infoMap.set(customerId, { rtr: "", ntr: "", orderCount: "" });
        return null;
      }
    },
    {
      concurrency,
      delayMs,
      ctx,
      onProgress: (completed, total) => {
        ctx?.report({
          phase: "customers",
          current: completed,
          total,
          message: `Fetching customer info… ${completed}/${total}`,
        });
      },
    }
  );

  return infoMap;
}
