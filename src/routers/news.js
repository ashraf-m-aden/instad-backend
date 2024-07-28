const express = require("express");
const router = new express.Router();
const News = require("../models/news");
const auth = require("../middleware/auth");

router.post("/news",auth, async (req, res) => {
  delete req.body.news._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const news = new News(req.body.news);
  try {
    await news.save();
    return res.status(200).send(news);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.patch("/news", auth, async (req, res) => {
  // modifier un utilisateur
  let news = await News.findById({ _id: req.body._id });
  if (!news) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    await Object.assign(news, req.body);
    await news.save();
    return res.send(news);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.patch("/news/mdp/:id", auth, async (req, res) => {
  // modifier le mot de passe d'un utilisateur
  let news = await News.findById({ _id: req.params.id });
  if (!news) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    news.password = req.body.password;
    await news.save();
    return res.send(news);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/news/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const news = News.findById({ _id: req.id });
  if (!news) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    news.enabled = !news.enabled; // j'active ou desactive L'utilisateur
    await news.save();
    res.status(200).send(news);
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

router.get("/news/:id", async (req, res) => {
  // get one news
  try {
    let news = await News.findById({ _id: req.params.id });
    if (!news) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(news);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/newss", async (req, res) => {
  // get All news
  try {
    const news = await News.find({});
    if (!news) {
      res.status(200).send([]);
    }
    res.status(200).send(news);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});


module.exports = router;
