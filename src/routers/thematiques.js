/**
 * Routes API pour les thématiques (section page d'accueil).
 *
 * ── Routes publiques ────────────────────────────────────────────────
 * GET    /api/thematiques              → liste les thématiques (enabled par défaut)
 *
 * ── Routes admin (avec auth) ────────────────────────────────────────
 * GET    /api/thematiques/all          → toutes les thématiques (admin)
 * POST   /api/thematiques              → ajouter une thématique
 * PUT    /api/thematiques/:id          → modifier une thématique
 * DELETE /api/thematiques/:id          → supprimer une thématique
 * PATCH  /api/thematiques/reorder      → réordonner les thématiques
 */

const express = require("express");
const Thematique = require("../models/thematiques");
const Filtre = require("../models/filters");
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/thematiques — thématiques activées (site public) ───────

router.get("/thematiques", async (req, res) => {
  try {
    const thematiques = await Thematique.find({ enabled: true }).sort({
      order: 1,
    });

    res.json(thematiques);
  } catch (error) {
    console.error("Erreur GET /api/thematiques:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTES ADMIN
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/thematiques/all — toutes (admin) ───────────────────────

router.get("/thematiques/all", async (req, res) => {
  try {
    const thematiques = await Thematique.find().sort({ order: 1 });
    res.json(thematiques);
  } catch (error) {
    console.error("Erreur GET /api/thematiques/all:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /api/thematiques — ajouter ─────────────────────────────────

router.post("/thematiques", async (req, res) => {
  try {
    const { filterType, filterId, value, order, icon, color, shortDescription, description, coverImage } = req.body;

    if (!filterType || !filterId || !value) {
      return res.status(400).json({
        error: "filterType, filterId et value sont requis",
      });
    }

    // Vérifier que le filtre source existe
    const filtre = await Filtre.findById(filterId);
    if (!filtre) {
      return res.status(404).json({ error: "Filtre source non trouvé" });
    }

    // Vérifier qu'il n'est pas déjà ajouté
    const existing = await Thematique.findOne({ filterId });
    if (existing) {
      return res.status(409).json({ error: "Ce filtre est déjà dans les thématiques" });
    }

    // Calculer l'ordre si non fourni
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const last = await Thematique.findOne().sort({ order: -1 }).select("order");
      finalOrder = last ? last.order + 1 : 0;
    }

    const thematique = await Thematique.create({
      filterType,
      filterId,
      value: value.trim(),
      order: finalOrder,
      enabled: true,
      icon: icon || filtre.icon || null,
      color: color || filtre.color || null,
      shortDescription: shortDescription || filtre.shortDescription || null,
      description: description || filtre.description || null,
      coverImage: coverImage || filtre.coverImage || null,
    });

    res.status(201).json(thematique);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Ce filtre est déjà dans les thématiques" });
    }
    console.error("Erreur POST /api/thematiques:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /api/thematiques/:id — modifier ─────────────────────────────

router.put("/thematiques/:id", async (req, res) => {
  try {
    const { enabled, icon, color, shortDescription, description, coverImage, order } = req.body;

    const thematique = await Thematique.findById(req.params.id);
    if (!thematique) {
      return res.status(404).json({ error: "Thématique non trouvée" });
    }

    // Construire l'objet de mise à jour
    const update = {};
    if (enabled !== undefined) update.enabled = enabled;
    if (order !== undefined) update.order = order;
    if (icon !== undefined) update.icon = icon;
    if (color !== undefined) update.color = color;
    if (shortDescription !== undefined) update.shortDescription = shortDescription;
    if (description !== undefined) update.description = description;
    if (coverImage !== undefined) update.coverImage = coverImage;

    const updated = await Thematique.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur PUT /api/thematiques:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE /api/thematiques/:id — supprimer ─────────────────────────

router.delete("/thematiques/:id", async (req, res) => {
  try {
    const thematique = await Thematique.findById(req.params.id);
    if (!thematique) {
      return res.status(404).json({ error: "Thématique non trouvée" });
    }

    await Thematique.findByIdAndDelete(req.params.id);

    res.json({
      message: "Thématique supprimée",
      _id: thematique._id,
    });
  } catch (error) {
    console.error("Erreur DELETE /api/thematiques:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PATCH /api/thematiques/reorder — réordonner ─────────────────────

router.patch("/thematiques/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds (array) est requis" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await Thematique.bulkWrite(bulkOps);

    res.json({ message: "Ordre mis à jour", count: orderedIds.length });
  } catch (error) {
    console.error("Erreur PATCH /api/thematiques/reorder:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;