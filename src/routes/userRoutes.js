// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// ==========================================
// RUTAS DE USUARIOS
// Todas requieren Token (Estar logueado)
// ==========================================

// 1. OBTENER MI PERFIL
// Usado por: Estudiantes y Docentes al iniciar sesión
// GET http://localhost:5000/api/users/profile
router.get('/profile', verifyToken, userController.getProfile);

// 2. OBTENER ESTUDIANTES DE UN SEMESTRE ESPECÍFICO
// Usado por: Dashboard del Docente (para ver notas de sus alumnos)
// GET http://localhost:5000/api/users/students/semester/:semester_id
router.get('/students/semester/:semester_id', verifyToken, userController.getStudentsBySemester);

// 3. OBTENER TODOS LOS USUARIOS (ESTUDIANTES Y DOCENTES)
// Usado por: Dashboard del Administrador (estadísticas globales)
// GET http://localhost:5000/api/users/all
router.get('/all', verifyToken, userController.getAllUsers);


// 4. OBTENER USUARIO POR ID (Para Profile.jsx)
router.get('/:id', userController.getUserById);

// 5. ACTUALIZAR USUARIO (Edición completa: Datos + Password + Perfil)
router.put('/:id', verifyToken, userController.updateUser);
// NUEVO: Rutas de Escritura (SOLO ADMIN)
// POST http://localhost:5000/api/users/create
router.post('/create', verifyToken, verifyRole(['admin']), userController.createUser);

// DELETE http://localhost:5000/api/users/:id
router.delete('/:id', verifyToken, verifyRole(['admin', 'teacher']), userController.deleteUser);

module.exports = router;