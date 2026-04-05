const mongoose = require("mongoose");

// ── Enums pour les filtres ──────────────────────────────────────────

const THEMES = [
  "Population",
  "Prix / IPC",
  "Commerce extérieur",
  "Entreprises",
  "Emploi",
  "Santé",
  "Éducation",
  "Social",
  "Comptes nationaux",
];

const ZONES = [
  "National",
  "Djibouti-ville",
  "Ali Sabieh",
  "Tadjourah",
  "Obock",
  "Dikhil",
  "Arta",
];

const PROJETS = [
  "RGPH-3",
  "REGED",
  "IPC",
  "Commerce extérieur",
  "SNDS",
  "EDAM",
  "EDIM",
];

const PERIODES = ["Mensuel", "Trimestriel", "Annuel", "Ponctuel"];

const TYPES_CONTENU = [
  "Bulletin",
  "Annuaire statistique",
  "Rapport",
  "Publication",
  "Communiqué",
  "Enquête / Recensement",
  "Indicateur",
  "Actualité",
  "Infographie",
  "Note",
  "Loi / Décret",
  "Appel d'offre",
  "Méthode",
];

// ── Schéma mis à jour ───────────────────────────────────────────────

const fichierSchema = new mongoose.Schema(
  {
    // ─ Champs existants (inchangés) ─────────────────────────────────
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    year: {
      type: Number,
      default: 0,
    },
    month: {
      type: Number,
      default: 0,
    },
    extension: {
      type: String,
    },
    imgUrl: {
      type: String,
    },
    fichierImageUrl: {
      type: String,
    },
    trimestre: {
      type: Number,
      default: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    categorie: {
      type: String,
    },

    // ─ Nouveaux champs de filtrage ──────────────────────────────────

    typeContenu: {
      type: String,
      enum: [...TYPES_CONTENU, null],
      default: null,
    },

    theme: {
      type: String,
      enum: [...THEMES, null],
      default: null,
    },

    zone: {
      type: String,
      enum: [...ZONES, null],
      default: null,
    },

    projet: {
      type: String,
      enum: [...PROJETS, null],
      default: null,
    },

    periode: {
      type: String,
      enum: [...PERIODES, null],
      default: null,
    },

    motsCles: {
      type: [String],
      default: [],
    },

    // Flag : le document a-t-il été classifié avec les nouveaux filtres ?
    isClassified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ── Index pour performance des filtres ──────────────────────────────

fichierSchema.index({ categorie: 1 });
fichierSchema.index({ typeContenu: 1 });
fichierSchema.index({ theme: 1 });
fichierSchema.index({ zone: 1 });
fichierSchema.index({ projet: 1 });
fichierSchema.index({ periode: 1 });
fichierSchema.index({ isClassified: 1 });
fichierSchema.index({ year: 1 });
fichierSchema.index({ motsCles: 1 });
fichierSchema.index({
  title: "text",
  description: "text",
  motsCles: "text",
});

const Fichier = mongoose.model("fichiers", fichierSchema);

module.exports = Fichier;
module.exports.THEMES = THEMES;
module.exports.ZONES = ZONES;
module.exports.PROJETS = PROJETS;
module.exports.PERIODES = PERIODES;
module.exports.TYPES_CONTENU = TYPES_CONTENU;
