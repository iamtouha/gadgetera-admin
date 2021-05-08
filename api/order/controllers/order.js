"use strict";

const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  async create(ctx) {
    const order = ctx.request.body;
    const { cash_on_delivery, trx_id, payment_method, cart, address } = order;

    if (!cart || !cart.length)
      return ctx.response.badRequest("Invalid Data Input");
    if (!payment_method || !trx_id)
      return ctx.response.badRequest("Invalid Payment Info");
    if (!address || !address.phone || !address.district)
      return ctx.response.badRequest("Invalid Address");

    try {
      const user = ctx.state.user;

      const arr = cart.map((item) => item.product);
      const ids = Array.from(new Set(arr));

      const promise1 = strapi.services.product.find({ id_in: ids });
      const promise2 = strapi.services.payment.find();

      const [products, payInfo] = await Promise.all([promise1, promise2]);

      if (!products.length) {
        return ctx.response.badRequest("Invalid Data Input");
      } else if (products.some((p) => !p.stock)) {
        return ctx.response.notAcceptable("Product is Out of stock");
      }

      const [cartTotal, newCart] = calculateCart(products, cart);

      // check coupon validity and apply
      let appliedCoupon;
      if (order.coupon) {
        const coupon = await validateCoupon(order.coupon, cartTotal);
        if (!coupon) {
          return ctx.response.notAcceptable("Coupon is not acceptable!");
        }
        appliedCoupon = coupon;
      }

      // delivery charge calculation
      const shipping_charge = calcShipping(address, payInfo);

      //   registers order
      const orderObj = {
        user: user ? user.id : null,
        cash_on_delivery: cash_on_delivery ? true : false,
        cart: newCart,
        address,
        status: "pending",
        shipping_charge,
        total: cartTotal + shipping_charge,
        trx_id,
        payment_method,
      };
      if (appliedCoupon) {
        orderObj.coupon = appliedCoupon.id;
        orderObj.total -= appliedCoupon.discount;
      }

      const orderResp = await strapi.services.order.create(orderObj);

      // save user address
      const promise3 = updateUserAddress(address, user);

      // send order details email
      const promise4 = sendConfirmationMail(address, orderResp.order_id);

      //update coupon applied count
      let promise5;
      if (appliedCoupon) {
        promise5 = strapi.services.coupon.update(
          { id: appliedCoupon.id },
          { applied: appliedCoupon.applied + 1 }
        );
      }
      await Promise.all([promise3, promise4, promise5]);
      return sanitizeEntity(orderResp, {
        model: strapi.models.order,
      });
    } catch (error) {
      console.log(error);
      if (error.message.includes("Duplicate entry")) {
        return ctx.response.notAcceptable("Duplicate Transaction ID");
      } else {
        return ctx.response.badImplementation("Internal error");
      }
    }
  },

  // getAll request
  async find(ctx) {
    const query = ctx.query;
    const user = ctx.state.user;
    const orderId = ctx.query.order_id;
    if (!user && !orderId) {
      return ctx.response.badRequest("Not Allowed");
    }
    if (user && !orderId) {
      query.user = user.id;
    }
    const data = await strapi.services.order.find(query);

    if (!user && data.length > 1) {
      return ctx.response.badRequest("Not Allowed");
    }
    return data.map((order) =>
      sanitizeEntity(order, { model: strapi.models.order })
    );
  },
};

// helper functions

async function validateCoupon(code, min) {
  const coupon = await strapi.services.coupon.findOne({
    code,
    minimum_order_lte: min,
    expire_date_gte: new Date().toISOString().substring(0, 10),
  });
  if (coupon && coupon.limit > coupon.applied) {
    return coupon;
  } else {
    return null;
  }
}

function calculateCart(products, cart) {
  let total = 0;
  const validCart = [];
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
    validCart.push(item);
    total += item.subtotal;
  });
  return [total, validCart];
}

function calcShipping(address, payment) {
  const {
    shipping_charge,
    domestic_districts,
    domestic_shipping_charge,
  } = payment;

  const isDomestic = domestic_districts
    .split(",")
    .map((item) => item.toLowerCase().trim())
    .find((item) => item === address.district.toLowerCase().trim());

  return isDomestic ? domestic_shipping_charge : shipping_charge;
}

async function sendConfirmationMail(address, orderId) {
  if (address.email && process.env.NODE_ENV === "production") {
    await strapi.plugins["email"].services.email.send({
      to: address.email,
      from: "sales@gadgeterabd.com",
      subject: "You placed an order",
      html: `
         <p>Dear ${address.receiver},<br></p>
         <p>Thank you for choosing us. Here is your order details:</p>
         <p>Order id: #${orderId}</p>
         <p>receiver phone number: ${address.phone}</p>
         <p>address: ${address.street_address}, ${address.sub_district}, ${address.district}</p>
         <p><br>Thanks</p>
         <p>Gadget Era Team</p>
        `,
    });
  } else {
    return null;
  }
}
async function updateUserAddress(address, user) {
  if (!user) return;
  if (user.address) {
    await strapi.services.address.update({ user: user.id }, address);
    return true;
  }
  await strapi.services.address.create({
    user: user.id,
    ...address,
  });
  return true;
}
