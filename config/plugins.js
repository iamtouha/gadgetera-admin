module.exports = ({ env }) => ({
  upload: {
    breakpoints: {
      small: 750,
    },
    provider: "cloudinary",
    providerOptions: {
      cloudinary_url: env("CLOUDINARY_URL"),
    },
  },
});
