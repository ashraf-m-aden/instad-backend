const mongoose = require('mongoose');

// Schéma pour le catalogue de micro-données
const microdataSchema = new mongoose.Schema(
  {
    // === INFORMATIONS GÉNÉRALES ===
    
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      // Format: EDAM-2024-01
    },

    description: {
      type: String,
      required: true,
      minlength: 50,
    },

    // === CATÉGORISATION ===

    type: {
      type: String,
      required: true,
      enum: [
        'edam',
        'edim',
        'recensement',
        'enquete_emploi',
        'enquete_budget',
        'registre_civil',
        'autre',
      ],
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      // Ex: "Démographie", "Économie", "Santé", "Éducation", "Emploi", "Social"
    },

    sector: {
      type: [String],
      default: [],
      // Ex: ["Population", "Santé", "Éducation"]
    },

    // === PÉRIODE COUVERTE ===

    coveragePeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    // === COUVERTURE GÉOGRAPHIQUE ===

    geographicCoverage: {
      type: String,
      required: true,
      enum: ['national', 'regional', 'communal'],
      default: 'national',
    },

    regions: {
      type: [String],
      default: [],
      // Ex: ["Djibouti-Ville", "Ali Sabieh", "Dikhil", "Tadjourah", "Obock", "Arta"]
    },

    // === MÉTADONNÉES ===

    methodology: {
      type: String,
      required: true,
      // Description de la méthodologie de collecte
    },

    sampleSize: {
      type: Number,
      min: 0,
      // Taille de l'échantillon
    },

    variables: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Au moins une variable doit être définie',
      },
      // Liste des variables disponibles
    },

    // === DOCUMENTATION ===

    documentation: {
      questionnaire: {
        type: String,
        trim: true,
        // URL du questionnaire
      },
      rapport: {
        type: String,
        trim: true,
        // URL du rapport
      },
      dictionnaire: {
        type: String,
        trim: true,
        // URL du dictionnaire des données
      },
      metadata: {
        type: String,
        trim: true,
        // URL des métadonnées DDI/XML
      },
    },

    // === ACCÈS ET DISPONIBILITÉ ===

    accessType: {
      type: String,
      required: true,
      enum: ['public', 'restricted', 'confidential'],
      default: 'restricted',
    },

    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },

    requestRequired: {
      type: Boolean,
      required: true,
      default: true,
      // Si true, une demande formelle est nécessaire
    },

    // Conditions d'accès (texte libre)
    accessConditions: {
      type: String,
      trim: true,
    },

    // === STATISTIQUES ===

    stats: {
      downloads: {
        type: Number,
        default: 0,
        min: 0,
      },
      requests: {
        type: Number,
        default: 0,
        min: 0,
      },
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastAccessed: {
        type: Date,
      },
    },

    // === INFORMATIONS ADMINISTRATIVES ===

    publishedBy: {
      type: String,
      required: true,
      default: 'DISED',
    },

    publishedDate: {
      type: Date,
      required: true,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },

    // === TAGS ET MOTS-CLÉS ===

    tags: {
      type: [String],
      default: [],
      // Tags pour la recherche et la catégorisation
    },

    keywords: {
      type: [String],
      default: [],
      // Mots-clés pour la recherche
    },

    // === INFORMATIONS SUPPLÉMENTAIRES ===

    // Citation suggérée
    citation: {
      type: String,
      trim: true,
    },

    // Contact pour plus d'informations
    contact: {
      name: String,
      email: String,
      phone: String,
    },

    // Langue des données
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'ar', 'en'],
    },

    // Licence
    license: {
      type: String,
      trim: true,
      default: 'Usage restreint - Autorisation requise',
    },

    // Notes internes (visibles uniquement par les admins)
    internalNotes: {
      type: String,
      trim: true,
    },

    // Créé par (référence à l'utilisateur admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Modifié par (référence à l'utilisateur admin)
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

// === INDEXES ===

// Index composé pour recherche full-text
microdataSchema.index({ title: 'text', description: 'text', keywords: 'text', tags: 'text' });

// Index pour filtres
microdataSchema.index({ type: 1, status: 1 });
microdataSchema.index({ category: 1, status: 1 });
microdataSchema.index({ publishedDate: -1 });
microdataSchema.index({ 'coveragePeriod.startDate': 1, 'coveragePeriod.endDate': 1 });

// === MÉTHODES STATIQUES ===

// Générer un code unique
microdataSchema.statics.generateCode = async function(type, year) {
  const prefix = type.toUpperCase();
  const yearStr = year.toString();
  
  // Compter les datasets du même type et année
  const count = await this.countDocuments({
    code: new RegExp(`^${prefix}-${yearStr}`),
  });
  
  const sequence = String(count + 1).padStart(2, '0');
  return `${prefix}-${yearStr}-${sequence}`;
};

