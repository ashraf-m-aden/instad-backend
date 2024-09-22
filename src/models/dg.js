const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dgSchema = new mongoose.Schema(
  {
    content: {
      type: "string",
    },

    imgUrl: {
      type: "string",
    },

    enabled: {
      type: "boolean",
      default: true,
    },
  },
  { timestamps: true }
);

const DG = mongoose.model("dgs", dgSchema);

module.exports = DG;
