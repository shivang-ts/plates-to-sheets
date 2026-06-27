import { utcIsoToIstLocal } from "../ist-time.js";

function parseDistanceKm(locality) {
  if (!locality) return "";
  const match = String(locality).match(/(\d+(?:\.\d+)?)\s*kms?/i);
  return match ? match[1] : "";
}

function extractChannel(orderMessages) {
  if (!Array.isArray(orderMessages)) return "Zomato";
  const header = orderMessages.find((m) => m.messageTag === "header_tag");
  return header?.value?.message ?? "Zomato";
}

function extractOfferDescription(cartDetails) {
  const discounts = cartDetails?.discountApplied?.discounts;
  if (!Array.isArray(discounts) || !discounts.length) return "";
  const parts = discounts.flatMap((entry) => {
    const kvs = entry?.amountBreakup?.body?.keyValues;
    if (!Array.isArray(kvs)) return entry?.discount?.name ? [entry.discount.name] : [];
    return kvs.map((kv) => kv.key?.message).filter(Boolean);
  });
  return parts.join(" + ");
}

function findPackingCharge(charges) {
  if (!Array.isArray(charges)) return "";
  const packing = charges.find((c) =>
    /pack/i.test(c?.amountDetails?.itemName ?? c?.amountDetails?.type ?? "")
  );
  return packing?.amountDetails?.amountTotalCost ?? packing?.amountDetails?.totalCost ?? "";
}

function dishesToCartItems(dishes) {
  if (!Array.isArray(dishes)) return [];
  return dishes.map((d) => ({
    name: d.name,
    quantity: d.quantity ?? 1,
    customisations: d.customisations,
    chooseText: d.chooseText,
  }));
}

function extractDiscount(cartDetails) {
  const discounts = cartDetails?.discountApplied?.discounts;
  if (!Array.isArray(discounts) || !discounts.length) return "";
  const amount = discounts[0]?.discount?.totalDiscountAmount;
  if (amount === undefined || amount === null) return "";
  return Math.abs(Number(amount));
}

/**
 * Picks the rider entry with the most delivery data (name, pickup, delivery timestamps).
 */
function extractRiderInfo(order) {
  const riders = order.supportingRiderDetails;
  if (!Array.isArray(riders) || !riders.length) {
    return { name: "", pickedUp: "", deliveredAt: "" };
  }

  const scored = riders.map((rider) => {
    let score = 0;
    if (rider.name) score += 4;
    if (rider.pickedUp) score += 2;
    if (rider.deliveredAt) score += 2;
    if (rider.assignedAt) score += 1;
    if (rider.riderStatus === "PICKED_UP" || rider.riderStatus === "DELIVERED") score += 1;
    return { rider, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const rider = scored[0]?.rider ?? riders[0];

  return {
    name: rider?.name ?? "",
    pickedUp: rider?.pickedUp ?? "",
    deliveredAt: rider?.deliveredAt ?? "",
  };
}

/**
 * Maps a Zomato order-details payload to the Swiggy-shaped object used by ordersToCsv.
 */
export function mapZomatoDetailToSwiggyOrder(detailResponse) {
  const order = detailResponse?.order ?? detailResponse;
  if (!order) return null;

  const dishes = order.cartDetails?.items?.dishes ?? [];
  const subtotal = order.cartDetails?.subtotal?.amountDetails?.totalCost ?? "";
  const discount = extractDiscount(order.cartDetails);
  const rider = extractRiderInfo(order);

  const deliveredTime =
    rider.deliveredAt ||
    (order.state === "DELIVERED" ? order.updatedAt ?? "" : "");

  return {
    order_id: order.id ?? "",
    status: {
      order_status: order.state ?? "",
      placed_time: utcIsoToIstLocal(order.actionedAt ?? order.createdAt ?? ""),
      ordered_time: utcIsoToIstLocal(order.createdAt ?? ""),
      pickedup_time: utcIsoToIstLocal(rider.pickedUp),
      food_prep_time: order.handoverDetails?.time ?? "",
      delivered_time: utcIsoToIstLocal(deliveredTime),
    },
    customer: {
      customer_id: order.creator?.userId ?? "",
      customer_name: order.creator?.name ?? order.creator?.originalName ?? "",
    },
    customer_area: order.creator?.address?.locality ?? order.creator?.address?.address ?? "",
    customer_distance: parseDistanceKm(
      order.creator?.address?.locality ?? order.creator?.address?.address
    ),
    cart: {
      items: dishesToCartItems(dishes),
      charges: {
        packing_charge: findPackingCharge(order.cartDetails?.charges),
      },
    },
    bill: subtotal,
    discount,
    delivery_boy: {
      name: rider.name,
    },
    channel: extractChannel(order.orderMessages),
    offer_description: extractOfferDescription(order.cartDetails),
    _zomatoCreator: order.creator,
  };
}

export function buildZomatoCustomerInfoMap(mappedOrders) {
  const map = new Map();
  for (const order of mappedOrders) {
    const creator = order._zomatoCreator;
    const userId = creator?.userId;
    if (!userId) continue;

    map.set(String(userId), {
      rtr: "",
      ntr: "",
      orderCount: creator.orderCount ?? "",
    });
  }
  return map;
}

export function stripInternalFields(order) {
  const { _zomatoCreator, ...rest } = order;
  return rest;
}
