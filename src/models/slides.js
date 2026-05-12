const mongoose = require("mongoose");

const slideSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "imageText", "video"],
      required: true,
    },
    mediaUrl: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "" },
    ctaUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

slideSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model("Slide", slideSchema);