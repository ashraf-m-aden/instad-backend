/**
 * Routes API pour les filtres dynamiques.
 *
 * ── Routes publiques (sans auth) ────────────────────────────────────
 * GET    /api/filtres                    → tous les filtres (groupés par type)
 * GET    /api/filtres/type/:type         → filtres d'un type spécifique
 * GET    /api/filtres/slug/:type/:slug   → un filtre par son slug + type
 * GET    /api/filtres/:id/associations   → types de contenu associés à un thème (ou l'inverse)
 *
 * ── Routes admin (avec auth) ────────────────────────────────────────
 * POST   /api/filtres                    → créer un nouveau filtre
 * PUT    /api/filtres/:id                → modifier un filtre (propage aux fichiers)
 * DELETE /api/filtres/:id                → supprimer (soft) un filtre (nettoie les fichiers)
 */

const express = require("express");
const Filtre = require("../models/filters");
const Fichier = require("../models/fichier");
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/filtres — tous les filtres, groupés par type ───────────

router.get("/filtres/", async (req, res) => {
  try {
    const filtres = await Filtre.find({ enabled: true }).sort({
      type: 1,
      order: 1,
      value: 1,
    });

    const grouped = {};
    for (const f of filtres) {
      if (!grouped[f.type]) grouped[f.type] = [];
      grouped[f.type].push({
        _id: f._id,
        value: f.value,
        slug: f.slug,
        order: f.order,
        icon: f.icon,
        color: f.color,
        shortDescription: f.shortDescription,
      });
    }

    res.json(grouped);
  } catch (error) {
    console.error("Erreur GET /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/filtres/type/:type — filtres d'un type ─────────────────

router.get("/filtres/type/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const filtres = await Filtre.find({ type, enabled: true }).sort({
      order: 1,
      value: 1,
    });

    res.json(
      filtres.map((f) => ({
        _id: f._id,
        value: f.value,
        slug: f.slug,
        order: f.order,
        icon: f.icon,
        color: f.color,
        shortDescription: f.shortDescription,
      }))
    );
  } catch (error) {
    console.error(`Erreur GET /api/filtres/type/${req.params.type}:`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/filtres/slug/:type/:slug — filtre par slug (page détail)

router.get("/filtres/slug/:type/:slug", async (req, res) => {
  try {
    const { type, slug } = req.params;
    const filtre = await Filtre.findOne({ type, slug, enabled: true });

    if (!filtre) {
      return res.status(404).json({ error: "Filtre non trouvé" });
    }

    res.json({
      _id: filtre._id,
      type: filtre.type,
      value: filtre.value,
      slug: filtre.slug,
      order: filtre.order,
      icon: filtre.icon,
      color: filtre.color,
      shortDescription: filtre.shortDescription,
      description: filtre.description,
      technicalDescription: filtre.technicalDescription,
      coverImage: filtre.coverImage,
    });
  } catch (error) {
    console.error("Erreur GET /api/filtres/slug:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/filtres/:id/associations — contenus associés ───────────
//
// Pour un thème : retourne les types de contenu qui ont au moins
//                 un fichier avec ce thème
// Pour un type de contenu : retourne les thèmes associés
//
// Utilisé pour afficher les cards de navigation sur les pages détail

router.get("/filtres/:id/associations", async (req, res) => {
  try {
    const filtre = await Filtre.findById(req.params.id);
    if (!filtre) {
      return res.status(404).json({ error: "Filtre non trouvé" });
    }

    const { type, value } = filtre;
    let associatedField;
    let associatedType;

    if (type === "theme") {
      // Pour un thème, on cherche quels typeContenu existent
      associatedField = "typeContenu";
      associatedType = "typeContenu";
    } else if (type === "typeContenu") {
      // Pour un typeContenu, on cherche quels thèmes existent
      associatedField = "theme";
      associatedType = "theme";
    } else {
      return res.json([]);
    }

    // Trouver les valeurs distinctes dans les fichiers
    const distinctValues = await Fichier.distinct(associatedField, {
      [type]: value,
      [associatedField]: { $ne: null },
      enabled: true,
    });

    // Récupérer les filtres correspondants avec leurs métadonnées
    const associations = await Filtre.find({
      type: associatedType,
      value: { $in: distinctValues },
      enabled: true,
    }).sort({ order: 1, value: 1 });

    // Compter le nombre de fichiers pour chaque association
    const result = await Promise.all(
      associations.map(async (assoc) => {
        const count = await Fichier.countDocuments({
          [type]: value,
          [associatedField]: assoc.value,
          enabled: true,
        });

        return {
          _id: assoc._id,
          value: assoc.value,
          slug: assoc.slug,
          icon: assoc.icon,
          color: assoc.color,
          shortDescription: assoc.shortDescription,
          documentCount: count,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Erreur GET /api/filtres/:id/associations:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTES ADMIN
// ═══════════════════════════════════════════════════════════════════

// ── POST /api/filtres — créer un filtre ─────────────────────────────

router.post("/filtres/", async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value || !value.trim()) {
      return res.status(400).json({ error: "type et value sont requis" });
    }

    const existing = await Filtre.findOne({ type, value: value.trim() });

    if (existing) {
      if (!existing.enabled) {
        existing.enabled = true;
        await existing.save();
        return res.json(existing);
      }
      return res.status(409).json({ error: "Ce filtre existe déjà" });
    }

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
      slug: filtre.slug,
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

// ── PUT /api/filtres/:id — modifier un filtre + propager aux fichiers

router.put("/filtres/:id", async (req, res) => {
  try {
    const { value, order, icon, color, shortDescription, description, technicalDescription, coverImage } = req.body;

    const oldFiltre = await Filtre.findById(req.params.id);
    if (!oldFiltre) {
      return res.status(404).json({ error: "Filtre non trouvé" });
    }

    const oldValue = oldFiltre.value;
    const type = oldFiltre.type;

    // Construire l'objet de mise à jour
    const update = {};
    if (value !== undefined) update.value = value.trim();
    if (order !== undefined) update.order = order;
    if (icon !== undefined) update.icon = icon;
    if (color !== undefined) update.color = color;
    if (shortDescription !== undefined) update.shortDescription = shortDescription;
    if (description !== undefined) update.description = description;
    if (technicalDescription !== undefined) update.technicalDescription = technicalDescription;
    if (coverImage !== undefined) update.coverImage = coverImage;

    const filtre = await Filtre.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    // Propager le renommage aux fichiers si la valeur a changé
    if (value !== undefined && value.trim() !== oldValue) {
      const result = await Fichier.updateMany(
        { [type]: oldValue },
        { $set: { [type]: value.trim() } }
      );
      console.log(
        `Filtre ${type} renommé: "${oldValue}" → "${value.trim()}" — ${result.modifiedCount} fichier(s) mis à jour`
      );

      return res.json({
        ...filtre.toObject(),
        fichiersModifies: result.modifiedCount,
      });
    }

    res.json(filtre);
  } catch (error) {
    console.error("Erreur PUT /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE /api/filtres/:id — soft delete + nettoyer les fichiers ────

router.delete("/filtres/:id", async (req, res) => {
  try {
    const filtre = await Filtre.findById(req.params.id);
    if (!filtre) {
      return res.status(404).json({ error: "Filtre non trouvé" });
    }

    const type = filtre.type;
    const value = filtre.value;

    filtre.enabled = false;
    await filtre.save();

    const result = await Fichier.updateMany(
      { [type]: value },
      { $set: { [type]: null } }
    );
    console.log(
      `Filtre ${type} supprimé: "${value}" — ${result.modifiedCount} fichier(s) nettoyé(s)`
    );

    res.json({
      message: "Filtre désactivé",
      _id: filtre._id,
      fichiersNettoyes: result.modifiedCount,
    });
  } catch (error) {
    console.error("Erreur DELETE /api/filtres:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;