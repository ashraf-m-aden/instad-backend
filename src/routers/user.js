const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");

// Un utilisateur est administrateur si son tableau `roles` contient "Admin"
// (cf. front: types/index.ts -> roles.ADMIN). Comparaison insensible a la
// casse : les documents existants ne sont pas garantis homogenes.
const isAdmin = (user) =>
  Array.isArray(user && user.roles) &&
  user.roles.some((role) => String(role).toLowerCase() === "admin");

const adminOnly = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).send("Acces reserve aux administrateurs");
  }
  next();
};

// Un non-administrateur ne peut agir que sur son propre compte.
const canActOn = (req, targetId) =>
  isAdmin(req.user) || req.user._id.toString() === String(targetId);

router.post("/user", auth, adminOnly, async (req, res) => {
  // nouvel utilisateur
  delete req.body.user._id; // deleteOne the object _id from  the request body and dont forget email is necessary
  const user = new User(req.body.user);
  try {
    await user.save();
    return res.status(200).send(user);
  } catch (error) {
    console.log(error)
    res.status(400).send(error);
  }
});

router.patch("/user", auth, async (req, res) => {
  // modifier un utilisateur (profil uniquement)
  const payload = req.body && req.body.user;
  if (!payload || !payload._id) {
    return res.status(400).send("Identifiant manquant");
  }
  if (!canActOn(req, payload._id)) {
    return res.status(403).send("Modification non autorisee");
  }
  try {
    const user = await User.findById(payload._id);
    if (!user) {
      return res.status(404).send("Les données sont introuvables");
    }
    // Liste blanche. `password` n'y figure volontairement PAS : un changement
    // de mot de passe passe exclusivement par PATCH /user/mdp/:id, cette route
    // ne peut donc plus alterer le mot de passe par effet de bord.
    // `roles` et `enabled` restent reserves aux administrateurs, sinon un
    // utilisateur pourrait s'octroyer le role Admin ou se reactiver lui-meme.
    // Remplace un Object.assign qui recopiait tout le corps de la requete,
    // `tokens` compris (ce qui permettait de forger ou d'effacer des sessions).
    const updatable = isAdmin(req.user)
      ? ["email", "name", "roles", "enabled"]
      : ["email", "name"];
    for (const field of updatable) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        user[field] = payload[field];
      }
    }
    await user.save();
    return res.send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.patch("/user/mdp/:id", auth, async (req, res) => {
  // modifier le mot de passe d'un utilisateur
  const password = req.body && req.body.password;
  // Garde-fou : un corps vide ecraserait le mot de passe par le hash de ""
  // et rendrait le compte inaccessible.
  if (typeof password !== "string" || password.trim().length === 0) {
    return res.status(400).send("Le mot de passe est obligatoire");
  }
  if (!canActOn(req, req.params.id)) {
    return res.status(403).send("Modification non autorisee");
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send("Les données sont introuvables");
    }
    user.password = password; // le hook pre-save applique le hash bcrypt
    // Les tokens deja emis restent valides tant qu'ils sont en base
    // (cf. middleware/auth.js) : on revoque les sessions ouvertes avec
    // l'ancien mot de passe, en conservant celle de l'appelant s'il change
    // son propre mot de passe (sinon il serait deconnecte immediatement).
    if (req.user._id.toString() === user._id.toString()) {
      user.tokens = user.tokens.filter((t) => t.token === req.token);
    } else {
      user.tokens = [];
    }
    await user.save();
    return res.send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/user/:id", auth, adminOnly, async (req, res) => {
  // desactiver un utilisateur
  if (req.user._id.toString() === String(req.params.id)) {
    // sinon un administrateur peut se verrouiller hors de l'application
    return res.status(400).send("Vous ne pouvez pas désactiver votre compte");
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).send("Les données sont introuvables");
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

router.get("/user/:id", auth, async (req, res) => {
  // get one user
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send("Utilisateur inexistant");
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/user/isConnected/me", auth, async (req, res) => {
  // get one user
  try {
    if (!req.user) {
      return res.status(404);
    }
    res.status(200).send(req.user);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

router.get("/users", auth, async (req, res) => {
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
    // Avant, toute erreur devenait 404 "Utilisateur inexistant" : un compte
    // simplement desactive, un mot de passe errone et meme une panne de base
    // renvoyaient le meme message, qui affirmait a tort que le compte
    // n'existait pas.
    if (e && e.code === "ACCOUNT_DISABLED") {
      return res
        .status(403)
        .send("Votre compte a été désactivé. Contactez un administrateur.");
    }
    if (e && e.code === "INVALID_CREDENTIALS") {
      return res.status(401).send("Email ou mot de passe incorrect");
    }
    console.log(e);
    return res.status(500).send("La connexion a échoué, veuillez réessayer");
  }
});
module.exports = router;
