"use strict";

const { nanoid } = require("nanoid");
module.exports = {
  lifecycles: {
    beforeCreate(val) {
      val.username = nanoid(10);
    },
  },
};
