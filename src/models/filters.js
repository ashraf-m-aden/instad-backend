const mongoose = require("mongoose");

/**
 * Collection unique pour tous les filtres dynamiques.
 *
 * Chaque document = une valeur de filtre.
 * Ex: { type: "theme", value: "Population", order: 0 }
 *     { type: "zone", value: "Djibouti-ville", order: 1 }
 *
 * Types supportés : theme, zone, projet, periode, typeContenu, format
 */

const FILTER_TYPES = [
  "typeContenu",
  "theme",
  "zone",
  "projet",
  "periode",
  "format",
];

const filtreSchema = new mongoose.Schema(
  {
    // Type du filtre (theme, zone, projet, etc.)
    type: {
      type: String,
      required: true,
      enum: FILTER_TYPES,
      index: true,
    },

    // Valeur affichée (ex: "Population", "Djibouti-ville")
    value: {
      type: String,
      required: true,
      trim: true,
    },

    // Ordre d'affichage dans le dropdown (optionnel)
    order: {
      type: Number,
      default: 0,
    },

    // Actif ou non (soft delete)
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unicité : pas deux filtres identiques (même type + même valeur)
filtreSchema.index({ type: 1, value: 1 }, { unique: true });

// Index pour tri
filtreSchema.index({ type: 1, order: 1, value: 1 });

const Filtre = mongoose.model("filtre", filtreSchema);

module.exports = Filtre;
module.exports.FILTER_TYPES = FILTER_TYPES;