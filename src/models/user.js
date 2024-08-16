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
  
  const user = await User.findOne({ email, enabled: true });
  if (!user) {
    throw new Error("Cet utilisateur est inexistant");
  }
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Mot de passe erroné");
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
userSchema.pre("find", function () {
  this.sort({ email: 1 });
});
userSchema.pre("findById", function () {
  this.sort({ email: -1 });
});
userSchema.pre("findOne", function () {
  this.sort({ email: -1 });
});
module.exports = User;
