const express = require("express");
const router = new express.Router();
const Gallery = require("../models/gallery");
const auth = require("../middleware/auth");

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

module.exports = router;
