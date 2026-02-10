const express = require('express');
const router = express.Router();
const quizAttemptController = require('../controllers/quizAttemptController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Obtener intentos de un usuario en un semestre
router.get('/:userId/:semesterId', verifyToken, quizAttemptController.getAttempts);

// Registrar un intento (estudiante termina una partida)
router.post('/register', verifyToken, quizAttemptController.registerAttempt);

// Resetear intentos (solo docente o admin)
router.post('/reset', verifyToken, verifyRole(['teacher', 'admin']), quizAttemptController.resetAttempts);

module.exports = router;
