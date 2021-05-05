"use strict";

const { sanitizeEntity } = require("strapi-utils");

const lowCostDeliveyAreas = process.env.AREA
  ? process.env.AREA.split(",").map((str) => str.trim())
  : ["Dhaka"];

module.exports = {
  async create(ctx) {
    const order = ctx.request.body;
    const { cash_on_delivery, trx_id, payment_method, cart, address } = order;

    if (!cart || !cart.length)
      return ctx.response.badRequest("Invalid Data Input");
    if (!payment_method || !trx_id)
      return ctx.response.badRequest("Invalid Payment Info");
    if (!address || !address.phone)
      return ctx.response.badRequest("Invalid Address");

    try {
      let charge = parseFloat(process.env.OUTSIDE_CHARGE) || 120;
      const user = ctx.state.user;

      if (lowCostDeliveyAreas.includes(order.address.district)) {
        charge = parseFloat(process.env.DHAKA_CHARGE) || 70;
      }

      //   calculate cart total
      const newCart = [];
      let cartTotal = 0;
      const arr = cart.map((item) => item.product);
      const ids = Array.from(new Set(arr));

      const products = await strapi.services.product.find({ id_in: ids });

      if (!products.length) {
        return ctx.response.badRequest("Invalid Data Input");
      }

      products.forEach((product) => {
        const cartItem = cart.find((item) => item.product === product.id);
        const unitPrice = product.discount
          ? product.price - product.discount * product.price
          : product.price;
        const item = {
          product: product.id,
          quantity: cartItem.quantity,
          subtotal: unitPrice * cartItem.quantity,
        };
        newCart.push(item);
        cartTotal += item.subtotal;
      });

      // check coupon validity and apply
      let appliedCoupon;
      if (order.coupon) {
        const coupon = await strapi.services.coupon.findOne({
          code: order.coupon,
          minimum_order_lte: cartTotal,
          expire_date_gte: new Date().toISOString().substring(0, 10),
        });
        if (coupon && coupon.limit > coupon.applied) {
          appliedCoupon = coupon;
        }
      }

      //   registers order
      const orderObj = {
        cash_on_delivery: cash_on_delivery ? true : false,
        coupon: appliedCoupon ? appliedCoupon.id : null,
        cart: newCart,
        address,
        status: "pending",
        total:
          cartTotal + charge - (appliedCoupon ? appliedCoupon.discount : 0),
        trx_id,
        payment_method,
      };
      if (user) orderObj.user = user.id;
      const orderResp = await strapi.services.order.create(orderObj);

      // save user address
      let promise1;
      if (user && user.address) {
        promise1 = strapi.services.address.update({ user: user.id }, address);
      } else if (user) {
        promise1 = strapi.services.address.create({
          user: user.id,
          ...address,
        });
      }

      // send order details email
      let promise2;
      if (address.email && process.env.NODE_ENV === "production") {
        promise2 = strapi.plugins["email"].services.email.send({
          to: address.email,
          from: "sales@gadgeterabd.com",
          subject: "You placed an order",
          html: `
               <p>Dear ${address.receiver},<br></p>
               <p>Thank you for choosing us. Here is your order details:</p>
               <p>Order id: #${orderResp.order_id}</p>
               <p>receiver phone number: ${address.phone}</p>
               <p>address: ${address.street_address}, ${address.sub_district}, ${address.district}</p>
               <p><br>Thanks</p>
               <p>Gadget Era Team</p>
              `,
        });
      }

      //update coupon applied count
      let promise3;
      if (appliedCoupon) {
        promise3 = strapi.services.coupon.update(
          { id: appliedCoupon.id },
          { applied: appliedCoupon.applied + 1 }
        );
      }
      await Promise.all([promise1, promise2, promise3]);
      return sanitizeEntity(orderResp, {
        model: strapi.models.order,
      });
    } catch (error) {
      console.log(error.message);
      if (error.message.includes("Duplicate entry")) {
        return ctx.response.notAcceptable("Duplicate Transaction ID");
      }
      return ctx.response.badImplementation("Internal error");
    }
  },
};
