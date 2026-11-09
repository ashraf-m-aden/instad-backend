/**
 * Migration unique : reecrit en base les URLs Firebase Storage (champs imgUrl,
 * fichierImageUrl, images[], mediaUrl) vers leurs equivalents S3, APRES avoir
 * transfere les fichiers eux-memes avec instad-infra/scripts/migrate-firebase-storage-to-s3.sh
 * (meme hierarchie de dossiers conservee des deux cotes).
 *
 * Usage :
 *   node src/scripts/migrate-firebase-urls-to-s3.js            -> dry-run (aucune ecriture, affiche ce qui changerait)
 *   node src/scripts/migrate-firebase-urls-to-s3.js --apply    -> applique reellement les changements
 *
 * Variables d'environnement requises : MONGODB_URL
 * Optionnelles : S3_PUBLIC_BUCKET (defaut: instad-public-files), AWS_REGION (defaut: eu-west-3)
 */
require("dotenv").config();
const mongoose = require("mongoose");

const S3_BUCKET = process.env.S3_PUBLIC_BUCKET || "instad-public-files";
const S3_REGION = process.env.AWS_REGION || "eu-west-3";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

const APPLY = process.argv.includes("--apply");

// Les deux formats d'URL Firebase Storage rencontres :
//  - https://firebasestorage.googleapis.com/v0/b/instad-dj.appspot.com/o/<chemin-encode>?alt=media&token=...
//  - https://storage.googleapis.com/instad-dj.appspot.com/<chemin>
const FIREBASE_URL_PATTERNS = [
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/,
  /^https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/,
];

function toS3Url(firebaseUrl) {
  if (typeof firebaseUrl !== "string" || !firebaseUrl) return null;

  for (const pattern of FIREBASE_URL_PATTERNS) {
    const match = firebaseUrl.match(pattern);
    if (match) {
      const objectPath = decodeURIComponent(match[1]);
      const encodedPath = objectPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      return `${S3_BASE_URL}/${encodedPath}`;
    }
  }
  return null;
}

async function migrateCollection({ name, Model, fields }) {
  const docs = await Model.find({});
  let changed = 0;
  let skipped = 0;

  for (const doc of docs) {
    let docChanged = false;

    for (const field of fields) {
      if (field.isArray) {
        const arr = doc.get(field.path);
        if (Array.isArray(arr) && arr.length > 0) {
          const newArr = arr.map((url) => toS3Url(url) || url);
          if (JSON.stringify(newArr) !== JSON.stringify(arr)) {
            console.log(`[${name}] ${doc._id}.${field.path}[] -> ${newArr.length} url(s) traitee(s)`);
            if (APPLY) doc.set(field.path, newArr);
            docChanged = true;
          }
        }
      } else {
        const current = doc.get(field.path);
        const next = toS3Url(current);
        if (next && next !== current) {
          console.log(`[${name}] ${doc._id}.${field.path}`);
          console.log(`   avant: ${current}`);
          console.log(`   apres: ${next}`);
          if (APPLY) doc.set(field.path, next);
          docChanged = true;
        }
      }
    }

    if (docChanged) {
      changed++;
      if (APPLY) await doc.save();
    } else {
      skipped++;
    }
  }

  console.log(`[${name}] termine : ${changed} document(s) modifie(s), ${skipped} inchange(s)\n`);
}

async function main() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL manquant (variable d'environnement)");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log(`Connecte a MongoDB.`);
  console.log(`Bucket S3 cible : ${S3_BUCKET} (region ${S3_REGION})`);
  console.log(`Mode : ${APPLY ? "APPLICATION REELLE (ecriture en base)" : "DRY-RUN (aucune ecriture)"}\n`);

  const Fichier = require("../models/fichier");
  const News = require("../models/news");
  const Gallery = require("../models/gallery");
  const DG = require("../models/dg");
  const Slide = require("../models/slides");

  await migrateCollection({
    name: "Fichier",
    Model: Fichier,
    fields: [{ path: "imgUrl" }, { path: "fichierImageUrl" }],
  });
  await migrateCollection({ name: "News", Model: News, fields: [{ path: "imgUrl" }] });
  await migrateCollection({
    name: "Gallery",
    Model: Gallery,
    fields: [{ path: "images", isArray: true }],
  });
  await migrateCollection({ name: "DG", Model: DG, fields: [{ path: "imgUrl" }] });
  await migrateCollection({ name: "Slide", Model: Slide, fields: [{ path: "mediaUrl" }] });

  await mongoose.disconnect();

  if (APPLY) {
    console.log("Migration terminee et appliquee.");
  } else {
    console.log("Dry-run termine. Verifiez les changements ci-dessus puis relancez avec --apply pour les ecrire.");
  }
}

main().catch((err) => {
  console.error("Erreur migration:", err);
  process.exit(1);
});
