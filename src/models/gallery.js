const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gallerySchema = new mongoose.Schema(
  {
    titre: {
      type: "string",
    },
    images: {
      type: Array,
    },
    date: {
      type: Date,
    },

    enabled: {
      type: "boolean",
      default: true,
    },
  },
  { timestamps: true }
);

const Flash = mongoose.model("gallerys", gallerySchema);

module.exports = Flash;
