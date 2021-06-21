"use strict";

const { sanitizeEntity } = require("strapi-utils");
const { customAlphabet } = require("nanoid/async");
const nanoid = customAlphabet("1234567890asdfghjklqwertyuiopzxcvbnm", 10);

module.exports = {
  async create(ctx) {
    const order = ctx.request.body;
    const { cash_on_delivery, trx_id, payment_method, cart, address } = order;

    try {
      const [valid, errMessage] = validateData(order);
      if (!valid) {
        return ctx.response.badRequest(errMessage);
      }

      const user = ctx.state.user;

      const arr = cart.map((item) => item.product);
      const ids = Array.from(new Set(arr));

      const [products, payInfo] = await Promise.all([
        strapi.services.product.find({ id_in: ids }),
        strapi.services.payment.find(),
      ]);

      if (!products.length) {
        return ctx.response.badRequest("Invalid Data Input");
      } else if (products.some((p) => !p.stock)) {
        return ctx.response.notAcceptable("Product is Out of stock");
      }

      const [cartTotal, newCart] = calculateCart(products, cart);

      // check coupon validity and apply
      const appliedCoupon = await validateCoupon(order.coupon, cartTotal);
      if (appliedCoupon === "invalid") {
        return ctx.response.notAcceptable("Invalid coupon");
      }

      // delivery charge calculation
      const shipping_charge = calcShipping(address, payInfo);

      const hasPaid = trx_id && payment_method;
      const [paymentValitdity, errorInfo] = checkPaymentValitdity(
        address,
        payInfo,
        hasPaid,
        cash_on_delivery
      );
      if (!paymentValitdity) {
        return ctx.response.notAcceptable(errorInfo);
      }

      const randomTrx = await nanoid();
      //   registers order
      const orderObj = {
        user: user ? user.id : null,
        cash_on_delivery: cash_on_delivery ? true : false,
        cart: newCart,
        address,
        status: "pending",
        shipping_charge,
        total: cartTotal + shipping_charge,
        trx_id: trx_id || "Empty-" + randomTrx,
        payment_method: payment_method ? payment_method : "unavailable",
      };
      if (appliedCoupon) {
        orderObj.coupon = appliedCoupon.id;
        orderObj.total -= appliedCoupon.discount;
      }

      const orderResp = await strapi.services.order.create(orderObj);

      await Promise.all([
        countAppliedCoupon(appliedCoupon),
        updateUserAddress(address, user),
      ]);

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

function validateData({ address, cart }) {
  if (!cart || !cart.length) {
    return [false, "Cart cannot be empty"];
  }
  if (!address) {
    return [false, "Invalid address"];
  }
  const empty = Object.keys(address).filter((key) => !address[key]);
  console.log(address);
  if (empty.length >= 4) {
    return [false, "Address Fields are empty."];
  }
  if (empty.length) {
    return [
      false,
      empty.join(", ").split("_").join(" ") + " shouldn't be empty.",
    ];
  }
  const emailRegex =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  if (!emailRegex.test(address.email.toLowerCase())) {
    return [false, "Invalid email"];
  }
  const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g;
  if (!phoneRegex.test(address.phone)) {
    return [false, "Invalid phone number"];
  }
  return [true];
}
function checkPaymentValitdity(address, payInfo, hasPaid, cash_on_delivery) {
  if (!cash_on_delivery)
    return [hasPaid, "provide payment method & Transaction id."];
  const { domestic_districts } = payInfo;
  const isDomestic = domestic_districts
    .split(",")
    .map((item) => item.toLowerCase().trim())
    .find((item) => item === address.district.toLowerCase().trim());
  return [
    isDomestic || hasPaid,
    "Shipping charge is required in advance for delivery outside Dhaka",
  ];
}

async function validateCoupon(code, min) {
  if (!code) return null;
  const coupon = await strapi.services.coupon.findOne({
    code,
    minimum_order_lte: min,
    expire_date_gte: new Date().toISOString().substring(0, 10),
  });
  if (!coupon) return "invalid";
  if (coupon.limit <= coupon.applied) {
    return "invalid";
  }
  return coupon;
}

function calculateCart(products, cart) {
  let total = 0;
  const validCart = [];
  products.forEach((product) => {
    const cartItem = cart.find((item) => item.product === product.id);
    const unitPrice = product.sale_price || product.price;
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
  const { shipping_charge, domestic_districts, domestic_shipping_charge } =
    payment;

  const isDomestic = domestic_districts
    .split(",")
    .map((item) => item.toLowerCase().trim())
    .find((item) => item === address.district.toLowerCase().trim());

  return isDomestic ? domestic_shipping_charge : shipping_charge;
}

async function countAppliedCoupon(coupon) {
  if (!coupon) return;
  await strapi.services.coupon.update(
    { id: coupon.id },
    { applied: coupon.applied + 1 }
  );
  return true;
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
