/**
 * Script de seed : peuple la collection 'filtres' avec les valeurs initiales.
 * Idempotent — n'insère pas les doublons.
 *
 * Usage : node seed-filtres.js
 */

const mongoose = require("mongoose");
const Filtre = require("../models/filters");

const SEED_DATA = {
  typeContenu: [
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
  ],
  theme: [
    "Population",
    "Prix / IPC",
    "Commerce extérieur",
    "Entreprises",
    "Emploi",
    "Santé",
    "Éducation",
    "Social",
    "Comptes nationaux",
  ],
  zone: [
    "National",
    "Djibouti-ville",
    "Ali Sabieh",
    "Tadjourah",
    "Obock",
    "Dikhil",
    "Arta",
  ],
  projet: [
    "RGPH-3",
    "REGED",
    "IPC",
    "Commerce extérieur",
    "SNDS",
    "EDAM",
    "EDIM",
  ],
  periode: ["Mensuel", "Trimestriel", "Annuel", "Ponctuel"],
  format: ["PDF", "Excel", "Word", "Image", "CSV"],
};

async function migrate() {
  await mongoose.connect(
    "mongodb+srv://ash:9XesaXHmTzS2zLHn@instad0.upbxszo.mongodb.net/instad",
  ); // adapte l'URL

  const filtres = await Filtre.find({
    $or: [{ slug: null }, { slug: "" }, { slug: { $exists: false } }],
  });

  for (const f of filtres) {
    f.slug = f.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    await f.save();
    console.log(`✓ ${f.type}: "${f.value}" → ${f.slug}`);
  }

  console.log(`\n${filtres.length} filtres mis à jour`);
  process.exit(0);
}

migrate();
