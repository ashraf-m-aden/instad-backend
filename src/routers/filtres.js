/**
 * Routes API pour les filtres dynamiques.
 *
 * GET    /api/filtres           → tous les filtres (groupés par type)
 * GET    /api/filtres/:type     → filtres d'un type spécifique
 * POST   /api/filtres           → créer un nouveau filtre
 * PUT    /api/filtres/:id       → modifier un filtre
 * DELETE /api/filtres/:id       → supprimer (soft) un filtre
 */

const express = require("express");
const router = express.Router();
const Filtre = require("../../models/filtre.model");

// ── GET /api/filtres — tous les filtres, groupés par type ───────────

router.get("/filtres/", async (req, res) => {
  try {
    const filtres = await Filtre.find({ enabled: true }).sort({
      type: 1,
      order: 1,
      value: 1,
    });

    // Grouper par type
    const grouped = {};
    for (const f of filtres) {
      if (!grouped[f.type]) grouped[f.type] = [];
      grouped[f.type].push({
        _id: f._id,
        value: f.value,
        order: f.order,
      });
    }

    res.json(grouped);
  } catch (error) {
    console.error("Erreur GET /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/filtres/:type — filtres d'un type ──────────────────────

router.get("/filtres/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const filtres = await Filtre.find({ type, enabled: true }).sort({
      order: 1,
      value: 1,
    });

    res.json(
      filtres.map((f) => ({ _id: f._id, value: f.value, order: f.order })),
    );
  } catch (error) {
    console.error(`Erreur GET /api/filtres/${req.params.type}:`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /api/filtres — créer un filtre ─────────────────────────────

router.post("/filtres/", async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value || !value.trim()) {
      return res.status(400).json({ error: "type et value sont requis" });
    }

    // Vérifier si existe déjà (même désactivé)
    const existing = await Filtre.findOne({ type, value: value.trim() });

    if (existing) {
      if (!existing.enabled) {
        // Réactiver
        existing.enabled = true;
        await existing.save();
        return res.json(existing);
      }
      return res.status(409).json({ error: "Ce filtre existe déjà" });
    }

    // Calculer l'ordre (à la fin)
    const maxOrder = await Filtre.findOne({ type })
      .sort({ order: -1 })
      .select("order");
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const filtre = await Filtre.create({
      type,
      value: value.trim(),
      order: newOrder,
      enabled: true,
    });

    res.status(201).json({
      _id: filtre._id,
      value: filtre.value,
      order: filtre.order,
      type: filtre.type,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Ce filtre existe déjà" });
    }
    console.error("Erreur POST /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /api/filtres/:id — modifier un filtre ───────────────────────

router.put("/filtres/:id", async (req, res) => {
  try {
    const { value, order } = req.body;
    const update = {};
    if (value !== undefined) update.value = value.trim();
    if (order !== undefined) update.order = order;

    const filtre = await Filtre.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!filtre) return res.status(404).json({ error: "Filtre non trouvé" });

    res.json(filtre);
  } catch (error) {
    console.error("Erreur PUT /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE /api/filtres/:id — soft delete ───────────────────────────

router.delete("/filtres/:id", async (req, res) => {
  try {
    const filtre = await Filtre.findByIdAndUpdate(
      req.params.id,
      { enabled: false },
      { new: true },
    );

    if (!filtre) return res.status(404).json({ error: "Filtre non trouvé" });

    res.json({ message: "Filtre désactivé", _id: filtre._id });
  } catch (error) {
    console.error("Erreur DELETE /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
