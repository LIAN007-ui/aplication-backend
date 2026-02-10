const express = require('express');
const router = express.Router();
const publicationController = require('../controllers/publicationController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST: Crear publicación (archivo como Base64 en JSON body)
router.post('/', verifyToken, publicationController.createPublication);

// GET: Obtener por semestre
router.get('/semester/:semester_id', verifyToken, publicationController.getPublicationsBySemester);

// PUT: Actualizar noticia (archivo como Base64 en JSON body)
router.put('/:id', verifyToken, publicationController.updatePublication);

// DELETE: Eliminar
router.delete('/:id', verifyToken, publicationController.deletePublication);

module.exports = router;