const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { verifyToken } = require('../middleware/authMiddleware');

// Proteger todas las rutas del foro
router.use(verifyToken);

// GET: Ver mensajes de un semestre (Ej: /api/forum/semester/2)
router.get('/semester/:semester_id', forumController.getPostsBySemester);

// POST: Enviar un nuevo mensaje
router.post('/', forumController.createPost);

// DELETE: Borrar un mensaje por ID
router.delete('/:id', forumController.deletePost);

module.exports = router;