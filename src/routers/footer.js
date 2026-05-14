/**
 * Routes API pour les quicklinks du footer.
 *
 * GET    /footer-links          → tous les liens actifs (pour le frontend public)
 * GET    /footer-links/all      → tous les liens, y compris désactivés (admin)
 * POST   /footer-links          → créer un lien
 * PUT    /footer-links/:id      → modifier un lien
 * DELETE /footer-links/:id      → supprimer un lien
 * PATCH  /footer-links/reorder  → réordonner tous les liens
 */

const express = require("express");
const FooterLink = require("../models/footerLinks");
const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────

const FILTER_ROUTE_MAP = {
  theme: "themes",
  typeContenu: "types",
  projet: "projets",
  zone: "zones",
  periode: "periodes",
};

const generateSlug = (value) => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Résout le path d'un lien de type "filter".
 */
const resolveFilterPath = (filterType, filterValue) => {
  const routePrefix = FILTER_ROUTE_MAP[filterType];
  if (!routePrefix || !filterValue) return "/";
  return `/${routePrefix}/${generateSlug(filterValue)}`;
};

/**
 * Enrichit un lien avec le path résolu pour le frontend.
 */
const enrichLink = (link) => {
  const obj = link.toObject ? link.toObject() : { ...link };

  if (obj.linkKind === "filter") {
    obj.resolvedPath = resolveFilterPath(obj.filterType, obj.filterValue);
    obj.resolvedLabel = obj.label || obj.filterValue;
  } else {
    obj.resolvedPath = obj.path || "/";
    obj.resolvedLabel = obj.label || obj.path;
  }

  return obj;
};

// ── GET /footer-links — liens actifs (public) ───────────────────────

router.get("/footer-links", async (req, res) => {
  try {
    const links = await FooterLink.find({ enabled: true }).sort({ order: 1 });
    res.json(links.map(enrichLink));
  } catch (error) {
    console.error("Erreur GET /footer-links:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /footer-links/all — tous les liens (admin) ──────────────────

router.get("/footer-links/all", async (req, res) => {
  try {
    const links = await FooterLink.find().sort({ order: 1 });
    res.json(links.map(enrichLink));
  } catch (error) {
    console.error("Erreur GET /footer-links/all:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /footer-links — créer un lien ──────────────────────────────

router.post("/footer-links", async (req, res) => {
  try {
    const {
      label,
      column,
      linkKind,
      filterType,
      filterValue,
      path,
      external,
      enabled,
    } = req.body;

    if (!label || !linkKind) {
      return res.status(400).json({ error: "label et linkKind sont requis" });
    }

    // Calculer l'ordre (à la fin)
    const maxOrder = await FooterLink.findOne()
      .sort({ order: -1 })
      .select("order");
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const link = await FooterLink.create({
      label,
      column: column || undefined,
      linkKind,
      filterType: filterType || undefined,
      filterValue: filterValue || undefined,
      path: path || undefined,
      external: external || false,
      order: newOrder,
      enabled: enabled !== false,
    });

    res.status(201).json(enrichLink(link));
  } catch (error) {
    console.error("Erreur POST /footer-links:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /footer-links/:id — modifier un lien ────────────────────────

router.put("/footer-links/:id", async (req, res) => {
  try {
    const update = {};
    const allowed = [
      "label",
      "column",
      "linkKind",
      "filterType",
      "filterValue",
      "path",
      "external",
      "order",
      "enabled",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    const link = await FooterLink.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!link) return res.status(404).json({ error: "Lien non trouvé" });

    res.json(enrichLink(link));
  } catch (error) {
    console.error("Erreur PUT /footer-links:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE /footer-links/:id ────────────────────────────────────────

router.delete("/footer-links/:id", async (req, res) => {
  try {
    const link = await FooterLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ error: "Lien non trouvé" });
    res.json({ message: "Lien supprimé", _id: link._id });
  } catch (error) {
    console.error("Erreur DELETE /footer-links:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PATCH /footer-links/reorder — réordonner ────────────────────────

router.patch("/footer-links/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds (array) est requis" });
    }

    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index },
      },
    }));

    await FooterLink.bulkWrite(ops);
    res.json({ message: "Ordre mis à jour", count: ops.length });
  } catch (error) {
    console.error("Erreur PATCH /footer-links/reorder:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
