// routes/visitors.js
const express = require("express");
const router = express.Router();
const visitorController = require("../utils/visitor-utils");

router.post("/visit", visitorController.recordVisit);
router.get("/stats", visitorController.getStats);

module.exports = router;
