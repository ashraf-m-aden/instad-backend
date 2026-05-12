const user = require("./user");
const fichier = require("./fichier");
const filtres = require("./filtres");
const flash = require("./flash");
const news = require("./news");
const headerData = require("./headerData");
const gallery = require("./gallery");
const visitors = require("./visitor");
const request = require("./microdata-request");
const navs = require("./nav");
const thematiques = require("./thematiques");
const slides = require("./slides");
const homeSettings = require("./homeSettings");
allUses = [user, fichier, filtres, news,navs, flash, headerData, gallery, visitors,request,thematiques,slides,homeSettings];

module.exports = allUses;
