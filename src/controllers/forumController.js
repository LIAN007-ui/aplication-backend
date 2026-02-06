const db = require('../config/database');

// 1. CREAR UN MENSAJE EN EL FORO
exports.createPost = (req, res) => {
    const { content, semester_id } = req.body;
    const user_id = req.user.id; // Viene del token

    if (!content || !semester_id) {
        return res.status(400).json({ error: 'El mensaje y el semestre son obligatorios.' });
    }

    const query = `
    INSERT INTO forum_posts (content, user_id, semester_id)
    VALUES (?, ?, ?)
  `;

    db.run(query, [content, user_id, semester_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Devolvemos el ID del mensaje creado para que el Frontend lo muestre al instante
        res.status(201).json({
            message: 'Mensaje enviado',
            id: this.lastID,
            content,
            user_id,
            semester_id,
            created_at: new Date()
        });
    });
};

// 2. OBTENER MENSAJES POR SEMESTRE (Chat del Aula)
exports.getPostsBySemester = (req, res) => {
    const { semester_id } = req.params;

    // Esta consulta une tablas para saber si el que escribió es Student, Teacher o Admin
    // y trae su nombre real.
    const query = `
    SELECT f.id, f.content, f.created_at, f.user_id,
           u.role,
           COALESCE(s.first_name || ' ' || s.last_name, t.full_name, 'Administrador') as author_name,
           COALESCE(s.photo_url, t.photo_url) as author_photo
    FROM forum_posts f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN student_profiles s ON u.id = s.user_id
    LEFT JOIN teacher_profiles t ON u.id = t.user_id
    WHERE f.semester_id = ?
    ORDER BY f.created_at ASC
  `;

    db.all(query, [semester_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// 3. ELIMINAR MENSAJE (Opcional: Solo el dueño o el Admin)
exports.deletePost = (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    db.get(`SELECT user_id FROM forum_posts WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Mensaje no encontrado' });

        // Solo borras si es tu mensaje O si eres admin
        if (row.user_id !== user_id && user_role !== 'admin') {
            return res.status(403).json({ error: 'No puedes borrar este mensaje' });
        }

        db.run(`DELETE FROM forum_posts WHERE id = ?`, [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Mensaje eliminado' });
        });
    });
};