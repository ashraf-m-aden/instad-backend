const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    name: {
      type: String,
    },
    roles: {
      type: Array,
    },

    enabled: {
      type: Boolean,
      default: true,
    },
    tokens: [
      {
        token: {
          type: String,
          default: "",

          required: true,
        },
      },
    ],

  },
  { timestamps: true }
);

// verify credentials, this a function we use on User and not on user
userSchema.statics.findByCredentials = async (email, password) => {
  // Codes d'erreur stables, pour que la route choisisse le statut HTTP sans
  // avoir a interpreter un message. `enabled` est volontairement verifie
  // APRES le mot de passe : teste avant (l'ancien findOne({email, enabled:
  // true})), un compte suspendu etait indistinguable d'un email inconnu, ce
  // qui rendait le diagnostic impossible cote utilisateur. Teste apres, le
  // refus "compte desactive" n'est revele qu'a qui connait le mot de passe.
  const fail = (code) => {
    const error = new Error(code);
    error.code = code;
    throw error;
  };

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    fail("INVALID_CREDENTIALS");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    fail("INVALID_CREDENTIALS");
  }
  if (!user.enabled) {
    fail("ACCOUNT_DISABLED");
  }
  return user;
};

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;
  return userObject;
};
userSchema.methods.generateToken = async function () {
  const user = this;
  try {
    const token = await jwt.sign(
      { _id: user._id.toString() },
      process.env.jwt_secret
    );
    while (user.tokens.length >= 1) {
      await user.tokens.shift();
    }

    user.tokens = await user.tokens.concat({ token });

    try {
      //  user.email=user.email;
      await user.save();
    } catch (err) {
      console.log(err);
    }

    return token;
  } catch (e) {
    throw new Error("Probleme de creation de token, " + e);
  }
};
// hash the plain text password
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});
const User = mongoose.model("users", userSchema);
// Note: les hooks pre("find") / pre("findById") / pre("findOne") qui se
// trouvaient ici etaient enregistres APRES la compilation du modele, donc
// jamais executes par Mongoose (et "findById" n'est pas un nom de hook
// valide). Supprimes : le tri par email se fait a l'appel (cf. GET /users).
module.exports = User;
