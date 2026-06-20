const CSV_COLUMNS = [
  "order_id",
  "order_status",
  "placed_time",
  "ordered_time",
  "pickedup_time",
  "food_prep_time",
  "delivered_time",
  "customer_id",
  "customer_name",
  "customer_area",
  "customer_distance_km",
  "rtr",
  "ntr",
  "customer_order_count",
  "items_summary",
  "item_variants",
  "item_count",
  "bill",
  "discount",
  "bill total",
  "REV",
  "packing_charge",
  "delivery_partner",
  "channel",
  "offer_description",
];

function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function summarizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => `${item.name || "Unknown"} x${item.quantity ?? 1}`)
    .join("; ");
}

function extractItemVariantParts(item) {
  const parts = [];

  if (item.variants && String(item.variants).trim()) {
    parts.push(String(item.variants).trim());
  }

  for (const entry of item.newVariants ?? []) {
    if (entry?.name) parts.push(entry.name);
  }

  for (const entry of item.newAddons ?? []) {
    if (entry?.name) parts.push(entry.name);
  }

  for (const entry of item.addons ?? []) {
    if (entry?.name) parts.push(entry.name);
  }

  for (const entry of item.customisations ?? []) {
    if (!entry?.name) continue;
    parts.push(entry.groupName ? `${entry.groupName}: ${entry.name}` : entry.name);
  }

  if (!parts.length && item.chooseText) {
    parts.push(String(item.chooseText));
  }

  return [...new Set(parts)];
}

function summarizeItemVariants(items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return items
    .map((item) => {
      const variants = extractItemVariantParts(item);
      if (!variants.length) return "";
      const name = item.name || "Unknown";
      return `${name}: ${variants.join(", ")}`;
    })
    .filter(Boolean)
    .join("; ");
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function orderToRow(order, customerInfoMap = new Map()) {
  const items = order.cart?.items ?? [];
  const customerId = order.customer?.customer_id ?? "";
  const customerInfo = customerInfoMap.get(String(customerId)) ?? {};
  const bill = toNumber(order.bill);
  const discount = toNumber(order.discount);
  const billTotal = bill !== null && discount !== null ? bill - discount : null;
  const rev = billTotal !== null ? billTotal * 0.9 : null;

  return {
    order_id: order.order_id ?? "",
    order_status: order.status?.order_status ?? "",
    placed_time: order.status?.placed_time ?? "",
    ordered_time: order.status?.ordered_time ?? "",
    pickedup_time: order.status?.pickedup_time ?? "",
    food_prep_time: order.status?.food_prep_time ?? "",
    delivered_time: order.status?.delivered_time ?? "",
    customer_id: customerId,
    customer_name: order.customer?.customer_name ?? "",
    customer_area: order.customer_area ?? "",
    customer_distance_km: order.customer_distance ?? "",
    rtr: customerInfo.rtr ?? "",
    ntr: customerInfo.ntr ?? "",
    customer_order_count: customerInfo.orderCount ?? "",
    items_summary: summarizeItems(items),
    item_variants: summarizeItemVariants(items),
    item_count: items.length,
    bill: order.bill ?? "",
    discount: order.discount ?? "",
    "bill total": billTotal ?? "",
    REV: rev ?? "",
    packing_charge: order.cart?.charges?.packing_charge ?? "",
    delivery_partner: order.delivery_boy?.name ?? "",
    channel: order.channel ?? "",
    offer_description: order.offer_description ?? "",
  };
}

export function ordersToCsv(orders, customerInfoMap = new Map()) {
  const header = CSV_COLUMNS.map(escapeCsvField).join(",");
  const rows = orders.map((order) => {
    const row = orderToRow(order, customerInfoMap);
    return CSV_COLUMNS.map((col) => escapeCsvField(row[col])).join(",");
  });
  return [header, ...rows].join("\n");
}

export function extractOrders(response) {
  const restaurantData = response?.restaurantData;
  if (!Array.isArray(restaurantData)) return [];
  return restaurantData.flatMap((r) => r.orders ?? []);
}

export function buildFilename(platform = "swiggy") {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("");
  return `${platform}-orders-${stamp}.csv`;
}
