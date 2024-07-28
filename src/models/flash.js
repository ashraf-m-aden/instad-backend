const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const flashSchema = new mongoose.Schema(
  {
    info: {
      type: "string",
    },

    enabled: {
      type: "boolean",
      default: true,
    },
  },
  { timestamps: true }
);

const Flash = mongoose.model("flash", flashSchema);

module.exports = Flash;
