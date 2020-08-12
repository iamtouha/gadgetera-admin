module.exports = {
  load: {
    before: ["sentry"],
  },
  settings: {
    sentry: {
      enabled: true,
    },
  },
  cors: {
    origin: "*",
  },
};
