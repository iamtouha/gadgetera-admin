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
  email: {
    provider: "nodemailer",
    providerOptions: {
      host: env("SMTP_HOST", "smtp.gmail.com"),
      port: env("SMTP_PORT", 465),
      auth: {
        user: env("SMTP_USERNAME"),
        pass: env("SMTP_PASSWORD"),
      },
    },
    settings: {
      defaultFrom: env("SMTP_USERNAME"),
      defaultReplyTo: env("SMTP_USERNAME"),
    },
  },
});
