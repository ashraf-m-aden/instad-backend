const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const headerDataSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },

    value: {
      type: Number,
    },

    date: {
      type: String,
    },
    position: {
      type: Number,
    },

    icon: {
      type: String,
    },

    enabled: {
      type: "boolean",
      default: true,
    },
  },
  { timestamps: true }
);

const HeaderData = mongoose.model("headerDatas", headerDataSchema);

module.exports = HeaderData;
