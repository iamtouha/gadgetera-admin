"use strict";

const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findOne(ctx) {
    if (!ctx.state.user) return ctx.response.badRequest();
    const params = {
      id: ctx.params.id,
      user: ctx.state.user.id,
    };
    const data = await strapi.services.address.findOne(params);
    return sanitizeEntity(data, { model: strapi.models.address });
  },
};
