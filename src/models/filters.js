const mongoose = require("mongoose");

/**
 * Collection unique pour tous les filtres dynamiques.
 *
 * Chaque document = une valeur de filtre.
 * Ex: { type: "theme", value: "Population", slug: "population", order: 0 }
 *     { type: "zone", value: "Djibouti-ville", slug: "djibouti-ville", order: 1 }
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

    // Slug URL-friendly (ex: "population", "commerce-exterieur")
    slug: {
      type: String,
      trim: true,
      lowercase: true,
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

    // ─ Champs descriptifs (pour les pages publiques) ────────────────

    // Icône (nom Material Symbols ou identifiant)
    icon: {
      type: String,
      default: null,
    },

    // Couleur d'accent (hex, ex: "#2563eb")
    color: {
      type: String,
      default: null,
    },

    // Description courte (affichée sur les cards)
    shortDescription: {
      type: String,
      default: null,
      trim: true,
    },

    // Description longue (affichée sur la page détail)
    description: {
      type: String,
      default: null,
      trim: true,
    },

    // Description technique / méthodologique
    technicalDescription: {
      type: String,
      default: null,
      trim: true,
    },

    // Image de couverture (URL)
    coverImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Hooks ───────────────────────────────────────────────────────────

// Générer le slug automatiquement à partir de la valeur
filtreSchema.pre("save", function (next) {
  if (this.isModified("value") || !this.slug) {
    this.slug = generateSlug(this.value);
  }
  next();
});

filtreSchema.pre("findOneAndUpdate", function (next) {
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
    .replace(/[\u0300-\u036f]/g, "") // retirer accents
    .replace(/[^a-z0-9]+/g, "-")    // remplacer non-alphanum par -
    .replace(/^-+|-+$/g, "");       // retirer - en début/fin
}

// ── Index ───────────────────────────────────────────────────────────

// Unicité : pas deux filtres identiques (même type + même valeur)
filtreSchema.index({ type: 1, value: 1 }, { unique: true });

// Recherche par slug
filtreSchema.index({ type: 1, slug: 1 }, { unique: true });

// Index pour tri
filtreSchema.index({ type: 1, order: 1, value: 1 });

const Filtre = mongoose.model("filtre", filtreSchema);

module.exports = Filtre;
module.exports.FILTER_TYPES = FILTER_TYPES;
module.exports.generateSlug = generateSlug;