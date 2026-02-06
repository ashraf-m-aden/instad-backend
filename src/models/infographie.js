// models/infographic.js
const mongoose = require("mongoose");

const infographicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String, // Stocké en base64
      required: false,
    },
    category: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

const Infographic = mongoose.model("Infographic", infographicSchema);

module.exports = Infographic;