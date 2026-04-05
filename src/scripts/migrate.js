/**
 * Script de migration : classifie automatiquement les documents existants
 * en se basant sur le champ 'categorie' pour remplir les nouveaux champs.
 *
 * Usage : node migrate-classify.js
 *
 * Ce script est idempotent — il ne touche pas les documents déjà classifiés.
 */

const mongoose = require("mongoose");
const Fichier = require("../models/fichier");

// ── Mapping categorie → nouveaux champs ─────────────────────────────

const MIGRATION_MAP = {
  "Indice des prix à la consommation": {
    typeContenu: "Indicateur",
    theme: "Prix / IPC",
    projet: "IPC",
    periode: "Mensuel",
  },
  "Bulletin mensuel": {
    typeContenu: "Bulletin",
    theme: "Prix / IPC",
    projet: "IPC",
    periode: "Mensuel",
  },
  "Indice des prix de commerce exterieur": {
    typeContenu: "Indicateur",
    theme: "Commerce extérieur",
    projet: "Commerce extérieur",
    periode: "Trimestriel",
  },
  "Annuaire du commerce extérieur": {
    typeContenu: "Annuaire statistique",
    theme: "Commerce extérieur",
    projet: "Commerce extérieur",
    periode: "Annuel",
  },
  "Note Annuelle de Commerce Exterieur": {
    typeContenu: "Note",
    theme: "Commerce extérieur",
    projet: "Commerce extérieur",
    periode: "Annuel",
  },
  "Annuaire statistique": {
    typeContenu: "Annuaire statistique",
    periode: "Annuel",
  },
  Rapports: {
    typeContenu: "Rapport",
  },
  Démographie: {
    typeContenu: "Rapport",
    theme: "Population",
  },
  Sociale: {
    typeContenu: "Rapport",
    theme: "Social",
  },
  Méthodes: {
    typeContenu: "Méthode",
  },
  "Appel d'offre": {
    typeContenu: "Appel d'offre",
  },
  Lois: {
    typeContenu: "Loi / Décret",
  },
  Decret: {
    typeContenu: "Loi / Décret",
  },
  RGPH: {
    typeContenu: "Enquête / Recensement",
    theme: "Population",
    projet: "RGPH-3",
  },
  Fichiers: {
    typeContenu: "Publication",
  },
  "ICA Service": {
    typeContenu: "Indicateur",
    theme: "Entreprises",
    periode: "Mensuel",
  },
  "ICA Commerce": {
    typeContenu: "Indicateur",
    theme: "Entreprises",
    periode: "Mensuel",
  },
  IPPI: {
    typeContenu: "Indicateur",
    theme: "Entreprises",
    periode: "Mensuel",
  },
  IPI: {
    typeContenu: "Indicateur",
    theme: "Entreprises",
    periode: "Mensuel",
  },
  SNDS: {
    typeContenu: "Publication",
    projet: "SNDS",
  },
  NewsLetters: {
    typeContenu: "Publication",
  },
  Infographie: {
    typeContenu: "Infographie",
  },
};

async function migrate() {
  try {
    // ⚠️ Remplace par ton URI MongoDB
    await mongoose.connect(
      "mongodb+srv://ash:9XesaXHmTzS2zLHn@instad0.upbxszo.mongodb.net/instad",
    );
    console.log("✅ Connecté à MongoDB");

    // Récupère uniquement les documents non classifiés
    const unclassified = await Fichier.find({ isClassified: { $ne: true } });
    console.log(`📦 ${unclassified.length} documents non classifiés trouvés`);

    let classified = 0;
    let partial = 0;
    let unknown = 0;

    for (const doc of unclassified) {
      const mapping = MIGRATION_MAP[doc.categorie];

      if (mapping) {
        // On a un mapping → classification automatique complète
        await Fichier.updateOne(
          { _id: doc._id },
          {
            $set: {
              ...mapping,
              isClassified: true,
            },
          },
        );
        classified++;
      } else if (doc.categorie) {
        // Catégorie existe mais pas de mapping → classification partielle
        // On marque isClassified = false pour qu'il apparaisse dans "Non classifié"
        console.log(
          `⚠️  Catégorie inconnue : "${doc.categorie}" → doc "${doc.title}"`,
        );
        partial++;
      } else {
        // Pas de catégorie du tout
        console.log(
          `❌ Aucune catégorie → doc "${doc.title}" (_id: ${doc._id})`,
        );
        unknown++;
      }
    }

    console.log("\n── Résultat de la migration ──");
    console.log(`✅ Classifiés automatiquement : ${classified}`);
    console.log(
      `⚠️  Catégorie inconnue (à classifier manuellement) : ${partial}`,
    );
    console.log(`❌ Sans catégorie : ${unknown}`);
    console.log(`📊 Total traité : ${unclassified.length}`);
  } catch (error) {
    console.error("❌ Erreur de migration :", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Déconnecté de MongoDB");
  }
}

migrate();
