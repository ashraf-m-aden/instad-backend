/**
 * Migration unique : transfere les pieces jointes des demandes de micro-donnees
 * du volume de l'EC2 (/data/instad/uploads, monte sur /app/src/uploads) vers le
 * prefixe prive "microdonnees/" du bucket uploads, et renseigne attachments.key
 * en base. Le champ "path" est conserve tel quel : il reste la trace du fichier
 * d'origine, et c'est "key" qui fait foi des que present.
 *
 * Usage (depuis le conteneur backend, qui a le role IAM et le volume) :
 *   docker exec instad-backend node src/scripts/migrate-microdata-attachments-to-s3.js
 *   docker exec instad-backend node src/scripts/migrate-microdata-attachments-to-s3.js --apply
 *
 * Variables requises : MONGODB_URL, S3_UPLOADS_BUCKET (AWS_REGION par defaut eu-west-3)
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const s3 = require("../utils/s3");

const APPLY = process.argv.includes("--apply");

// Le chemin stocke en base a ete produit sur l'ancienne arborescence
// (src/uploads/microdata-requests). On ne garde que le nom du fichier et on le
// cherche dans le dossier d'uploads courant.
const UPLOAD_DIR =
  process.env.MICRODATA_UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads", "microdata-requests");

const resolveLocalFile = (attachment) => {
  const candidates = [];
  if (attachment.path) candidates.push(attachment.path);
  if (attachment.filename) candidates.push(path.join(UPLOAD_DIR, attachment.filename));
  if (attachment.path) candidates.push(path.join(UPLOAD_DIR, path.basename(attachment.path)));

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (error) {
      return false;
    }
  });
};

async function main() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL manquant (variable d'environnement)");
  }
  if (!s3.isConfigured()) {
    throw new Error("S3_UPLOADS_BUCKET manquant (variable d'environnement)");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  const MicrodataRequest = require("../models/microdata-request");

  console.log(`Dossier source : ${UPLOAD_DIR}`);
  console.log(`Mode : ${APPLY ? "APPLICATION REELLE" : "DRY-RUN (aucune ecriture)"}\n`);

  const requests = await MicrodataRequest.find({
    "attachments.0": { $exists: true },
  });

  let migrated = 0;
  let already = 0;
  let missing = 0;

  for (const request of requests) {
    let docChanged = false;

    for (const attachment of request.attachments) {
      if (attachment.key) {
        already++;
        continue;
      }

      const localFile = resolveLocalFile(attachment);
      if (!localFile) {
        console.log(
          `[${request.referenceNumber}] FICHIER INTROUVABLE : ${attachment.originalName} (${attachment.path || attachment.filename})`
        );
        missing++;
        continue;
      }

      const key = `${s3.PRIVATE_PREFIX}/${request.referenceNumber}/${attachment.filename || path.basename(localFile)}`;
      console.log(`[${request.referenceNumber}] ${localFile}`);
      console.log(`   -> s3://${s3.bucket()}/${key}`);

      if (APPLY) {
        await s3.putFile({
          key,
          filePath: localFile,
          size: fs.statSync(localFile).size,
          contentType: attachment.mimetype,
        });
        attachment.key = key;
        docChanged = true;
      }

      migrated++;
    }

    if (docChanged) await request.save();
  }

  await mongoose.disconnect();

  console.log(
    `\nTermine : ${migrated} piece(s) jointe(s) ${APPLY ? "transferee(s)" : "a transferer"}, ${already} deja sur S3, ${missing} introuvable(s).`
  );
  if (!APPLY && migrated > 0) {
    console.log("Relancez avec --apply pour effectuer le transfert.");
  }
}

main().catch((err) => {
  console.error("Erreur migration:", err);
  process.exit(1);
});
