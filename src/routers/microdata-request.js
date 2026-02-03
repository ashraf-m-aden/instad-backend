const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const MicrodataRequest = require('../models/microdata-request');

// === CONFIGURATION MULTER POUR L'UPLOAD DE FICHIERS ===

// Configuration du stockage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/microdata-requests');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Filtres de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, Word, Excel, JPEG, PNG'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10 MB par fichier
    files: 5, // Maximum 5 fichiers
  },
});

// === MIDDLEWARE D'AUTHENTIFICATION (à adapter selon votre système) ===

// Middleware pour vérifier si l'utilisateur est admin (à personnaliser)
const isAdmin = (req, res, next) => {
  // TODO: Implémenter votre logique d'authentification admin
  // Exemple simple (à remplacer par votre système JWT/session) :
  if (req.headers.authorization === 'Bearer ADMIN_TOKEN' || req.session?.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès non autorisé' });
  }
};

// === ROUTES PUBLIQUES ===

/**
 * @route   POST /api/microdata-requests
 * @desc    Créer une nouvelle demande de micro-données
 * @access  Public
 */
router.post('/api/microdata-requests', upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      // Informations demandeur
      requesterType,
      firstName,
      lastName,
      email,
      phone,
      institution,
      position,
      address,
      
      // Informations demande
      projectTitle,
      projectDescription,
      researchObjectives,
      dataTypeOther,
      dataPeriod,
      specificVariables,
      geographicScope,
      usageDuration,
      analysisMethod,
      
      // Engagements
      confidentialityAgreement,
      researchPurposeOnly,
      noReidentificationAttempt,
      citationAgreement,
      
      // Autres
      language,
    } = req.body;

    // Récupérer dataType qui peut être un array ou un string
    let dataType = req.body['dataType[]'] || req.body.dataType || [];
    
    // S'assurer que c'est toujours un array
    if (!Array.isArray(dataType)) {
      dataType = dataType ? [dataType] : [];
    }
    
    console.log('DataType traité:', dataType);

    // Validation des données
    if (!firstName || !lastName || !email || !phone || !institution || !position) {
      return res.status(400).json({ 
        error: 'Tous les champs obligatoires doivent être remplis',
        fields: ['firstName', 'lastName', 'email', 'phone', 'institution', 'position']
      });
    }

    if (!projectTitle || !projectDescription || !researchObjectives) {
      return res.status(400).json({ 
        error: 'Informations sur le projet incomplètes',
        fields: ['projectTitle', 'projectDescription', 'researchObjectives']
      });
    }

    // Vérifier que tous les engagements sont acceptés
    if (!confidentialityAgreement || !researchPurposeOnly || 
        !noReidentificationAttempt || !citationAgreement) {
      return res.status(400).json({ 
        error: 'Tous les engagements doivent être acceptés'
      });
    }

    // Traiter les fichiers uploadés
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    })) : [];

    // Parser les objets JSON
    const parsedAddress = address ? JSON.parse(address) : { street: '', city: '', country: 'Djibouti' };
    const parsedDataPeriod = dataPeriod ? JSON.parse(dataPeriod) : { startYear: null, endYear: null };

    console.log('Données à sauvegarder:', {
      requesterType,
      firstName,
      lastName,
      email,
      dataType,
      attachmentsCount: attachments.length
    });

    // Créer la demande
    const microdataRequest = new MicrodataRequest({
      requesterType,
      firstName,
      lastName,
      email,
      phone,
      institution,
      position,
      address: parsedAddress,
      
      projectTitle,
      projectDescription,
      researchObjectives,
      dataType,
      dataTypeOther,
      dataPeriod: parsedDataPeriod,
      specificVariables,
      geographicScope,
      usageDuration,
      analysisMethod,
      
      attachments,
      
      confidentialityAgreement: confidentialityAgreement === 'true' || confidentialityAgreement === true,
      researchPurposeOnly: researchPurposeOnly === 'true' || researchPurposeOnly === true,
      noReidentificationAttempt: noReidentificationAttempt === 'true' || noReidentificationAttempt === true,
      citationAgreement: citationAgreement === 'true' || citationAgreement === true,
      
      submissionIp: req.ip,
      userAgent: req.get('user-agent'),
      language: language || 'fr',
    });

    await microdataRequest.save();

    console.log('✅ Demande sauvegardée avec succès:', {
      id: microdataRequest._id,
      referenceNumber: microdataRequest.referenceNumber,
      requester: `${microdataRequest.firstName} ${microdataRequest.lastName}`
    });

    // TODO: Envoyer un email de confirmation au demandeur
    // sendConfirmationEmail(microdataRequest);

    res.status(201).json({
      success: true,
      message: 'Demande soumise avec succès',
      data: {
        referenceNumber: microdataRequest.referenceNumber,
        status: microdataRequest.status,
        statusLabel: microdataRequest.statusLabel,
        createdAt: microdataRequest.createdAt,
      },
    });

  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    
    // Supprimer les fichiers uploadés en cas d'erreur
    if (req.files) {
      req.files.forEach(async (file) => {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Erreur suppression fichier:', unlinkError);
        }
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la soumission de la demande',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/microdata-requests/track/:referenceNumber
 * @desc    Suivre l'état d'une demande par numéro de référence
 * @access  Public
 */
router.get('/api/microdata-requests/track/:referenceNumber', async (req, res) => {
  try {
    const { referenceNumber } = req.params;
console.log(req.params)
    const request = await MicrodataRequest.findOne({ referenceNumber })
      .select('-internalNotes -submissionIp -userAgent -__v')
      .lean();

    if (!request) {
      return res.status(404).json({ 
        error: 'Demande introuvable',
        message: 'Aucune demande ne correspond à ce numéro de référence'
      });
    }

    // Filtrer l'historique pour ne montrer que les informations publiques
    const publicHistory = request.statusHistory.map(entry => ({
      status: entry.status,
      updatedAt: entry.updatedAt,
      comment: entry.comment,
    }));

    res.json({
      success: true,
      data: {
        referenceNumber: request.referenceNumber,
        status: request.status,
        statusLabel: request.statusLabel,
        submittedAt: request.createdAt,
        lastUpdate: request.updatedAt,
        requesterName: `${request.firstName} ${request.lastName}`,
        projectTitle: request.projectTitle,
        publicComment: request.publicComment,
        statusHistory: publicHistory,
      },
    });

  } catch (error) {
    console.error('Erreur lors du suivi:', error);
    res.status(500).json({ 
      error: 'Erreur lors du suivi de la demande',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/microdata-requests/verify-email/:email
 * @desc    Vérifier si un email a déjà des demandes en cours
 * @access  Public
 */
router.get('/verify-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const activeRequests = await MicrodataRequest.find({ 
      email: email.toLowerCase(),
      status: { $in: ['soumis', 'en_cours_verification', 'en_cours_validation', 'information_complementaire'] }
    })
    .select('referenceNumber status createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      success: true,
      hasActiveRequests: activeRequests.length > 0,
      activeRequests: activeRequests.map(req => ({
        referenceNumber: req.referenceNumber,
        status: req.status,
        submittedAt: req.createdAt,
      })),
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// === ROUTES ADMINISTRATEUR ===

/**
 * @route   GET /api/microdata-requests/admin
 * @desc    Obtenir toutes les demandes (avec filtres et pagination)
 * @access  Private/Admin
 */
router.get('/api/microdata-requests/admin', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Construire le filtre
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { referenceNumber: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { institution: new RegExp(search, 'i') },
        { projectTitle: new RegExp(search, 'i') },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Requête
    const [requests, total] = await Promise.all([
      MicrodataRequest.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      MicrodataRequest.countDocuments(filter),
    ]);

    // Statistiques rapides
    const stats = await MicrodataRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
      stats: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });

  } catch (error) {
    console.error('Erreur liste admin:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

/**
 * @route   GET /api/microdata-requests/admin/:id
 * @desc    Obtenir les détails complets d'une demande
 * @access  Private/Admin
 */
router.get('/api/microdata-requests/admin/:id', async (req, res) => {
  try {
    const request = await MicrodataRequest.findById(req.params.id)
      .populate('statusHistory.updatedBy', 'firstName lastName email')
      .populate('internalNotes.addedBy', 'firstName lastName')
      .populate('decidedBy', 'firstName lastName email');

    if (!request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    res.json({
      success: true,
      data: request,
    });

  } catch (error) {
    console.error('Erreur détails demande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
  }
});

/**
 * @route   PATCH /api/microdata-requests/admin/:id/status
 * @desc    Mettre à jour le statut d'une demande
 * @access  Private/Admin
 */
router.patch('/api/microdata-requests/admin/:id/status', async (req, res) => {
  try {
    const { status, comment, publicComment } = req.body;

    const request = await MicrodataRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    // Mettre à jour le statut avec l'historique
    const userId = req.user?._id || req.session?.user?._id; // À adapter selon votre système d'auth
    request.addStatusHistory(status, userId, comment);

    if (publicComment) {
      request.publicComment = publicComment;
    }

    // Si approuvé ou refusé, enregistrer la décision
    if (status === 'approuve' || status === 'refuse') {
      request.decidedAt = new Date();
      request.decidedBy = userId;
    }

    await request.save();

    // TODO: Envoyer un email de notification au demandeur
    // sendStatusUpdateEmail(request);

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: {
        referenceNumber: request.referenceNumber,
        status: request.status,
        statusLabel: request.statusLabel,
        updatedAt: request.updatedAt,
      },
    });

  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

/**
 * @route   POST /api/microdata-requests/admin/:id/notes
 * @desc    Ajouter une note interne à une demande
 * @access  Private/Admin
 */
router.post('/api/microdata-requests/admin/:id/notes', async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'La note ne peut pas être vide' });
    }

    const request = await MicrodataRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const userId = req.user?._id || req.session?.user?._id;
    request.addInternalNote(note, userId);
    await request.save();

    res.json({
      success: true,
      message: 'Note ajoutée avec succès',
    });

  } catch (error) {
    console.error('Erreur ajout note:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la note' });
  }
});

/**
 * @route   DELETE /api/microdata-requests/admin/:id
 * @desc    Supprimer une demande (soft delete recommandé)
 * @access  Private/Admin
 */
router.delete('/api/microdata-requests/admin/:id', async (req, res) => {
  try {
    const request = await MicrodataRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    // Option 1: Soft delete (recommandé)
    // request.status = 'deleted';
    // await request.save();

    // Option 2: Hard delete
    await MicrodataRequest.findByIdAndDelete(req.params.id);

    // Supprimer les fichiers associés
    if (request.attachments.length > 0) {
      for (const attachment of request.attachments) {
        try {
          await fs.unlink(attachment.path);
        } catch (unlinkError) {
          console.error('Erreur suppression fichier:', unlinkError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Demande supprimée avec succès',
    });

  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * @route   GET /api/microdata-requests/admin/stats/overview
 * @desc    Obtenir des statistiques globales
 * @access  Private/Admin
 */
router.get('/api/microdata-requests/admin/stats/overview', async (req, res) => {
  try {
    const [totalRequests, statusBreakdown, recentRequests, monthlyStats] = await Promise.all([
      // Total des demandes
      MicrodataRequest.countDocuments(),
      
      // Répartition par statut
      MicrodataRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Demandes récentes (7 derniers jours)
      MicrodataRequest.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      
      // Statistiques mensuelles (12 derniers mois)
      MicrodataRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalRequests,
        recentRequests,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyStats,
      },
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;