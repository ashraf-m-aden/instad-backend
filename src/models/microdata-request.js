const mongoose = require('mongoose');

// Schéma pour les demandes de micro-données
const microdataRequestSchema = new mongoose.Schema(
  {
    // Référence unique de la demande (générée automatiquement)
    referenceNumber: {
      type: String,
      unique: true,
      // Format: MDR-YYYYMMDD-XXXX (ex: MDR-20260203-0001)
      // Retiré required car généré automatiquement dans le hook pre-save
    },

    // === INFORMATIONS SUR LE DEMANDEUR ===
    
    // Type de demandeur
    requesterType: {
      type: String,
      required: true,
      enum: [
        'chercheur',           // Chercheur académique
        'etudiant',            // Étudiant (Master, Doctorat)
        'entreprise_privee',   // Entreprise privée
        'organisation_intl',   // Organisation internationale
        'institution_publique',// Institution publique
        'ong',                 // ONG
        'autre'               // Autre
      ],
    },

    // Informations personnelles
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    
    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Informations institutionnelles
    institution: {
      type: String,
      required: true,
      trim: true,
    },

    position: {
      type: String,
      required: true,
      trim: true,
    },

    // Adresse
    address: {
      street: String,
      city: String,
      country: {
        type: String,
        default: 'Djibouti',
      },
    },

    // === INFORMATIONS SUR LA DEMANDE ===

    // Titre du projet/recherche
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },

    // Description détaillée
    projectDescription: {
      type: String,
      required: true,
      minlength: 100,
    },

    // Objectifs de la recherche
    researchObjectives: {
      type: String,
      required: true,
    },

    // Type de données demandées
    dataType: {
      type: [String],
      required: true,
      enum: [
        'edam',              // Enquête Démographique
        'edim',              // Enquête sur les Indicateurs Multiples
        'recensement',       // Données de recensement
        'enquete_emploi',    // Enquête sur l'emploi
        'enquete_budget',    // Enquête budget des ménages
        'registre_civil',    // Registre d'état civil
        'autre',            // Autre
      ],
    },

    // Autre type de données (si "autre" sélectionné)
    dataTypeOther: {
      type: String,
      trim: true,
    },

    // Période des données souhaitées
    dataPeriod: {
      startYear: {
        type: Number,
        min: 1977, // Indépendance de Djibouti
        max: new Date().getFullYear(),
      },
      endYear: {
        type: Number,
        min: 1977,
        max: new Date().getFullYear(),
      },
    },

    // Variables spécifiques demandées
    specificVariables: {
      type: String,
      trim: true,
    },

    // Zone géographique
    geographicScope: {
      type: String,
      enum: ['national', 'regional', 'communal', 'autre'],
      default: 'national',
    },

    // Durée d'utilisation prévue
    usageDuration: {
      type: String,
      enum: ['moins_6_mois', '6_12_mois', '1_2_ans', 'plus_2_ans'],
      default: '6_12_mois',
    },

    // Méthode d'analyse prévue
    analysisMethod: {
      type: String,
      trim: true,
    },

    // === DOCUMENTS JOINTS ===
    
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === ENGAGEMENTS ET CONFIDENTIALITÉ ===

    // Accord de confidentialité
    confidentialityAgreement: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Usage uniquement à des fins de recherche
    researchPurposeOnly: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Accepte de ne pas tenter de réidentifier les individus
    noReidentificationAttempt: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Accepte de citer la source
    citationAgreement: {
      type: Boolean,
      required: true,
      default: false,
    },

    // === STATUT ET SUIVI ===

    status: {
      type: String,
      required: true,
      enum: [
        'soumis',                    // Demande soumise
        'en_cours_verification',     // En cours de vérification
        'information_complementaire', // Informations complémentaires requises
        'en_cours_validation',       // En cours de validation
        'approuve',                  // Approuvé
        'refuse',                    // Refusé
        'donnees_envoyees',          // Données envoyées
        'cloture'                    // Clôturé
      ],
      default: 'soumis',
    },

    // Historique des changements de statut
    statusHistory: [
      {
        status: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'users', // Référence vers le modèle User (administrateur)
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        comment: String,
      },
    ],

    // Notes internes (visibles uniquement par les administrateurs)
    internalNotes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'users',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Commentaire public (visible par le demandeur)
    publicComment: {
      type: String,
      trim: true,
    },

    // Date de validation/refus
    decidedAt: {
      type: Date,
    },

    // Décidé par (administrateur)
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
    },

    // === DONNÉES SUPPLÉMENTAIRES ===

    // Adresse IP de soumission
    submissionIp: {
      type: String,
    },

    // User agent
    userAgent: {
      type: String,
    },

    // Langue de soumission
    language: {
      type: String,
      enum: ['fr', 'ar', 'en'],
      default: 'fr',
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

// === INDEXES ===
microdataRequestSchema.index({ email: 1 });
microdataRequestSchema.index({ status: 1, createdAt: -1 });
microdataRequestSchema.index({ referenceNumber: 1 });
microdataRequestSchema.index({ createdAt: -1 });

// === MÉTHODES D'INSTANCE ===

// Méthode pour générer un numéro de référence unique
microdataRequestSchema.statics.generateReferenceNumber = async function () {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  // Compter les demandes du jour
  const count = await this.countDocuments({
    referenceNumber: new RegExp(`^MDR-${dateStr}`),
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `MDR-${dateStr}-${sequence}`;
};

// Méthode pour ajouter une entrée dans l'historique de statut
microdataRequestSchema.methods.addStatusHistory = function (
  newStatus,
  userId,
  comment = ''
) {
  this.statusHistory.push({
    status: newStatus,
    updatedBy: userId,
    comment,
    updatedAt: new Date(),
  });
  this.status = newStatus;
};

// Méthode pour ajouter une note interne
microdataRequestSchema.methods.addInternalNote = function (note, userId) {
  this.internalNotes.push({
    note,
    addedBy: userId,
    addedAt: new Date(),
  });
};

// Méthode pour obtenir le nom complet du demandeur
microdataRequestSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// Méthode pour vérifier si tous les engagements sont acceptés
microdataRequestSchema.methods.hasAllAgreements = function () {
  return (
    this.confidentialityAgreement &&
    this.researchPurposeOnly &&
    this.noReidentificationAttempt &&
    this.citationAgreement
  );
};

// === HOOKS (MIDDLEWARE) ===

// Avant la sauvegarde, générer le numéro de référence si c'est une nouvelle demande
microdataRequestSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.referenceNumber) {
      this.referenceNumber = await this.constructor.generateReferenceNumber();
      console.log('✅ Référence générée:', this.referenceNumber);
    }
    next();
  } catch (error) {
    console.error('❌ Erreur génération référence:', error);
    next(error);
  }
});

// Avant la sauvegarde, ajouter le premier statut à l'historique
microdataRequestSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: 'soumis',
      updatedAt: new Date(),
    });
  }
  next();
});

// === VIRTUALS ===

// Nombre de jours depuis la soumission
microdataRequestSchema.virtual('daysSinceSubmission').get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Statut lisible en français
microdataRequestSchema.virtual('statusLabel').get(function () {
  const labels = {
    soumis: 'Soumis',
    en_cours_verification: 'En cours de vérification',
    information_complementaire: 'Information complémentaire requise',
    en_cours_validation: 'En cours de validation',
    approuve: 'Approuvé',
    refuse: 'Refusé',
    donnees_envoyees: 'Données envoyées',
    cloture: 'Clôturé',
  };
  return labels[this.status] || this.status;
});

// S'assurer que les virtuals sont inclus lors de la conversion en JSON
microdataRequestSchema.set('toJSON', { virtuals: true });
microdataRequestSchema.set('toObject', { virtuals: true });

const MicrodataRequest = mongoose.model('MicrodataRequest', microdataRequestSchema);

module.exports = MicrodataRequest;