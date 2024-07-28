const user = require("./user");
const fichier = require("./fichier");
const flash = require("./flash");
const news = require("./news");
const headerData = require("./headerData");
allUses = [user, fichier, news, flash,headerData];

module.exports = allUses;
