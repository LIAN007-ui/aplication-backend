const db = require('../config/database');

// 1. OBTENER INTENTOS DE UN USUARIO EN UN SEMESTRE
exports.getAttempts = (req, res) => {
    const { userId, semesterId } = req.params;

    const query = `SELECT attempts_used, max_attempts FROM quiz_attempts WHERE user_id = ? AND semester_id = ?`;

    db.get(query, [userId, semesterId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!row) {
            return res.json({ attempts_used: 0, max_attempts: 2 });
        }

        res.json({ attempts_used: row.attempts_used, max_attempts: row.max_attempts });
    });
};

// 2. REGISTRAR UN INTENTO (incrementar en 1)
exports.registerAttempt = (req, res) => {
    const { user_id, semester_id } = req.body;

    if (!user_id || !semester_id) {
        return res.status(400).json({ error: 'user_id y semester_id son obligatorios' });
    }

    const checkQuery = `SELECT * FROM quiz_attempts WHERE user_id = ? AND semester_id = ?`;

    db.get(checkQuery, [user_id, semester_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!row) {
            const insertQuery = `INSERT INTO quiz_attempts (user_id, semester_id, attempts_used, max_attempts, last_attempt_at) VALUES (?, ?, 1, 2, datetime('now'))`;
            db.run(insertQuery, [user_id, semester_id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ attempts_used: 1, max_attempts: 2, message: 'Intento registrado' });
            });
        } else {
            if (row.attempts_used >= row.max_attempts) {
                return res.status(403).json({ error: 'Has agotado tus intentos', attempts_used: row.attempts_used, max_attempts: row.max_attempts });
            }

            const updateQuery = `UPDATE quiz_attempts SET attempts_used = attempts_used + 1, last_attempt_at = datetime('now') WHERE user_id = ? AND semester_id = ?`;
            db.run(updateQuery, [user_id, semester_id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ attempts_used: row.attempts_used + 1, max_attempts: row.max_attempts, message: 'Intento registrado' });
            });
        }
    });
};

// 3. RESETEAR INTENTOS (Docente da otra oportunidad)
exports.resetAttempts = (req, res) => {
    const { user_id, semester_id } = req.body;

    if (!user_id || !semester_id) {
        return res.status(400).json({ error: 'user_id y semester_id son obligatorios' });
    }

    const query = `UPDATE quiz_attempts SET attempts_used = 0, last_attempt_at = NULL WHERE user_id = ? AND semester_id = ?`;

    db.run(query, [user_id, semester_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (this.changes === 0) {
            return res.json({ message: 'El estudiante no tenía intentos registrados (ya puede jugar)' });
        }

        res.json({ message: 'Intentos reseteados correctamente' });
    });
};
