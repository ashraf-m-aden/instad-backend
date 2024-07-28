const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");

router.post("/user", async (req, res) => {
  // nouvel utilisateur
  delete req.body._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const user = new User(req.body);
  try {
    await user.save();
    return res.status(200).send(user);
  } catch (error) {
    console.log(error)
    res.status(400).send(error);
  }
});

router.patch("/user", auth, async (req, res) => {
  // modifier un utilisateur
  let user = await User.findById({ _id: req.body._id });
  if (!user) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    await Object.assign(user, req.body);
    await user.save();
    return res.send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.patch("/user/mdp/:id", auth, async (req, res) => {
  // modifier le mot de passe d'un utilisateur
  let user = await User.findById({ _id: req.params.id });
  if (!user) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    user.password = req.body.password;
    await user.save();
    return res.send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/user/:id", auth, async (req, res) => {
  // desactiver un utilisateur
  const user = User.findById({ _id: req.id });
  if (!user) {
    return res.statut(404).send("L'utilisateur n'existe pas");
  }
  try {
    user.enabled = !user.enabled; // j'active ou desactive L'utilisateur
    await user.save();
    res.status(200).send(user);
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

router.get("/user/:id",auth, async (req, res) => {
  // get one user
  try {
    let user = await User.findById({ _id: req.params.id });
    if (!user) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/user/isConnected/me",auth, async (req, res) => {
  // get one user
  try {
    console.log("isconnected back");
    if (!req.user) {
      return res.status(404);
    }
    res.status(200).send(req.user);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

router.get("/users",auth, async (req, res) => {
  // get All user
  try {
    const users = await User.find({});
    if (!users) {
      res.status(200).send([]);
    }
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});




///////////////////////////////////


router.post("/user/logout", auth, async (req, res) => {
  try {
    req.user.tokens = await req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send();
  } catch (error) {
    res.status(404).send(error);
  }
});

router.post("/user/login", async (req, res) => {
  // login
  try {
    let user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateToken();

    return res.status(201).send({ user, token });
  } catch (e) {
    console.log(e);
    res.status(404).send(e);
  }
});
module.exports = router;
