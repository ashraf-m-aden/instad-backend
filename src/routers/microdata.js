const express = require('express');
const router = express.Router();
const Microdata = require('../models/microdata.model');

// === MIDDLEWARE D'AUTHENTIFICATION ===

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  // TODO: Implémenter votre logique d'authentification admin
  if (req.headers.authorization === 'Bearer ADMIN_TOKEN' || req.session?.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès non autorisé' });
  }
};

// === ROUTES PUBLIQUES ===

/**
 * @route   GET /api/microdata/catalog
 * @desc    Obtenir le catalogue des micro-données publiées
 * @access  Public
 */
router.get('/catalog', async (req, res) => {
  try {
    const {
      search,
      type,
      category,
      year,
      accessType,
      sortBy = 'recent',
      page = 1,
      limit = 100,
    } = req.query;

    // Construire le filtre
    const filters = {
      search,
      type,
      category,
      year,
      accessType,
      availableOnly: true, // Uniquement les datasets disponibles
    };

    // Recherche
    let query = await Microdata.advancedSearch(filters);

    // Tri
    switch (sortBy) {
      case 'recent':
        query = query.sort({ publishedDate: -1 });
        break;
      case 'alpha':
        query = query.sort({ title: 1 });
        break;
      case 'popular':
        query = query.sort({ 'stats.downloads': -1 });
        break;
      case 'year':
        query = query.sort({ 'coveragePeriod.endDate': -1 });
        break;
      default:
        query = query.sort({ publishedDate: -1 });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Microdata.countDocuments(query.getFilter());

    const datasets = await query
      .skip(skip)
      .limit(parseInt(limit))
      .select('-internalNotes -__v')
      .lean();

    // Statistiques globales
    const stats = await Microdata.getStatistics();

    res.json({
      success: true,
      data: datasets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
      stats,
    });

  } catch (error) {
    console.error('Erreur récupération catalogue:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du catalogue',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/microdata/:code
 * @desc    Obtenir les détails d'un dataset par son code
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const dataset = await Microdata.findOne({
      code: code.toUpperCase(),
      status: 'published',
    })
      .select('-internalNotes -__v')
      .lean();

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    // Incrémenter les vues
    await Microdata.findByIdAndUpdate(dataset._id, {
      $inc: { 'stats.views': 1 },
      $set: { 'stats.lastAccessed': new Date() },
    });

    res.json({
      success: true,
      data: dataset,
    });

  } catch (error) {
    console.error('Erreur récupération dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des détails',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/microdata/:code/request-access
 * @desc    Enregistrer une demande d'accès à un dataset
 * @access  Public
 */
router.post('/:code/request-access', async (req, res) => {
  try {
    const { code } = req.params;

    const dataset = await Microdata.findOne({
      code: code.toUpperCase(),
      status: 'published',
    });

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    if (!dataset.isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Ce dataset n\'est pas disponible actuellement',
      });
    }

    // Incrémenter le compteur de demandes
    await dataset.incrementRequests();

    // TODO: Créer une demande dans MicrodataRequest liée à ce dataset

    res.json({
      success: true,
      message: 'Demande d\'accès enregistrée',
      datasetCode: dataset.code,
      datasetTitle: dataset.title,
    });

  } catch (error) {
    console.error('Erreur demande d\'accès:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement de la demande',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/microdata/stats/overview
 * @desc    Obtenir les statistiques globales du catalogue
 * @access  Public
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Microdata.getStatistics();

    // Statistiques supplémentaires
    const recentDatasets = await Microdata.find({ status: 'published' })
      .sort({ publishedDate: -1 })
      .limit(5)
      .select('code title publishedDate')
      .lean();

    const popularDatasets = await Microdata.find({ status: 'published' })
      .sort({ 'stats.downloads': -1 })
      .limit(5)
      .select('code title stats.downloads')
      .lean();

    res.json({
      success: true,
      data: {
        ...stats,
        recentDatasets,
        popularDatasets,
      },
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/microdata/search/autocomplete
 * @desc    Autocomplete pour la recherche
 * @access  Public
 */
router.get('/search/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const regex = new RegExp(q, 'i');

    const suggestions = await Microdata.find({
      status: 'published',
      $or: [
        { title: regex },
        { code: regex },
        { tags: regex },
      ],
    })
      .select('code title type')
      .limit(10)
      .lean();

    res.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error('Erreur autocomplete:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'autocomplete',
    });
  }
});

// === ROUTES ADMIN ===

/**
 * @route   GET /api/microdata/admin/all
 * @desc    Obtenir tous les datasets (y compris drafts et archived)
 * @access  Private/Admin
 */
router.get('/admin/all', isAdmin, async (req, res) => {
  try {
    const {
      status,
      search,
      type,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    // Construire le filtre
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    // Pagination et tri
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [datasets, total] = await Promise.all([
      Microdata.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .populate('createdBy', 'firstName lastName email')
        .populate('modifiedBy', 'firstName lastName email')
        .lean(),
      Microdata.countDocuments(filter),
    ]);

    // Statistiques par statut
    const statusStats = await Microdata.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: datasets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
      stats: statusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });

  } catch (error) {
    console.error('Erreur liste admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des datasets',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/microdata/admin/:id
 * @desc    Obtenir les détails complets d'un dataset (admin)
 * @access  Private/Admin
 */
router.get('/admin/:id', isAdmin, async (req, res) => {
  try {
    const dataset = await Microdata.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('modifiedBy', 'firstName lastName email');

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    res.json({
      success: true,
      data: dataset,
    });

  } catch (error) {
    console.error('Erreur détails dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des détails',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/microdata/admin
 * @desc    Créer un nouveau dataset
 * @access  Private/Admin
 */
router.post('/admin', isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      sector,
      coveragePeriod,
      geographicCoverage,
      regions,
      methodology,
      sampleSize,
      variables,
      documentation,
      accessType,
      isAvailable,
      requestRequired,
      accessConditions,
      publishedBy,
      publishedDate,
      status,
      tags,
      keywords,
      citation,
      contact,
      language,
      license,
      internalNotes,
    } = req.body;

    // Validation
    if (!title || !description || !type || !category || !methodology) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires manquants',
        required: ['title', 'description', 'type', 'category', 'methodology'],
      });
    }

    if (!variables || variables.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Au moins une variable doit être définie',
      });
    }

    // Créer le dataset
    const userId = req.user?._id || req.session?.user?._id;
    
    const dataset = new Microdata({
      title,
      description,
      type,
      category,
      sector,
      coveragePeriod,
      geographicCoverage,
      regions,
      methodology,
      sampleSize,
      variables,
      documentation,
      accessType,
      isAvailable,
      requestRequired,
      accessConditions,
      publishedBy: publishedBy || 'DISED',
      publishedDate: publishedDate || new Date(),
      status: status || 'draft',
      tags,
      keywords,
      citation,
      contact,
      language,
      license,
      internalNotes,
      createdBy: userId,
      modifiedBy: userId,
    });

    await dataset.save();

    console.log(`✅ Dataset créé: ${dataset.code} - ${dataset.title}`);

    res.status(201).json({
      success: true,
      message: 'Dataset créé avec succès',
      data: dataset,
    });

  } catch (error) {
    console.error('Erreur création dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du dataset',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/microdata/admin/:id
 * @desc    Mettre à jour un dataset
 * @access  Private/Admin
 */
router.put('/admin/:id', isAdmin, async (req, res) => {
  try {
    const dataset = await Microdata.findById(req.params.id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    // Mettre à jour les champs
    const allowedFields = [
      'title', 'description', 'type', 'category', 'sector',
      'coveragePeriod', 'geographicCoverage', 'regions',
      'methodology', 'sampleSize', 'variables', 'documentation',
      'accessType', 'isAvailable', 'requestRequired', 'accessConditions',
      'publishedBy', 'publishedDate', 'status',
      'tags', 'keywords', 'citation', 'contact', 'language', 'license',
      'internalNotes',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        dataset[field] = req.body[field];
      }
    });

    // Mettre à jour modifiedBy
    const userId = req.user?._id || req.session?.user?._id;
    dataset.modifiedBy = userId;

    await dataset.save();

    console.log(`✅ Dataset mis à jour: ${dataset.code}`);

    res.json({
      success: true,
      message: 'Dataset mis à jour avec succès',
      data: dataset,
    });

  } catch (error) {
    console.error('Erreur mise à jour dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du dataset',
      details: error.message,
    });
  }
});

/**
 * @route   PATCH /api/microdata/admin/:id/status
 * @desc    Changer le statut d'un dataset
 * @access  Private/Admin
 */
router.patch('/admin/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Statut invalide',
        validStatuses: ['draft', 'published', 'archived'],
      });
    }

    const dataset = await Microdata.findById(req.params.id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    dataset.status = status;
    
    const userId = req.user?._id || req.session?.user?._id;
    dataset.modifiedBy = userId;

    await dataset.save();

    console.log(`✅ Statut changé: ${dataset.code} → ${status}`);

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: {
        code: dataset.code,
        status: dataset.status,
      },
    });

  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de statut',
      details: error.message,
    });
  }
});

