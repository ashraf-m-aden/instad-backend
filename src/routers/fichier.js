const express = require("express");
const router = new express.Router();
const Fichier = require("../models/fichier");
const auth = require("../middleware/auth");

router.post("/fichier",auth, async (req, res) => {
  delete req.body.fichier._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const fichier = new Fichier(req.body.fichier);
  try {
    await fichier.save();
    return res.status(200).send(fichier);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.patch("/fichier", auth, async (req, res) => {
  // modifier un utilisateur
  let fichier = await Fichier.findById({ _id: req.body._id });
  if (!fichier) {
    return res.statut(404).send("Les données sont introuvables");
  }
  try {
    await Object.assign(fichier, req.body);
    await fichier.save();
    return res.send(fichier);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.patch("/fichier/mdp/:id", auth, async (req, res) => {
  // modifier le mot de passe d'un utilisateur
  let fichier = await Fichier.findById({ _id: req.params.id });
  if (!fichier) {
    return res.statut(404).send("Les données sont introuvables");
  }
  try {
    fichier.password = req.body.password;
    await fichier.save();
    return res.send(fichier);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/fichier/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const fichier = await Fichier.findOneAndDelete({ _id: req.params.id });
  if (!fichier) {
    return res.statut(404).send("Le fichier n'existe pas n'existe pas");
  }
  try {

    res.status(200).send(fichier);
  } catch (error) {
    console.log(error);
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

router.get("/fichier/:id", async (req, res) => {
  // get one fichier
  try {
    let fichier = await Fichier.findById({ _id: req.params.id });
    if (!fichier) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(fichier);
  } catch (error) {
    res.status(500).send("Un problem est survenu veuillez reessayer");
  }
});

router.get("/fichiers/:categorie", async (req, res) => {
  // get All fichier
  try {
    const fichiers = await Fichier.find({ categorie: req.params.categorie });
    if (!fichiers) {
      res.status(200).send([]);
    }
    res.status(200).send(fichiers);
  } catch (error) {
    res.status(500).send(error);
  }
});


module.exports = router;
