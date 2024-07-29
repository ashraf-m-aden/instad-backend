const jwt = require("jsonwebtoken");
const User = require("../models/user");
const auth = async (req, res, next) => {
  try {
    // const token = req.headers.authorization
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.jwt_secret);
    let user = await User.findOne({ _id: decoded._id, "tokens.token": token });
    if (user) {
      req.user = user;
      req.token = token;

      next();
    } 

    else{
      res.status(401).send({ error: "Veuillez vous connecter" });

    }
  } catch (error) {
    console.log(error);
    res.status(401).send({ error: "Veuillez vous connecter" });
  }
};

module.exports = auth;
