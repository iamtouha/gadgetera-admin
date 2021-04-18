"use strict";

const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const lowCostDeliveyAreas = ["Dhaka"];

module.exports = {
  async create(ctx) {
    //   request validation
    if (ctx.is("multipart"))
      return ctx.response.badRequest("Invalid Data Input");
    const order = ctx.request.body;
    const { cart, payment, address, total, saveAddress } = order;

    if (!cart || !cart.length)
      return ctx.response.badRequest("Invalid Data Input");

    const { method, transaction_id, account_no } = payment;
    if (!method || !transaction_id || !account_no)
      return ctx.response.badRequest("Invalid Payment Info");
    if (!address || !address.phone)
      return ctx.response.badRequest("Invalid Address");

    try {
      let charge = 120;
      let discount = 0;
      let cartTotal = 0;
      let couponId = null;
      const user = ctx.state.user;

      if (lowCostDeliveyAreas.includes(order.address.district)) {
        charge = 60;
      }

      //   calculate cart total
      const ids = cart.reduce((acc, crr) => {
        if (!acc.includes(crr.product)) {
          acc.push(crr.product);
        }
        return acc;
      }, []);
      console.log(ids);
      const products = await strapi.query("product").find({ id_in: ids });
      const newCart = [];
      cart.forEach((cartItem) => {
        //   find added products
        const cartProduct = products.find(
          (prod) => prod.id === cartItem.product
        );
        if (!cartProduct) return;

        // find product variant
        const cartVariant = cartProduct.variants.find(
          (vrt) => vrt.id === cartItem.variant
        );
        if (!cartVariant || !cartVariant.inStock) return;

        const item = {
          product: cartProduct.id,
          variant: cartVariant.title,
          quantity: cartItem.quantity,
          subtotal: cartVariant.price * cartItem.quantity,
        };
        newCart.push(item);
        cartTotal += item.subtotal;
      });

      if (!newCart.length) return ctx.response.badRequest("Invalid Data Input");

      if (order.coupon) {
        // check coupon validity
        const coupon = await strapi.query("coupon").findOne({
          id: order.coupon,
          minimum_order_lte: cartTotal,
          expire_date_gte: new Date().toISOString().substring(0, 10),
        });
        if (coupon) {
          discount = coupon.discount;
          couponId = coupon.id;
        }
      }

      // registers a transaction
      const trx_payload = {
        method,
        transaction_id,
        account_no,
        amount: total,
        user: user ? user.id : null,
      };
      const trx = await strapi.services.transaction.create(trx_payload);

      //   registers order
      const orderObj = {
        payment: trx.id,
        coupon: couponId,
        cart: newCart,
        shipping_address: address,
        user: user ? user.id : null,
        status: "pending",
        total: cartTotal + charge - discount,
        cart_total: cartTotal,
        delivery_charge: charge,
      };
      const resp = await strapi.services.order.create(orderObj);

      if (saveAddress && user) {
        const addressData = await strapi.services.address.findOne({
          user: user.id,
        });
        if (!addressData) {
          await strapi.services.address.create({ user: user.id, ...address });
        } else {
          await strapi.services.address.update({ id: addressData.id }, address);
        }
      }

      return sanitizeEntity(resp, {
        model: strapi.models.order,
      });
    } catch (error) {
      if (error.message.includes("Duplicate entry")) {
        return ctx.response.notAcceptable("Transaction already exists");
      }
      return ctx.response.badImplementation("Internal error");
    }
  },
};
