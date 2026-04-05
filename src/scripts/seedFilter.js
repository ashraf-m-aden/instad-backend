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
  periode: [
    "Mensuel",
    "Trimestriel",
    "Annuel",
    "Ponctuel",
  ],
  format: [
    "PDF",
    "Excel",
    "Word",
    "Image",
    "CSV",
  ],
};

async function seed() {
  try {
    await mongoose.connect(
      "mongodb+srv://ash:9XesaXHmTzS2zLHn@instad0.upbxszo.mongodb.net/instad",
    );
    console.log("✅ Connecté à MongoDB");

    let created = 0;
    let skipped = 0;

    for (const [type, values] of Object.entries(SEED_DATA)) {
      for (let i = 0; i < values.length; i++) {
        try {
          await Filtre.create({
            type,
            value: values[i],
            order: i,
            enabled: true,
          });
          created++;
          console.log(`  ✅ ${type} → "${values[i]}"`);
        } catch (err) {
          if (err.code === 11000) {
            // Doublon, on skip
            skipped++;
          } else {
            console.error(`  ❌ ${type} → "${values[i]}" :`, err.message);
          }
        }
      }
    }

    console.log(`\n── Résultat ──`);
    console.log(`✅ Créés : ${created}`);
    console.log(`⏭️  Déjà existants : ${skipped}`);
    console.log(`📊 Total dans la collection : ${await Filtre.countDocuments()}`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Déconnecté");
  }
}

seed();