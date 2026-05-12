const express = require("express");
const router = express.Router();
const Slide = require("../models/slides");

// GET /slides — public (filtré actifs) ou admin (tous)
router.get("/slides", async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = activeOnly === "true" ? { isActive: true } : {};
    const slides = await Slide.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ data: slides, total: slides.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /slides
router.post("/slides", async (req, res) => {
  try {
    const count = await Slide.countDocuments();
    const slide = await Slide.create({ ...req.body, order: req.body.order ?? count });
    res.status(201).json({ data: slide });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /slides/media — liste les URLs d'images uniques utilisées par des slides
router.get("/slides/media", async (req, res) => {
  try {
    const slides = await Slide.find(
      { type: { $in: ["image", "imageText"] }, mediaUrl: { $ne: "" } },
      { mediaUrl: 1, title: 1, type: 1, isActive: 1, createdAt: 1 }
    ).sort({ createdAt: -1 });

    // Regroupe par URL : une URL peut être utilisée par plusieurs slides
    const map = new Map();
    for (const s of slides) {
      if (!map.has(s.mediaUrl)) {
        map.set(s.mediaUrl, {
          url: s.mediaUrl,
          firstSeen: s.createdAt,
          usedBy: [],
        });
      }
      map.get(s.mediaUrl).usedBy.push({
        _id: s._id,
        title: s.title,
        type: s.type,
        isActive: s.isActive,
      });
    }

    const media = Array.from(map.values()).sort(
      (a, b) => new Date(b.firstSeen) - new Date(a.firstSeen)
    );

    res.json({ data: media, total: media.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// PATCH /slides/reorder — bulkWrite, même pattern que thématiques
router.patch("/slides/reorder", async (req, res) => {
  try {
    const { items } = req.body; // [{ _id, order }, ...]
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array" });

    const ops = items.map((it) => ({
      updateOne: { filter: { _id: it._id }, update: { $set: { order: it.order } } },
    }));
    await Slide.bulkWrite(ops);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// DELETE /slides/media — supprime une image (Firebase + retire si vraiment plus utilisée)
router.delete("/slides/media", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });

    // Vérifie qu'aucun slide ne l'utilise (sécurité)
    const inUse = await Slide.countDocuments({ mediaUrl: url });
    if (inUse > 0) {
      return res.status(409).json({
        error: "Media still in use",
        count: inUse,
      });
    }

    // Le frontend se charge de supprimer le fichier Firebase via getStorage côté client
    // (cohérent avec ton pattern actuel dans useFichier)
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// PATCH /slides/:id
router.patch("/slides/:id", async (req, res) => {
  try {
    const slide = await Slide.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slide) return res.status(404).json({ error: "Slide not found" });
    res.json({ data: slide });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /slides/:id
router.delete("/slides/:id", async (req, res) => {
  try {
    const slide = await Slide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ error: "Slide not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;