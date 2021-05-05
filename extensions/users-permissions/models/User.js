"use strict";

const { nanoid } = require("nanoid");
module.exports = {
  lifecycles: {
    beforeCreate(val) {
      val.name = val.username;
      val.username = nanoid(10);
    },
  },
};
