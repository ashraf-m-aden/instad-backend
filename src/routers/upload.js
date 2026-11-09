/**
 * Stockage des fichiers publics (publications, images d'actualites, medias).
 * Remplace Firebase Storage cote frontend :
 *   POST   /upload          multipart : file + path   -> 201 { url, key }
 *   DELETE /upload?url=...                           -> 204
 */
const express = require("express");
const multer = require("multer");
const os = require("os");
const fs = require("fs").promises;
const auth = require("../middleware/auth");
const s3 = require("../utils/s3");

const router = new express.Router();

const MAX_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB || 100);

// Types acceptes : documents publies, images, et medias des slides.
const ALLOWED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
];

// Disque temporaire puis streaming vers S3 : un PDF de 100 Mo ne doit pas
// transiter par la memoire du worker.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) =>
      cb(null, `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}`),
  }),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Type de fichier non autorise : ${file.mimetype}`));
  },
});

const singleFile = upload.single("file");

router.post("/upload", auth, (req, res) => {
  if (!s3.isConfigured()) {
    return res
      .status(500)
      .send({ error: "S3_UPLOADS_BUCKET non configure cote serveur" });
  }

  singleFile(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .send({ error: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)` });
      }
      return res.status(400).send({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).send({ error: "Champ 'file' manquant" });
    }

    const key = s3.normalizeKey(req.body.path);

    try {
      if (!key) {
        return res.status(400).send({ error: "Champ 'path' manquant ou invalide" });
      }

      const url = await s3.putFile({
        key,
        filePath: req.file.path,
        size: req.file.size,
        contentType: req.file.mimetype,
      });

      return res.status(201).send({
        url,
        key,
        size: req.file.size,
        contentType: req.file.mimetype,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: "Echec de l'envoi du fichier" });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  });
});

router.delete("/upload", auth, async (req, res) => {
  if (!s3.isConfigured()) {
    return res
      .status(500)
      .send({ error: "S3_UPLOADS_BUCKET non configure cote serveur" });
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).send({ error: "Parametre 'url' manquant" });
  }

  // URL hors de notre bucket (ancienne URL Firebase par exemple) : rien a faire,
  // mais on repond 204 pour ne pas bloquer la suppression cote metier.
  const key = s3.urlToKey(url);
  if (!key) {
    return res.status(204).end();
  }

  try {
    await s3.deleteKey(key);
    return res.status(204).end();
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Echec de la suppression du fichier" });
  }
});

module.exports = router;
