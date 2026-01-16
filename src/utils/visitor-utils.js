// controllers/visitorController.js
const { Visitor, PageStats } = require("../models/visitor");

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes en millisecondes

exports.recordVisit = async (req, res) => {
  try {
    const { page } = req.body;
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const now = new Date();
    const thirtyMinutesAgo = new Date(now - SESSION_TIMEOUT);

    // Chercher le visiteur pour cette page
    let visitor = await Visitor.findOne({ ip, page });

    let isNewVisit = false;
    let isNewVisitor = false;

    if (!visitor) {
      // Nouveau visiteur
      visitor = new Visitor({
        ip,
        userAgent,
        page,
        lastVisit: now,
        visitCount: 1,
      });
      isNewVisit = true;
      isNewVisitor = true;
    } else {
      // Visiteur existant - vérifier si session expirée
      if (visitor.lastVisit < thirtyMinutesAgo) {
        // Session expirée = nouvelle visite
        visitor.visitCount += 1;
        visitor.lastVisit = now;
        isNewVisit = true;
      } else {
        // Session active - juste mettre à jour lastVisit
        visitor.lastVisit = now;
      }
    }

    await visitor.save();

    // Mettre à jour les statistiques de la page si nouvelle visite
    if (isNewVisit) {
      let pageStats = await PageStats.findOne({ page });

      if (!pageStats) {
        pageStats = new PageStats({
          page,
          totalVisits: 1,
          uniqueVisitors: 1,
          lastUpdated: now,
        });
      } else {
        pageStats.totalVisits += 1;
        if (isNewVisitor) {
          pageStats.uniqueVisitors += 1;
        }
        pageStats.lastUpdated = now;
      }

      await pageStats.save();
    }

    res.json({
      success: true,
      isNewVisit,
      stats: {
        totalVisits: (await PageStats.findOne({ page }))?.totalVisits || 0,
        uniqueVisitors:
          (await PageStats.findOne({ page }))?.uniqueVisitors || 0,
      },
    });
  } catch (error) {
    console.error("Error recording visit:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { page } = req.query;

    const stats = await PageStats.findOne({ page });

    if (!stats) {
      return res.json({
        totalVisits: 0,
        uniqueVisitors: 0,
      });
    }

    res.json({
      totalVisits: stats.totalVisits,
      uniqueVisitors: stats.uniqueVisitors,
      lastUpdated: stats.lastUpdated,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
