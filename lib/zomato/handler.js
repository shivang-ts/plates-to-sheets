import {
  fetchAllOrderHistorySnippets,
  fetchAllOrderDetails,
  defaultZomatoDateRange,
} from "./api.js";
import {
  mapZomatoDetailToSwiggyOrder,
  buildZomatoCustomerInfoMap,
  stripInternalFields,
} from "./map-order.js";
import { ordersToCsv, buildFilename } from "../csv.js";
import { getCredentials } from "../storage.js";

export async function exportZomatoOrders(options = {}) {
  const ctx = options.ctx ?? null;
  const creds = await getCredentials("zomato");

  if (!creds.resId) {
    return {
      ok: false,
      error: "Not logged in to Zomato. Open the partner dashboard or enter credentials manually.",
      authError: true,
    };
  }

  const createdAt =
    options.createdAt ??
    (options.startDate && options.endDate
      ? `${options.startDate},${options.endDate}`
      : defaultZomatoDateRange(options.daysBack ?? 0));

  ctx?.checkCancelled();

  const snippets = await fetchAllOrderHistorySnippets({
    resId: creds.resId,
    createdAt,
    limit: options.limit ?? 10,
    ctx,
  });

  if (!snippets.length) {
    return {
      ok: true,
      orderCount: 0,
      filename: buildFilename("zomato"),
      csvContent: ordersToCsv([]),
      shouldDownload: false,
    };
  }

  ctx?.checkCancelled();

  const detailResponses = await fetchAllOrderDetails(snippets, { ctx });

  const mappedOrders = detailResponses
    .map(mapZomatoDetailToSwiggyOrder)
    .filter(Boolean);

  const customerInfoMap = buildZomatoCustomerInfoMap(mappedOrders);
  const ordersForCsv = mappedOrders.map(stripInternalFields);
  const csvContent = ordersToCsv(ordersForCsv, customerInfoMap);
  const filename = buildFilename("zomato");

  ctx?.report({
    phase: "csv",
    current: mappedOrders.length,
    total: mappedOrders.length,
    message: "Building CSV…",
  });

  console.log("[ZomatoOrders] export summary:", {
    historyCount: snippets.length,
    detailsFetched: detailResponses.length,
    csvRows: mappedOrders.length,
  });

  return {
    ok: true,
    orderCount: mappedOrders.length,
    historyCount: snippets.length,
    filename,
    csvContent,
    shouldDownload: mappedOrders.length > 0,
  };
}
