"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    afterFind(results) {
      results.forEach((res) => {
        res.products = res.products.map((prod) => prod.id);
      });
    },
  },
};
