import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ordersToCsv, extractOrders, buildFilename } from "../lib/csv.js";

describe("ordersToCsv", () => {
  it("includes item_variants column with size customisations", () => {
    const order = {
      order_id: "1",
      status: { order_status: "DELIVERED" },
      customer: { customer_id: "c1", customer_name: "Test" },
      cart: {
        items: [
          {
            name: "Veg Pizza",
            quantity: 1,
            customisations: [{ groupName: "Size", name: '8" (4 Slices)' }],
          },
        ],
      },
      bill: 300,
      discount: 0,
    };

    const csv = ordersToCsv([order]);
    const [header, row] = csv.split("\n");
    assert.ok(header.includes("item_variants"));
    assert.match(row, /Veg Pizza: Size: 8/);
  });

  it("computes bill total and REV", () => {
    const order = {
      order_id: "2",
      status: { order_status: "DELIVERED" },
      customer: {},
      cart: { items: [{ name: "Item", quantity: 1 }] },
      bill: 100,
      discount: 10,
    };

    const row = ordersToCsv([order]).split("\n")[1];
    assert.ok(row.includes(",90,"));
    assert.ok(row.includes(",81,"));
  });
});

describe("extractOrders", () => {
  it("flattens restaurantData orders", () => {
    const orders = extractOrders({
      restaurantData: [{ orders: [{ order_id: "a" }, { order_id: "b" }] }],
    });
    assert.equal(orders.length, 2);
  });
});

describe("buildFilename", () => {
  it("prefixes platform name", () => {
    assert.match(buildFilename("zomato"), /^zomato-orders-\d{8}-\d{4}\.csv$/);
  });
});
