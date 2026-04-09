const mongoose = require("mongoose");

/**
 * Navigation dynamique — chaque document = un élément de la barre de navigation.
 *
 * Types d'éléments :
 * - "link"     → lien simple (interne ou externe)
 * - "dropdown" → menu déroulant avec des enfants
 *
 * Les enfants d'un dropdown peuvent être :
 * - { kind: "filter", filterType: "theme", filterValue: "Population" }
 *     → génère un lien /themes/population
 * - { kind: "filter", filterType: "typeContenu", filterValue: "Bulletin" }
 *     → génère un lien /types/bulletin
 * - { kind: "filter", filterType: "projet", filterValue: "RGPH-3" }
 *     → génère un lien /projets/rgph-3
 * - { kind: "custom", label: "Open Data", path: "https://...", external: true }
 *     → lien libre
 * - { kind: "separator" }
 *     → séparateur visuel
 */

const navChildSchema = new mongoose.Schema(
  {
    // Type d'enfant
    kind: {
      type: String,
      required: true,
      enum: ["filter", "custom", "separator"],
    },

    // ── Pour kind: "filter" ──
    filterType: {
      type: String,
      enum: ["theme", "typeContenu", "projet", "zone", "periode"],
    },
    filterValue: { type: String, trim: true },
    // Label optionnel (si vide, on utilise filterValue)
    label: { type: String, trim: true },

    // ── Pour kind: "custom" ──
    path: { type: String, trim: true },
    external: { type: Boolean, default: false },

    // Ordre dans le dropdown
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const navItemSchema = new mongoose.Schema(
  {
    // Texte affiché dans la barre de navigation
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Type d'élément
    type: {
      type: String,
      required: true,
      enum: ["link", "dropdown"],
    },

    // ── Pour type: "link" ──
    // Si linkKind = "filter", on génère l'URL depuis filterType + filterValue
    // Si linkKind = "custom", on utilise path directement
    linkKind: {
      type: String,
      enum: ["filter", "custom"],
    },
    filterType: {
      type: String,
      enum: ["theme", "typeContenu", "projet", "zone", "periode"],
    },
    filterValue: { type: String, trim: true },
    path: { type: String, trim: true },
    external: { type: Boolean, default: false },

    // ── Pour type: "dropdown" ──
    children: [navChildSchema],

    // Ordre dans la navbar
    order: {
      type: Number,
      default: 0,
    },

    // Actif ou non
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

navItemSchema.index({ order: 1 });
navItemSchema.index({ enabled: 1, order: 1 });

const NavItem = mongoose.model("navitem", navItemSchema);
module.exports = NavItem;