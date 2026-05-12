const express = require("express");
const router = express.Router();
const HomeSettings = require("../models/homeSettings");

// GET /home-settings — récupère ou crée le singleton
router.get("/home-settings", async (req, res) => {
  try {
    let settings = await HomeSettings.findOne();
    if (!settings) settings = await HomeSettings.create({});
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /home-settings
router.patch("/home-settings", async (req, res) => {
  try {
    let settings = await HomeSettings.findOne();
    if (!settings) settings = await HomeSettings.create(req.body);
    else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json({ data: settings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;