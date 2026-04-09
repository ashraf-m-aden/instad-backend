const express = require("express");
const router = new express.Router();
const Fichier = require("../models/fichier");
const auth = require("../middleware/auth");

// ══════════════════════════════════════════════════════════════════════
// ROUTES EXISTANTES (inchangées)
// ══════════════════════════════════════════════════════════════════════

router.post("/fichier", auth, async (req, res) => {
  delete req.body.fichier._id;
  const fichier = new Fichier(req.body.fichier);
  try {
    await fichier.save();
    return res.status(200).send(fichier);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.patch("/fichier", auth, async (req, res) => {
  let fichier = await Fichier.findById({ _id: req.body._id });
  if (!fichier) {
    return res.status(404).send("Les données sont introuvables");
  }
  try {
    await Object.assign(fichier, req.body);
    await fichier.save();
    return res.send(fichier);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/fichier/:id", auth, async (req, res) => {
  const fichier = await Fichier.findOneAndDelete({ _id: req.params.id });
  if (!fichier) {
    return res.status(404).send("Le fichier n'existe pas");
  }
  try {
    res.status(200).send(fichier);
  } catch (error) {
    res.status(500).send("Une erreur est survenue lors de la suppression.");
  }
});

router.get("/fichier/:id", async (req, res) => {
  try {
    let fichier = await Fichier.findById({ _id: req.params.id });
    if (!fichier) {
      return res.status(404).send("Fichier inexistant");
    }
    res.status(200).send(fichier);
  } catch (error) {
    res.status(500).send("Un problème est survenu veuillez réessayer");
  }
});

router.get("/fichiers/:categorie/:year?", async (req, res) => {
  try {
    const year = req.params.year;
    const query = { categorie: req.params.categorie };
    if (year && year !== "undefined") query.year = year;
    const fichiers = await Fichier.find(query);
    return res.status(200).send(fichiers || []);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.post("/publications", async (req, res) => {
  try {
    const fichiers = await Fichier.find({ categorie: { $nin: req.body } })
      .sort({ year: 1, month: 1, trimestre: 1, updatedAt: 1 })
      .limit(25);
    res.status(200).send(fichiers || []);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.get("/newsletters/public/:categorie", async (req, res) => {
  try {
    const fichiers = await Fichier.find({ categorie: req.params.categorie })
      .sort({ updatedAt: 1 })
      .limit(3);
    res.status(200).send(fichiers || []);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════
//
// POST /fichiers/filter
//
// Envoie tout ce que tu veux dans le body. Ce qui est null, undefined,
// "", 0, -1 → ignoré. La route se débrouille avec ce qu'elle reçoit.
//
// ══════════════════════════════════════════════════════════════════════

const FORMAT_MAP = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
  excel: ["xlsx", "xls", "csv"],
  word: ["docx", "doc"],
};

const SORT_MAP = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  alpha: { title: 1 },
  "alpha-desc": { title: -1 },
  year: { year: -1, month: -1 },
};

router.post("/fichiers/filter", async (req, res) => {
  try {
    const b = req.body || {};
    const query = {};

    // ── Strings : on prend si non vide ──────────────────────────────

    ["categorie", "typeContenu", "theme", "zone", "projet", "periode", "extension"].forEach(
      (key) => {
        if (b[key] != null && b[key] !== "") query[key] = b[key];
      }
    );

    // ── Nombres : year > 0, month >= 0, trimestre >= 0 ──────────────

    if (b.year != null && Number(b.year) > 0) query.year = Number(b.year);
    if (b.month != null && Number(b.month) >= 0) query.month = Number(b.month);
    if (b.trimestre != null && Number(b.trimestre) >= 0)
      query.trimestre = Number(b.trimestre);

    // ── Format → extension ──────────────────────────────────────────

    if (b.format != null && b.format !== "") {
      const fmt = b.format.toLowerCase();
      query.extension = FORMAT_MAP[fmt]
        ? { $in: FORMAT_MAP[fmt] }
        : fmt;
    }

    // ── Booléens : seulement si explicitement true/false ────────────

    if (b.enabled === true || b.enabled === false) query.enabled = b.enabled;
    if (b.isClassified === true) query.isClassified = true;
    if (b.isClassified === false) query.isClassified = { $ne: true };

    // ── Recherche texte libre ───────────────────────────────────────

    if (b.search != null && b.search.trim() !== "") {
      const r = new RegExp(b.search.trim(), "i");
      query.$or = [
        { title: r },
        { description: r },
        { motsCles: r },
        { categorie: r },
        { typeContenu: r },
        { theme: r },
        { projet: r },
      ];
    }

    // ── Tri + Pagination ────────────────────────────────────────────

    const sort = SORT_MAP[b.sort] || SORT_MAP.recent;
    const page = Math.max(1, parseInt(b.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(b.limit) || 50));

    // ── Exécution ───────────────────────────────────────────────────

    const [data, total] = await Promise.all([
      Fichier.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Fichier.countDocuments(query),
    ]);

    res.status(200).send({ data, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Erreur filtrage:", error);
    res.status(500).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════
// CLASSIFICATION EN MASSE
// ══════════════════════════════════════════════════════════════════════

router.patch("/fichiers/classify", auth, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send({ error: "ids requis (array)" });
    }

    const $set = { isClassified: true };
    const $addToSet = {};

    ["typeContenu", "theme", "zone", "projet", "periode"].forEach((key) => {
      if (data[key] != null && data[key] !== "") $set[key] = data[key];
    });

    if (Array.isArray(data.motsCles) && data.motsCles.length > 0) {
      $addToSet.motsCles = { $each: data.motsCles };
    }

    const updateQuery = { $set };
    if (Object.keys($addToSet).length > 0) updateQuery.$addToSet = $addToSet;

    const result = await Fichier.updateMany({ _id: { $in: ids } }, updateQuery);

    res.status(200).send({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Erreur classification:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;