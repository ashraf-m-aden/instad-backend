// server/models/VisitorStats.ts
import mongoose from "mongoose";

const visitorStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    totalVisits: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    activeVisitors: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const VisitorStats =
  mongoose.models.VisitorStats ||
  mongoose.model("VisitorStats", visitorStatsSchema);
