// src/controllers/authController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'secret_super_seguro_unefa';

exports.register = (req, res) => {
    const { username, email, password, role, ...profileData } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (username, email, password, role)' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const queryUser = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;

    db.run(queryUser, [username, email, hash, role], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'El usuario o el correo ya están registrados.' });
            }
            return res.status(500).json({ error: 'Error en la base de datos: ' + err.message });
        }

        const userId = this.lastID;

        if (role === 'student') {
            const { first_name, last_name, cedula, career, current_semester_id } = profileData;

            if (!first_name || !cedula) {
                return res.status(400).json({ error: 'Faltan datos del perfil de estudiante' });
            }

            const queryStudent = `INSERT INTO student_profiles (user_id, first_name, last_name, cedula, career, current_semester_id) VALUES (?, ?, ?, ?, ?, ?)`;

            db.run(queryStudent, [userId, first_name, last_name, cedula, career, current_semester_id], (err) => {
                if (err) return res.status(500).json({ error: 'Error creando perfil estudiante: ' + err.message });
                res.status(201).json({ message: 'Estudiante registrado exitosamente', userId });
            });

        } else if (role === 'teacher') {
            const { full_name, assigned_semester_id } = profileData;

            const queryTeacher = `INSERT INTO teacher_profiles (user_id, full_name, assigned_semester_id) VALUES (?, ?, ?)`;

            db.run(queryTeacher, [userId, full_name, assigned_semester_id], (err) => {
                if (err) return res.status(500).json({ error: 'Error creando perfil docente: ' + err.message });
                res.status(201).json({ message: 'Docente registrado exitosamente', userId });
            });

        } else if (role === 'admin') {
            res.status(201).json({ message: 'Administrador registrado exitosamente', userId });
        } else {
            res.status(400).json({ error: 'Rol no válido' });
        }
    });
};

exports.login = (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Debes ingresar usuario/correo y contraseña' });
    }

    const query = `SELECT * FROM users WHERE email = ? OR username = ?`;

    db.get(query, [identifier, identifier], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            SECRET_KEY,
            { expiresIn: '10m' }
        );

        let profileQuery = '';
        if (user.role === 'student') profileQuery = `SELECT * FROM student_profiles WHERE user_id = ?`;
        if (user.role === 'teacher') profileQuery = `SELECT * FROM teacher_profiles WHERE user_id = ?`;

        if (profileQuery) {
            db.get(profileQuery, [user.id], (err, profile) => {
                if (err) return res.status(500).json({ error: 'Error al obtener perfil' });

                res.json({
                    message: 'Login exitoso',
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        ...profile
                    }
                });
            });
        } else {
            res.json({
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        }
    });
};

exports.forgotPassword = (req, res) => {
    const { email, security_answer, type } = req.body;

    if (!email || !security_answer || !type) return res.status(400).json({ error: 'Faltan datos.' });

    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
    db.get(query, [email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Correo no registrado.' });

        if (type === 'student' && user.role !== 'student') {
            return res.status(400).json({ error: 'Este correo no pertenece a un Estudiante.' });
        }
        if (type === 'teacher' && user.role === 'student') {
            return res.status(400).json({ error: 'Este correo es de Estudiante. Selecciona la opción "Soy Estudiante".' });
        }

        const sendToken = () => {
            const resetToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '5m' });
            res.json({ success: true, token: resetToken, message: 'Identidad verificada.' });
        };

        if (user.role === 'student') {
            db.get('SELECT cedula FROM student_profiles WHERE user_id = ?', [user.id], (err, profile) => {
                if (err || !profile) return res.status(400).json({ error: 'Perfil no encontrado.' });

                const dbCedula = String(profile.cedula).replace(/\D/g, '');
                const inputCedula = String(security_answer).replace(/\D/g, '');

                if (dbCedula !== inputCedula) {
                    return res.status(400).json({ error: 'La Cédula no coincide con este correo.' });
                }
                sendToken();
            });
        } else {
            const dbUser = String(user.username).trim().toLowerCase();
            const inputUser = String(security_answer).trim().toLowerCase();

            if (dbUser !== inputUser) {
                return res.status(400).json({ error: 'El Usuario no coincide con este correo.' });
            }
            sendToken();
        }
    });
};

exports.resetPassword = (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Faltan datos.' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(400).json({ error: 'El enlace ha expirado o es inválido. Solicita uno nuevo.' });

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);

        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, decoded.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
        });
    });
};