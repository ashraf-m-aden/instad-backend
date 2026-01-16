const user = require("./user");
const fichier = require("./fichier");
const flash = require("./flash");
const news = require("./news");
const headerData = require("./headerData");
const gallery = require("./gallery");
const visitors = require("./visitor");
allUses = [user, fichier, news, flash, headerData, gallery, visitors];

module.exports = allUses;
