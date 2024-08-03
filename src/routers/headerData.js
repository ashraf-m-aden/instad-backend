const express = require("express");
const router = new express.Router();
const HeaderData = require("../models/headerData");
const auth = require("../middleware/auth");

router.post("/headerData", async (req, res) => {
  delete req.body.headerData._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const headerData = new HeaderData(req.body.headerData);
  try {
    await headerData.save();
    return res.status(200).send(headerData);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.patch("/headerData", auth, async (req, res) => {
  // modifier un utilisateur
  let headerData = await HeaderData.findById({ _id: req.body.headerData._id });
  if (!headerData) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    await Object.assign(headerData, req.body.headerData);
    await headerData.save();

    return res.send(headerData);
  } catch (error) {
    console.log(error);

    res.status(500).send(error);
  }
});


router.delete("/headerData/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const headerData = await HeaderData.findOneAndDelete({ _id: req.params.id });
  if (!headerData) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
 
    res.status(200).send(headerData);
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

router.get("/headerData/:id", async (req, res) => {
  // get one headerData
  try {
    let headerData = await HeaderData.findById({ _id: req.params.id });
    if (!headerData) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(headerData);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/headerDatas", async (req, res) => {
  // get All headerData
  try {
    const headerData = await HeaderData.find({});
    if (!headerData) {
      res.status(200).send([]);
    }
    res.status(200).send(headerData);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});


module.exports = router;
