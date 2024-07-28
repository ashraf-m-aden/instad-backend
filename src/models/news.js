const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const newsSchema = new mongoose.Schema(
  {
    title: {
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

const News = mongoose.model("news", newsSchema);

module.exports = News;
