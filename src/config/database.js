const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectamos a la base de datos
const dbPath = path.resolve(__dirname, '../../unefa.db'); // Ajusta la ruta si es necesario
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite (unefa.db)');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // 1. Tabla Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT
    )`);

    // 2. Perfiles Estudiantes
    db.run(`CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      cedula TEXT,
      career TEXT,
      current_semester_id INTEGER, -- ¡IMPORTANTE!
      score REAL DEFAULT 0,
      photo_url TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. Perfiles Docentes
    db.run(`CREATE TABLE IF NOT EXISTS teacher_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT,
      assigned_semester_id INTEGER, -- ¡IMPORTANTE!
      photo_url TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 4. Semestres (Catálogo)
    db.run(`CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY,
      name TEXT,
      code TEXT
    )`);

    // 5. PUBLICACIONES (NOTICIAS)
    // ¡AQUÍ ESTABA EL PROBLEMA! Faltaba semester_id
    db.run(`CREATE TABLE IF NOT EXISTS publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      author_id INTEGER,
      semester_id INTEGER, -- ¡ESTA LÍNEA ES VITAL!
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      file_attachment_url TEXT,
      FOREIGN KEY(author_id) REFERENCES users(id)
    )`);

    // 6. PREGUNTAS (QUIZZES)
    // ¡AQUÍ TAMBIÉN! Faltaba semester_id
    db.run(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT,
      options TEXT, -- Se guarda como JSON string
      correct_answer TEXT,
      semester_id INTEGER, -- ¡ESTA LÍNEA ES VITAL!
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 7. FORO
    // Intenta renombrar la tabla vieja si existe (Migración automática)
    db.run(`ALTER TABLE forum_messages RENAME TO forum_posts`, (err) => {
      if (!err) console.log("Tabla forum_messages renombrada a forum_posts");
    });

    db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      user_id INTEGER,
      semester_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    console.log('Tablas del sistema verificadas/actualizadas.');
  });
}

module.exports = db;