// Recherche avancée
microdataSchema.statics.advancedSearch = async function(filters) {
  const query = { status: 'published' };

  // Recherche textuelle
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Filtre par type
  if (filters.type) {
    query.type = filters.type;
  }

  // Filtre par catégorie
  if (filters.category) {
    query.category = new RegExp(filters.category, 'i');
  }

  // Filtre par année
  if (filters.year) {
    const year = parseInt(filters.year);
    query['coveragePeriod.startDate'] = { $lte: new Date(year, 11, 31) };
    query['coveragePeriod.endDate'] = { $gte: new Date(year, 0, 1) };
  }

  // Filtre par type d'accès
  if (filters.accessType) {
    query.accessType = filters.accessType;
  }

  // Disponibilité
  if (filters.availableOnly === true) {
    query.isAvailable = true;
  }

  return this.find(query);
};

// Statistiques globales
microdataSchema.statics.getStatistics = async function() {
  const totalDatasets = await this.countDocuments({ status: 'published' });
  
  const totalVariables = await this.aggregate([
    { $match: { status: 'published' } },
    { $project: { variableCount: { $size: '$variables' } } },
    { $group: { _id: null, total: { $sum: '$variableCount' } } },
  ]);

  const years = await this.aggregate([
    { $match: { status: 'published' } },
    {
      $project: {
        years: {
          $range: [
            { $year: '$coveragePeriod.startDate' },
            { $add: [{ $year: '$coveragePeriod.endDate' }, 1] },
          ],
        },
      },
    },
    { $unwind: '$years' },
    { $group: { _id: null, uniqueYears: { $addToSet: '$years' } } },
  ]);

  const typeDistribution = await this.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  return {
    totalDatasets,
    totalVariables: totalVariables[0]?.total || 0,
    coverageYears: years[0]?.uniqueYears.length || 0,
    typeDistribution: typeDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};

// === MÉTHODES D'INSTANCE ===

// Incrémenter les vues
microdataSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  this.stats.lastAccessed = new Date();
  return this.save();
};

// Incrémenter les téléchargements
microdataSchema.methods.incrementDownloads = function() {
  this.stats.downloads += 1;
  this.stats.lastAccessed = new Date();
  return this.save();
};

// Incrémenter les demandes
microdataSchema.methods.incrementRequests = function() {
  this.stats.requests += 1;
  return this.save();
};

// Vérifier si disponible pour l'utilisateur
microdataSchema.methods.isAccessibleBy = function(user) {
  if (!this.isAvailable) return false;
  
  if (this.accessType === 'public') return true;
  
  if (this.accessType === 'restricted') {
    // Vérifier si l'utilisateur a fait une demande approuvée
    // (À implémenter selon votre logique)
    return false;
  }
  
  if (this.accessType === 'confidential') {
    // Vérifier si l'utilisateur est admin ou a une autorisation spéciale
    return user?.role === 'admin';
  }
  
  return false;
};

// Obtenir la période formatée
microdataSchema.methods.getFormattedPeriod = function() {
  const startYear = this.coveragePeriod.startDate.getFullYear();
  const endYear = this.coveragePeriod.endDate.getFullYear();
  
  if (startYear === endYear) {
    return `${startYear}`;
  }
  return `${startYear} - ${endYear}`;
};

// === HOOKS (MIDDLEWARE) ===

// Avant la sauvegarde, mettre à jour lastUpdated
microdataSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Avant la sauvegarde, générer le code si nouveau
microdataSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    const year = this.coveragePeriod.startDate.getFullYear();
    this.code = await this.constructor.generateCode(this.type, year);
  }
  next();
});

// Nettoyer les tags et keywords (trim, lowercase)
microdataSchema.pre('save', function(next) {
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);
  }
  if (this.keywords) {
    this.keywords = this.keywords.map(kw => kw.trim().toLowerCase()).filter(Boolean);
  }
  next();
});

// === VIRTUALS ===

// URL de détail
microdataSchema.virtual('detailUrl').get(function() {
  return `/microdata/${this.code}`;
});

// Nombre d'années couvertes
microdataSchema.virtual('coverageYearsCount').get(function() {
  const start = this.coveragePeriod.startDate.getFullYear();
  const end = this.coveragePeriod.endDate.getFullYear();
  return end - start + 1;
});

// Popularité (score basé sur les stats)
microdataSchema.virtual('popularityScore').get(function() {
  return (this.stats.views * 1) + (this.stats.downloads * 5) + (this.stats.requests * 3);
});

// S'assurer que les virtuals sont inclus lors de la conversion en JSON
microdataSchema.set('toJSON', { virtuals: true });
microdataSchema.set('toObject', { virtuals: true });

const Microdata = mongoose.model('Microdata', microdataSchema);

module.exports = Microdata;