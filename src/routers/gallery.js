const express = require("express");
const router = new express.Router();
const Gallery = require("../models/gallery");
const auth = require("../middleware/auth");
const Infographic = require("../models/infographie");
const Fichier = require("../models/fichier");

router.post("/gallery", async (req, res) => {
  delete req.body.gallery._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const gallery = new Gallery(req.body.gallery);
  try {
    await gallery.save();
    return res.status(200).send(gallery);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.patch("/gallery", auth, async (req, res) => {
  // modifier un utilisateur
  let gallery = await Gallery.findById({ _id: req.body.gallery._id });
  if (!gallery) {
    return res.statut(404).send("Les données sont introuvables");
  }
  try {
    await Object.assign(gallery, req.body.gallery);
    await gallery.save();

    return res.send(gallery);
  } catch (error) {
    console.log(error);

    res.status(500).send(error);
  }
});

router.delete("/gallery/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const gallery = await Gallery.findOneAndDelete({ _id: req.params.id });
  if (!gallery) {
    return res.statut(404).send("Les données sont introuvables");
  }
  try {
    res.status(200).send(gallery);
  } catch (error) {
    res
      .status(500)
      .send(
        error
      );
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get("/gallery/:id", async (req, res) => {
  // get one gallery
  try {
    let gallery = await Gallery.findById({ _id: req.params.id });
    if (!gallery) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(gallery);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/gallerys", async (req, res) => {
  // get All gallery
  try {
    const gallery = await Gallery.find({});
    if (!gallery) {
      res.status(200).send([]);
    }
    res.status(200).send(gallery);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});


// Create infographic
router.post("/infographics", auth, async (req, res) => {
  delete req.body._id; // Delete the object _id from the request body
  const infographic = new Infographic(req.body);
  try {
    await infographic.save();
    return res.status(201).send(infographic);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

// Update infographic
router.put("/infographics/:id", auth, async (req, res) => {
  let infographic = await Infographic.findById({ _id: req.params.id });
  if (!infographic) {
    return res.status(404).send("Infographie introuvable");
  }
  try {
    delete req.body._id; // Remove _id from update data
    await Object.assign(infographic, req.body);
    await infographic.save();

    return res.send(infographic);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// Delete infographic
router.delete("/infographics/:id", auth, async (req, res) => {
  const infographic = await Infographic.findOneAndDelete({ _id: req.params.id });
  if (!infographic) {
    return res.status(404).send("Infographie introuvable");
  }
  try {
    res.status(200).send(infographic);
  } catch (error) {
    res.status(500).send(error);
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET Routes
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Get one infographic
router.get("/infographics/details/:id", async (req, res) => {
  try {
    let infographic = await Infographic.findById({ _id: req.params.id });
    if (!infographic) {
      return res.status(404).send("Infographie inexistante");
    }
    res.status(200).send(infographic);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get all infographics
router.get("/infographics/:category", async (req, res) => {
  try {

    console.log(req.params.category)
    const infographics = await Fichier.find({categorie:req.params.category}).sort({ createdAt: -1 });
    if (!infographics) {
      res.status(200).send([]);
    }
    res.status(200).send(infographics);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// Get all infographics
router.get("/infographics/public/:category", async (req, res) => {
  try {
    const infographics = await Fichier.find({categorie:req.params.category}).sort({ createdAt: -1 }).limit(5);
    if (!infographics) {
      res.status(200).send([]);
    }
    res.status(200).send(infographics);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// Get infographics by category (optional)
router.get("/infographics/category/:category", async (req, res) => {
  try {
    const infographics = await Infographic.find({ 
      category: req.params.category 
    }).sort({ createdAt: -1 });
    
    if (!infographics || infographics.length === 0) {
      return res.status(200).send([]);
    }
    res.status(200).send(infographics);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

module.exports = router;

module.exports = router;
