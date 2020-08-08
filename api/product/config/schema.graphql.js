module.exports = {
  query: `
    productBySlug(slug:String): Product!
  `,
  resolver: {
    Query: {
      productBySlug: {
        description: "Return a single product",
        resolver: "application::product.product.findOne", // It will use the action `findOne` located in the `Person.js` controller.
      },
    },
  },
};
