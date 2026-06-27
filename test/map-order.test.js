import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapZomatoDetailToSwiggyOrder } from "../lib/zomato/map-order.js";

describe("mapZomatoDetailToSwiggyOrder", () => {
  it("maps rider and dish customisations", () => {
    const detail = {
      status: "success",
      order: {
        id: "8259494155",
        state: "DELIVERED",
        createdAt: "2026-06-20T17:55:40Z",
        actionedAt: "2026-06-20T17:55:55Z",
        updatedAt: "2026-06-20T18:40:09Z",
        handoverDetails: { time: 18 },
        creator: {
          userId: "134094554",
          name: "Shruti",
          orderCount: 1,
          address: { locality: "Bellandur (6 kms, 25 mins away)" },
        },
        cartDetails: {
          subtotal: { amountDetails: { totalCost: 538 } },
          items: {
            dishes: [
              {
                name: "Smoky BBQ Chicken Pizza",
                quantity: 1,
                customisations: [{ groupName: "Size", name: '10" (6 Slices)' }],
              },
            ],
          },
          discountApplied: {
            discounts: [{ discount: { totalDiscountAmount: -259.5 } }],
          },
          charges: [],
        },
        supportingRiderDetails: [
          {
            name: "Anish Kumar",
            pickedUp: "2026-06-20T18:18:06Z",
            deliveredAt: "2026-06-20T18:40:09Z",
            riderStatus: "PICKED_UP",
          },
        ],
        orderMessages: [{ messageTag: "header_tag", value: { message: "ZOMATO - DELIVERY" } }],
      },
    };

    const mapped = mapZomatoDetailToSwiggyOrder(detail);
    assert.equal(mapped.order_id, "8259494155");
    assert.equal(mapped.delivery_boy.name, "Anish Kumar");
    assert.equal(mapped.status.ordered_time, "2026-06-20T23:25:40");
    assert.equal(mapped.status.placed_time, "2026-06-20T23:25:55");
    assert.equal(mapped.status.pickedup_time, "2026-06-20T23:48:06");
    assert.equal(mapped.status.delivered_time, "2026-06-21T00:10:09");
    assert.equal(mapped.customer_distance, "6");
    assert.equal(mapped.cart.items[0].customisations[0].name, '10" (6 Slices)');
  });
});
