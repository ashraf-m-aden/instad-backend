const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fichierSchema = new mongoose.Schema(
  {
    title: {
      type: "string",
    },
    year: {
      type: "Number",
      default: 0,
    },
    month: {
      type: "Number",
      default: 0,
    },

    extension: {
      type: "string",
    },
    imgUrl: {
      type: "string",
    },

    trimestre: {
      type: "Number",
      default: 0,
    },
    enabled: {
      type: "boolean",
      default: true,
    },

    categorie: {
      type: "string",
    },
  },
  { timestamps: true }
);



const Fichier = mongoose.model("fichiers", fichierSchema);

module.exports = Fichier;
