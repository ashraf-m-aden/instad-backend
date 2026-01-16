// models/Visitor.js
const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  userAgent: String,
  page: { type: String, required: true },
  lastVisit: { type: Date, default: Date.now },
  visitCount: { type: Number, default: 1 },
});

// Index composé pour recherche rapide
visitorSchema.index({ ip: 1, page: 1 });

const pageStatsSchema = new mongoose.Schema({
  page: { type: String, required: true, unique: true },
  totalVisits: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

const Visitor = mongoose.model("Visitor", visitorSchema);
const PageStats = mongoose.model("PageStats", pageStatsSchema);

module.exports = { Visitor, PageStats };
