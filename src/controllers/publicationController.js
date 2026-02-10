const db = require('../config/database');

// 1. CREAR PUBLICACIÓN
exports.createPublication = (req, res) => {
    const { title, content, semester_id, file_data } = req.body;
    const author_id = req.user.id;

    if (!title || !content || !semester_id) {
        return res.status(400).json({ error: 'Faltan datos (título, contenido o semestre).' });
    }

    // file_data es un string Base64 que viene del frontend (data:image/png;base64,... o data:application/pdf;base64,...)
    const fileUrl = file_data || null;

    const query = `INSERT INTO publications (title, content, author_id, semester_id, file_attachment_url) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [title, content, author_id, semester_id, fileUrl], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            id: this.lastID,
            message: 'Publicación creada',
            file_attachment_url: fileUrl
        });
    });
};

// 2. OBTENER PUBLICACIONES POR SEMESTRE
exports.getPublicationsBySemester = (req, res) => {
    const { semester_id } = req.params;

    const query = `
    SELECT p.*, u.username as author_name, tp.full_name as teacher_name
    FROM publications p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    WHERE p.semester_id = ? 
    ORDER BY p.created_at DESC
  `;

    db.all(query, [semester_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// 4. ACTUALIZAR PUBLICACIÓN
exports.updatePublication = (req, res) => {
    const { id } = req.params;
    const { title, content, semester_id, file_data } = req.body;
    const author_id = req.user.id;

    db.get('SELECT * FROM publications WHERE id = ?', [id], (err, post) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });

        if (post.author_id !== author_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para editar esta publicación' });
        }

        // Si se envía file_data, usar ese. Si no, mantener el anterior.
        const fileUrl = file_data !== undefined ? (file_data || null) : post.file_attachment_url;

        const query = `
            UPDATE publications SET 
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                semester_id = COALESCE(?, semester_id),
                file_attachment_url = ?
            WHERE id = ?
        `;

        db.run(query, [title, content, semester_id, fileUrl, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Publicación actualizada correctamente', file_attachment_url: fileUrl });
        });
    });
};

// 3. ELIMINAR PUBLICACIÓN
exports.deletePublication = (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM publications WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Publicación eliminada' });
    });
};