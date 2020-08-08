"use strict";

module.exports = {
  lifecycles: {
    async beforeCreate(data) {
      try {
        const promises = [];
        let total = 0;
        const deliveryOpts = await strapi
          .query("delivery-charge")
          .find({ _limit: 1 });
        const { area, charge } = deliveryOpts[0];
        data.items.map((item) => {
          const promise = strapi.query("product").findOne({ id: item.product });
          promises.push(promise);
        });
        const products = await Promise.all(promises);
        products.forEach((product, index) => {
          total +=
            data.items[index].units *
            product.price *
            (1 - product.discount / 100);
        });
        const cost = area.lowAreas.includes(data.address[area.type])
          ? charge.low
          : charge.high;
        data.total = total + cost;
        data.address.charge = cost;
        data.confirmed = false;
        data.paid = 0;
        data.status = "received";
      } catch (error) {
        throw error;
      }
    },
  },
};
