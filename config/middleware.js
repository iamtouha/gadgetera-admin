module.exports = {
  load: {
    before: ["sentry", "responseTime", "logger", "cors", "responses"],
  },
  settings: {
    sentry: {
      enabled: true,
    },
  },
  cors: {
    origin: "http://localhost",
  },
};
