const express = require("express");
const router = new express.Router();
const Flash = require("../models/flash");
const auth = require("../middleware/auth");

router.post("/flash", async (req, res) => {
  delete req.body.flash._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const flash = new Flash(req.body.flash);
  try {
    await flash.save();
    return res.status(200).send(flash);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

// Modifier une info flash (texte et/ou lien).
router.patch("/flash", auth, async (req, res) => {
  try {
    const flash = await Flash.findById(req.body._id);
    if (!flash) {
      // "statut" au lieu de "status" : la recherche d'un flash inexistant
      // levait un TypeError hors du try et renvoyait 500 au lieu de 404.
      return res.status(404).send("Les données sont introuvables");
    }

    // Seuls ces champs sont modifiables : un Object.assign du corps entier
    // laisserait le client ecraser _id ou les timestamps.
    if (req.body.info !== undefined) flash.info = req.body.info;
    if (req.body.url !== undefined) flash.url = req.body.url;
    if (req.body.enabled !== undefined) flash.enabled = req.body.enabled;

    await flash.save();
    return res.send(flash);
  } catch (error) {
    res.status(500).send(error);
  }
});


router.delete("/flash/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const flash = await Flash.findOneAndDelete({ _id: req.params.id });
  if (!flash) {
    return res.statut(404).send("Les données sont introuvables");
  }
  try {
 
    res.status(200).send(flash);
  } catch (error) {
    res
      .status(500)
      .send(
        "Une erreur est survenue lors de la modification veuillez réessayer."
      );
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get("/flash/:id", async (req, res) => {
  // get one flash
  try {
    let flash = await Flash.findById({ _id: req.params.id });
    if (!flash) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(flash);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/flashs", async (req, res) => {
  // get All flash
  try {
    const flash = await Flash.find({});
    if (!flash) {
      res.status(200).send([]);
    }
    res.status(200).send(flash);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});


module.exports = router;
