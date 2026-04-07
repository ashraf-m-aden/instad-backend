/**
 * Routes API pour la navigation dynamique.
 *
 * GET    /navigation          → tous les items actifs (pour le frontend public)
 * GET    /navigation/all      → tous les items, y compris désactivés (admin)
 * POST   /navigation          → créer un item
 * PUT    /navigation/:id      → modifier un item (label, type, children, order…)
 * DELETE /navigation/:id      → supprimer un item
 * PATCH  /navigation/reorder  → réordonner tous les items
 */

const express = require("express");
const NavItem = require("../models/nav");
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
 * Résout le path d'un enfant ou d'un lien de type "filter".
 */
const resolveFilterPath = (filterType, filterValue) => {
  const routePrefix = FILTER_ROUTE_MAP[filterType];
  if (!routePrefix || !filterValue) return "/";
  return `/${routePrefix}/${generateSlug(filterValue)}`;
};

/**
 * Enrichit un item avec les paths résolus pour le frontend.
 */
const enrichItem = (item) => {
  const obj = item.toObject ? item.toObject() : { ...item };

  // Résoudre le path pour un lien simple de type filter
  if (obj.type === "link" && obj.linkKind === "filter") {
    obj.resolvedPath = resolveFilterPath(obj.filterType, obj.filterValue);
  } else if (obj.type === "link" && obj.linkKind === "custom") {
    obj.resolvedPath = obj.path || "/";
  }

  // Résoudre les paths des enfants
  if (obj.children && obj.children.length > 0) {
    obj.children = obj.children
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((child) => {
        if (child.kind === "filter") {
          return {
            ...child,
            resolvedPath: resolveFilterPath(child.filterType, child.filterValue),
            resolvedLabel: child.label || child.filterValue,
          };
        }
        if (child.kind === "custom") {
          return {
            ...child,
            resolvedLabel: child.label || child.path,
            resolvedPath: child.path || "/",
          };
        }
        // separator
        return child;
      });
  }

  return obj;
};

// ── GET /navigation — items actifs (public) ─────────────────────────

router.get("/navigation", async (req, res) => {
  try {
    const items = await NavItem.find({ enabled: true }).sort({ order: 1 });
    res.json(items.map(enrichItem));
  } catch (error) {
    console.error("Erreur GET /navigation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /navigation/all — tous les items (admin) ────────────────────

router.get("/navigation/all", async (req, res) => {
  try {
    const items = await NavItem.find().sort({ order: 1 });
    res.json(items.map(enrichItem));
  } catch (error) {
    console.error("Erreur GET /navigation/all:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /navigation — créer un item ────────────────────────────────

router.post("/navigation", async (req, res) => {
  try {
    const { label, type, linkKind, filterType, filterValue, path, external, children, enabled } = req.body;

    if (!label || !type) {
      return res.status(400).json({ error: "label et type sont requis" });
    }

    // Calculer l'ordre (à la fin)
    const maxOrder = await NavItem.findOne().sort({ order: -1 }).select("order");
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const item = await NavItem.create({
      label,
      type,
      linkKind: linkKind || undefined,
      filterType: filterType || undefined,
      filterValue: filterValue || undefined,
      path: path || undefined,
      external: external || false,
      children: children || [],
      order: newOrder,
      enabled: enabled !== false,
    });

    res.status(201).json(enrichItem(item));
  } catch (error) {
    console.error("Erreur POST /navigation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /navigation/:id — modifier un item ──────────────────────────

router.put("/navigation/:id", async (req, res) => {
  try {
    const update = {};
    const allowed = ["label", "type", "linkKind", "filterType", "filterValue", "path", "external", "children", "order", "enabled"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    const item = await NavItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: "Item non trouvé" });

    res.json(enrichItem(item));
  } catch (error) {
    console.error("Erreur PUT /navigation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE /navigation/:id ──────────────────────────────────────────

router.delete("/navigation/:id", async (req, res) => {
  try {
    const item = await NavItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json({ message: "Item supprimé", _id: item._id });
  } catch (error) {
    console.error("Erreur DELETE /navigation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PATCH /navigation/reorder — réordonner ──────────────────────────

router.patch("/navigation/reorder", async (req, res) => {
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

    await NavItem.bulkWrite(ops);
    res.json({ message: "Ordre mis à jour", count: ops.length });
  } catch (error) {
    console.error("Erreur PATCH /navigation/reorder:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;