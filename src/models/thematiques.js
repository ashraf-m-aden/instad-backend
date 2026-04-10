const mongoose = require("mongoose");

/**
 * Collection « thematiques »
 *
 * Chaque document = une thématique affichée dans la section
 * « Explorez nos données » de la page d'accueil.
 *
 * Une thématique référence un filtre existant (theme, typeContenu ou projet)
 * et porte ses propres métadonnées visuelles pour l'affichage.
 *
 * Ex: { filterType: "theme", filterId: "664a…", value: "Population",
 *       slug: "population", order: 0, color: "#12ad2b", enabled: true }
 */

const FILTER_TYPES = ["theme", "typeContenu", "projet"];

const thematiqueSchema = new mongoose.Schema(
  {
    // ─ Référence au filtre source ───────────────────────────────────

    /** Type du filtre source */
    filterType: {
      type: String,
      required: true,
      enum: FILTER_TYPES,
      index: true,
    },

    /** ID du filtre référencé dans la collection « filtres » */
    filterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "filtre",
      required: true,
    },

    /** Valeur dénormalisée (pour affichage rapide sans populate) */
    value: {
      type: String,
      required: true,
      trim: true,
    },

    /** Slug URL-friendly */
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // ─ Affichage ────────────────────────────────────────────────────

    /** Ordre d'affichage sur la page d'accueil */
    order: {
      type: Number,
      default: 0,
    },

    /** Actif / masqué */
    enabled: {
      type: Boolean,
      default: true,
    },

    // ─ Métadonnées visuelles ────────────────────────────────────────

    /** Icône (nom Iconify, ex: "material-symbols:bar-chart") */
    icon: {
      type: String,
      default: null,
    },

    /** Couleur d'accent (hex, ex: "#2563eb") */
    color: {
      type: String,
      default: null,
    },

    /** Description courte (affichée sur les cartes) */
    shortDescription: {
      type: String,
      default: null,
      trim: true,
    },

    /** Description longue (page détail) */
    description: {
      type: String,
      default: null,
      trim: true,
    },

    /** Image de couverture (URL) */
    coverImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Hooks ───────────────────────────────────────────────────────────

thematiqueSchema.pre("save", function (next) {
  if (this.isModified("value") || !this.slug) {
    this.slug = generateSlug(this.value);
  }
  next();
});

thematiqueSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.value) {
    update.slug = generateSlug(update.value);
  }
  next();
});

function generateSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Index ───────────────────────────────────────────────────────────

// Un même filtre ne peut apparaître qu'une fois
thematiqueSchema.index({ filterId: 1 }, { unique: true });

// Tri par ordre
thematiqueSchema.index({ order: 1 });

// Recherche par type
thematiqueSchema.index({ filterType: 1, order: 1 });

const Thematique = mongoose.model("thematique", thematiqueSchema);

module.exports = Thematique;
module.exports.FILTER_TYPES = FILTER_TYPES;