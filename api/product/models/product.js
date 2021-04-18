"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  // lifecycles: {
  //   afterCreate(result) {
  //     const data = destructure(result);
  //     strapi.services.algolia.saveObject(data, "Products");
  //   },
  //   afterUpdate(result) {
  //     if (result.published_at) {
  //       const data = destructure(result);
  //       strapi.services.algolia.saveObject(data, "Products");
  //     } else {
  //       strapi.services.algolia.deleteObject(result.id, "Products");
  //     }
  //   },
  //   afterDelete(result) {
  //     strapi.services.algolia.deleteObject(result.id, "Products");
  //   },
  // },
};

function destructure(obj) {
  const {
    id,
    name,
    slug,
    brand: { name: brand },
    category: { name: category },
    created_at,
    variants,
    photos: [
      {
        alternativeText,
        caption,
        url,
        formats: { thumbnail, small },
      },
    ],
  } = obj;
  const data = {
    id,
    name,
    slug,
    brand,
    category,
    variants,
    created_at,
    photo: {
      alternativeText,
      caption,
      url,
      thumbnail: thumbnail.url,
      small: small ? small.url : null,
    },
  };
  return data;
}
