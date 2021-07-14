"use strict";
const { readFileSync } = require("fs");
const { customAlphabet } = require("nanoid/async");
const order = require("../controllers/order");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTWVWXYZ", 10);
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */
module.exports = {
  lifecycles: {
    async beforeCreate(order) {
      order.order_id = await nanoid();
    },
    async afterCreate({ order_id, address, total, coupon, cart, createdAt }) {
      const html = readFileSync("config/email-templates/invoice.html", {
        encoding: "utf-8",
      });
      const emailTemplate = {
        subject: "order #<%- order_id %>",
        html,
        text: "your order confirmation",
      };
      const cartItems = cart.map(({ product, quantity, subtotal }) => ({
        productName: product.name,
        quantity,
        subtotal,
      }));
      const cartTotal = cartItems.reduce((acc, cur) => {
        acc += cur.subtotal;
        return acc;
      }, 0);
      const date = new Date(createdAt || created_at).toLocaleDateString();

      const { receiver, street_address, district, sub_district, phone, email } =
        address;
      const fullAddress = `${street_address}, ${sub_district}, ${district}`;
      const discount = coupon ? coupon.discount : 0;
      await strapi.plugins.email.services.email.sendTemplatedEmail(
        {
          to: email,
        },
        emailTemplate,
        {
          order_id,
          cart: cartItems,
          receiver,
          phone,
          cartTotal,
          discount,
          date,
          fullAddress,
          total,
          shipping: total - cartTotal + discount,
        }
      );
    },
  },
};
