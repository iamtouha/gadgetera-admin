"use strict";
const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    try {
      const {
        order: orderId,
        rating,
        product: productId,
        message,
      } = ctx.request.body;

      if (!(orderId && rating && productId)) {
        return ctx.response.badRequest("invalid data");
      }

      const [order, review] = await Promise.all([
        strapi.services.order.findOne({ id: orderId }),
        strapi.services.review.findOne({ order: orderId, product: productId }),
      ]);

      if (!permittedUser(ctx.state.user, order.user)) {
        return ctx.response.unauthorized("Not permitted");
      }

      if (order.status !== "delivered") {
        return ctx.response.badRequest("Order is not delivered.");
      }
      if (review) {
        return ctx.response.badRequest("Review is already submitted.");
      }

      const hasProduct = order.cart.some(
        (item) => item.product.id === productId
      );
      if (!hasProduct) {
        return ctx.response.badRequest("Invalid input.");
      }

      const newReview = await strapi.services.review.create({
        order: orderId,
        product: productId,
        rating,
        message,
        user_name: order.address.receiver,
        user: ctx.state.user ? ctx.state.user.id : null,
      });
      return sanitizeEntity(newReview, { model: strapi.models.review });
    } catch (error) {
      return ctx.response.badImplementation(error.message);
    }
  },
};
function permittedUser(reqUser, orderUser) {
  const reqUserId = reqUser && reqUser.id;
  const orderUserId = orderUser && orderUser.id;
  return (!orderUser && reqUser) || reqUserId === orderUserId;
}