/**
 * @route   DELETE /api/microdata/admin/:id
 * @desc    Supprimer un dataset (soft delete recommandé)
 * @access  Private/Admin
 */
router.delete('/admin/:id', isAdmin, async (req, res) => {
  try {
    const dataset = await Microdata.findById(req.params.id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset introuvable',
      });
    }

    // Option 1: Soft delete (recommandé) - archiver au lieu de supprimer
    dataset.status = 'archived';
    await dataset.save();

    // Option 2: Hard delete (décommenter si nécessaire)
    // await Microdata.findByIdAndDelete(req.params.id);

    console.log(`✅ Dataset archivé: ${dataset.code}`);

    res.json({
      success: true,
      message: 'Dataset archivé avec succès',
    });

  } catch (error) {
    console.error('Erreur suppression dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du dataset',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/microdata/admin/bulk-import
 * @desc    Import en masse de datasets
 * @access  Private/Admin
 */
router.post('/admin/bulk-import', isAdmin, async (req, res) => {
  try {
    const { datasets } = req.body;

    if (!Array.isArray(datasets) || datasets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Un tableau de datasets est requis',
      });
    }

    const userId = req.user?._id || req.session?.user?._id;
    const results = [];
    const errors = [];

    for (const data of datasets) {
      try {
        const dataset = new Microdata({
          ...data,
          createdBy: userId,
          modifiedBy: userId,
        });
        await dataset.save();
        results.push(dataset.code);
      } catch (error) {
        errors.push({
          title: data.title,
          error: error.message,
        });
      }
    }

    console.log(`✅ Import terminé: ${results.length} succès, ${errors.length} erreurs`);

    res.json({
      success: true,
      message: `${results.length} dataset(s) importé(s)`,
      imported: results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Erreur import en masse:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'import en masse',
      details: error.message,
    });
  }
});

module.exports = router;