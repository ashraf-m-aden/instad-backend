const mongoose = require("mongoose");

const fichierSchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    year: { type: Number, default: 0 },
    month: { type: Number, default: 0 },
    extension: { type: String },
    imgUrl: { type: String },
    fichierImageUrl: { type: String },
    trimestre: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    categorie: { type: String },

    // Filtres dynamiques — plus d'enum, valeurs libres
    typeContenu: { type: String, default: null },
    theme: { type: String, default: null },
    zone: { type: String, default: null },
    projet: { type: String, default: null },
    periode: { type: String, default: null },
    format: { type: String, default: null },

    motsCles: { type: [String], default: [] },
    isClassified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fichierSchema.index({ categorie: 1 });
fichierSchema.index({ typeContenu: 1 });
fichierSchema.index({ theme: 1 });
fichierSchema.index({ zone: 1 });
fichierSchema.index({ projet: 1 });
fichierSchema.index({ periode: 1 });
fichierSchema.index({ format: 1 });
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