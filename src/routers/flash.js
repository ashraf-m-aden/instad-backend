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

router.patch("/flash", auth, async (req, res) => {
  // modifier un utilisateur
  let flash = await Flash.findById({ _id: req.body._id });
  if (!flash) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    await Object.assign(flash, req.body);
    await flash.save();
    return res.send(flash);
  } catch (error) {
    res.status(500).send(error);
  }
});


router.delete("/flash/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const flash = Flash.findById({ _id: req.id });
  if (!flash) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    flash.enabled = !flash.enabled; // j'active ou desactive L'utilisateur
    await flash.save();
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
