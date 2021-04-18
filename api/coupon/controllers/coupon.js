"use strict";
const { sanitizeEntity } = require("strapi-utils");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findOne(ctx) {
    try {
      const code = ctx.params.id;
      const minOrder = ctx.query.order;
      if (!code || !minOrder) {
        return ctx.response.badRequest("Insufficient information");
      }
      const [coupon] = await strapi
        .query("coupon")
        .find({ code: code.toUpperCase() });
      if (!coupon) {
        return ctx.response.notFound("Invalid Coupon");
      }
      if (coupon.minimum_order > parseFloat(minOrder)) {
        return ctx.response.notAcceptable(
          "Minimum order requiremient not fulfilled"
        );
      }
      const time = new Date(coupon.expire_date).getTime();
      const currentTime = new Date().getTime();
      if (time < currentTime) {
        return ctx.response.notAcceptable("Coupon Expired");
      }
      if (time < currentTime) {
        return ctx.response.notAcceptable("Coupon Expired");
      }
      return sanitizeEntity(coupon, {
        model: strapi.models.coupon,
      });
    } catch (error) {
      console.error(error.message);
      return ctx.response.badImplementation("Internal error");
    }
  },
};
