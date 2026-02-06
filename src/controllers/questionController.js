const db = require('../config/database');

// 1. CREAR PREGUNTA
exports.createQuestion = (req, res) => {
    // RECIBIMOS semester_id
    const { question_text, options, correct_answer, semester_id } = req.body;

    if (!question_text || !options || !correct_answer || !semester_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    // Convertimos el array de opciones a texto JSON para guardarlo en SQLite
    const optionsString = JSON.stringify(options);

    const query = `INSERT INTO questions (question_text, options, correct_answer, semester_id) VALUES (?, ?, ?, ?)`;

    db.run(query, [question_text, optionsString, correct_answer, semester_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Pregunta creada' });
    });
};

// 2. OBTENER PREGUNTAS POR SEMESTRE
exports.getQuestionsBySemester = (req, res) => {
    const { semester_id } = req.params;

    const query = `SELECT * FROM questions WHERE semester_id = ?`;

    db.all(query, [semester_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Convertimos el texto JSON de vuelta a Array para el Frontend
        const questions = rows.map(q => ({
            ...q,
            options: JSON.parse(q.options)
        }));

        res.json(questions);
    });
};

// 3. ELIMINAR PREGUNTA
exports.deleteQuestion = (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM questions WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pregunta eliminada' });
    });
};