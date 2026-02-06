const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

// POST http://localhost:5000/api/auth/register
router.post('/register', authController.register);

// POST http://localhost:5000/api/auth/login
router.post('/login', authController.login);

// RECUPERACIÓN DE CONTRASEÑA
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// RUTA DE CONFIGURACIÓN INICIAL (Semestres + Admin por defecto)
// GET http://localhost:5000/api/auth/setup
router.get('/setup', (req, res) => {


    const semesters = [
        { id: 1, name: 'Primer Semestre', code: 'SEM-1' },
        { id: 2, name: 'Segundo Semestre', code: 'SEM-2' },
        { id: 3, name: 'Tercer Semestre', code: 'SEM-3' },
        { id: 4, name: 'Cuarto Semestre', code: 'SEM-4' },
        { id: 5, name: 'Quinto Semestre', code: 'SEM-5' },
        { id: 6, name: 'Sexto Semestre', code: 'SEM-6' },
        { id: 7, name: 'Séptimo Semestre', code: 'SEM-7' },
        { id: 8, name: 'Octavo Semestre', code: 'SEM-8' }
    ];

    db.serialize(() => {
        // 1. Crear Semestres
        const stmt = db.prepare("INSERT OR REPLACE INTO semesters (id, name, code) VALUES (?, ?, ?)");
        semesters.forEach(sem => {
            stmt.run(sem.id, sem.name, sem.code);
        });
        stmt.finalize();

        // 2. Crear Admin por Defecto (Si no existe)
        const adminUser = 'admin';
        const adminEmail = 'admin@unefa.edu';
        const adminPass = '123456';
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(adminPass, salt);

        db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            [adminUser, adminEmail, hash, 'admin']
        );

        // 3. Crear Admin Solicitado (Cédula: 12973249)
        const admin2User = '12973249';
        const admin2Email = '12973249@unefa.edu';
        const admin2Pass = 'admin2026';
        const hash2 = bcrypt.hashSync(admin2Pass, salt);

        db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            [admin2User, admin2Email, hash2, 'admin'],
            function (err) {
                // CORRECCION AUTOMATICA: Si ya existía con puntos, lo actualizamos a sin puntos
                db.run(`UPDATE users SET username = ? WHERE email = ?`, [admin2User, admin2Email]);

                if (err) {
                    console.error(err.message);
                    res.status(500).send('Error creando admin');
                } else {
                    res.send(`
                <h1>Configuración Exitosa</h1>
                <p>1. Semestres (1-8) creados.</p>
                <p>2. Usuarios Admin creados:</p>
                <ul>
                    <li>Usuario: <b>admin</b> | Pass: <b>123456</b></li>
                    <li>Usuario: <b>12.973.249</b> | Pass: <b>admin2026</b></li>
                </ul>
                <a href="http://localhost:3000/login">Ir al Login</a>
            `);
                }
            }
        );
    });
});

module.exports = router;