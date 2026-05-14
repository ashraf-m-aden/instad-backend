const mongoose = require("mongoose");

/**
 * Quicklinks du footer — chaque document = un lien rapide affiché dans le footer.
 *
 * Deux façons de définir la cible d'un lien :
 * - linkKind: "filter" → génère l'URL depuis filterType + filterValue
 *     ex: { linkKind: "filter", filterType: "theme", filterValue: "Population" }
 *         → /themes/population
 * - linkKind: "custom" → utilise path directement
 *     ex: { linkKind: "custom", path: "https://opendata.dj", external: true }
 *
 * Les liens sont regroupés par "column" (colonne du footer) pour permettre
 * un footer multi-colonnes (ex: "Statistiques", "Institut", "Ressources").
 */

const footerLinkSchema = new mongoose.Schema(
  {
    // Texte affiché
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Colonne du footer dans laquelle le lien apparaît
    column: {
      type: String,
      trim: true,
      default: "Liens rapides",
    },

    // ── Cible du lien ──
    // "filter" → URL générée depuis filterType + filterValue
    // "custom" → path utilisé directement
    linkKind: {
      type: String,
      required: true,
      enum: ["filter", "custom"],
      default: "custom",
    },
    filterType: {
      type: String,
      enum: ["theme", "typeContenu", "projet", "zone", "periode"],
    },
    filterValue: { type: String, trim: true },
    path: { type: String, trim: true },
    external: { type: Boolean, default: false },

    // Ordre dans la colonne
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
  { timestamps: true },
);

footerLinkSchema.index({ order: 1 });
footerLinkSchema.index({ enabled: 1, order: 1 });
footerLinkSchema.index({ column: 1, order: 1 });

const FooterLink = mongoose.model("footerlink", footerLinkSchema);
module.exports = FooterLink;
