"use strict";
const stringify = require("csv-stringify/lib/sync");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const taxonomy = {
  "wireless-earbuds":
    "Electronics > Audio > Audio Components > Headphones & Headsets > Headsets",
  "wired-earphones":
    "Electronics > Audio > Audio Components > Headphones & Headsets > Headsets",
  "bluetooth-speakers": "Electronics > Audio > Audio Components > Speakers",
  "fitness-trackers": "Sporting Goods > Exercise & Fitness > Exercise Bands",
  "men-s-wrist-watches": "Apparel & Accessories > Jewelry > Watches",
  "women-s-wrist-watches": "Apparel & Accessories > Jewelry > Watches",
  "charging-adapter":
    "Electronics > Electronics Accessories > Power > Power Adapters & Chargers",
  "power-banks":
    "Electronics > Electronics Accessories > Power > Power Adapters & Chargers",
};

module.exports = {
  async catalogue(ctx) {
    const response = await strapi.services.product.find();
    const products = response.map((product) => {
      const obj = {
        id: product.id,
        title: product.name,
        description: product.overview || product.name,
        availability: product.stock ? "in stock" : "out of stock",
        condition: "new",
        price: product.price + " BDT",
        link: "https://gadgeterabd.com/products/" + product.slug,
        image_link: product.images[0].url,
        brand: product.brand.name,
        item_group_id: product.model,
        age_group: "all ages",
        google_product_category:
          taxonomy[product.subcategory.key] || "Electronics",
      };
      if (product.sale_price) {
        obj["sale_price"] = product.sale_price + " BDT";
      }
      return obj;
    });
    const fields = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "sale_price",
      "link",
      "image_link",
      "brand",
      "item_group_id",
      "age_group",
      "google_product_category",
    ];
    const list = products.map((product) => fields.map((key) => product[key]));
    console.log(list);
    const catalogue = [fields, ...list];

    const csvContent = stringify(catalogue);

    ctx.set("Content-type", "text/csv");
    ctx.set(
      "Content-Disposition",
      `inline; filename="${new Date().toJSON()}.csv"`
    );
    ctx.response.send(csvContent);
  },
};
