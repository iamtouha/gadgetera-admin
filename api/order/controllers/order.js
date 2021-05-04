"use strict";

const { sanitizeEntity } = require("strapi-utils");
const { create } = require("./createOrder");

module.exports = {
  async find(ctx) {
    if (!ctx.state.user) {
      return ctx.response.badRequest("Not Found");
    }
    const data = await strapi.services.order.find({
      id: ctx.params.id,
      user: ctx.state.user.id,
    });
    return data.map((order) =>
      sanitizeEntity(order, { model: strapi.models.order })
    );
  },
  create,
};
