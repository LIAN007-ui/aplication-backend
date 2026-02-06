const express = require('express');
const router = express.Router();
const publicationController = require('../controllers/publicationController');
const upload = require('../middleware/uploadMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, upload.single('file'), publicationController.createPublication);
// GET: Obtener por semestre
router.get('/semester/:semester_id', verifyToken, publicationController.getPublicationsBySemester);

// PUT: Actualizar noticia (texto + archivo opcional)
router.put('/:id', verifyToken, upload.single('file'), publicationController.updatePublication);

// DELETE: Eliminar
router.delete('/:id', verifyToken, publicationController.deletePublication);

module.exports = router;