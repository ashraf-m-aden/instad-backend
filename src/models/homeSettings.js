const mongoose = require("mongoose");

const homeSettingsSchema = new mongoose.Schema(
  {
    displayMode: {
      type: String,
      enum: ["thematiques", "carrousel", "both"],
      default: "thematiques",
    },
    carrouselAutoplayMs: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomeSettings", homeSettingsSchema);