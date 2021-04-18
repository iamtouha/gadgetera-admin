"use strict";

const { customAlphabet } = require("nanoid/async");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTWVWXYZ", 10);
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */
const lowCostDeliveyAreas = ["Dhaka"];

module.exports = {
  lifecycles: {
    async beforeCreate(order) {
      order.order_id = await nanoid();
    },
  },
};
