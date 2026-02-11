const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectamos a la base de datos
const dbPath = path.resolve(__dirname, '../../unefa.db'); // Ajusta la ruta si es necesario
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite (unefa.db)');
    // IMPORTANTE: Activar Foreign Keys (SQLite las tiene desactivadas por defecto)
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error activando foreign keys:', err.message);
      } else {
        console.log('Foreign Keys ACTIVADAS correctamente.');
      }
      initDb();
    });
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
      current_semester_id INTEGER,
      score REAL DEFAULT 0,
      photo_url TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 3. Perfiles Docentes
    db.run(`CREATE TABLE IF NOT EXISTS teacher_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT,
      assigned_semester_id INTEGER,
      photo_url TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // 8. INTENTOS DEL QUIZ
    db.run(`CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      semester_id INTEGER,
      attempts_used INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 2,
      last_attempt_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    console.log('Tablas del sistema verificadas/actualizadas.');

    // MIGRACIÓN AUTOMÁTICA: Limpiar datos huérfanos al arrancar
    cleanOrphanedData();
  });
}

function cleanOrphanedData() {
  console.log('--- Ejecutando limpieza de datos huérfanos ---');

  // 1. Perfiles de estudiantes sin usuario asociado
  db.run(
    `DELETE FROM student_profiles WHERE user_id NOT IN (SELECT id FROM users)`,
    function (err) {
      if (!err && this.changes > 0) {
        console.log(`Limpieza: ${this.changes} perfil(es) de estudiante huérfano(s) eliminado(s).`);
      }
    }
  );

  // 2. Perfiles de docentes sin usuario asociado
  db.run(
    `DELETE FROM teacher_profiles WHERE user_id NOT IN (SELECT id FROM users)`,
    function (err) {
      if (!err && this.changes > 0) {
        console.log(`Limpieza: ${this.changes} perfil(es) de docente huérfano(s) eliminado(s).`);
      }
    }
  );

  // 3. Intentos de quiz sin usuario asociado
  db.run(
    `DELETE FROM quiz_attempts WHERE user_id NOT IN (SELECT id FROM users)`,
    function (err) {
      if (!err && this.changes > 0) {
        console.log(`Limpieza: ${this.changes} intento(s) de quiz huérfano(s) eliminado(s).`);
      }
    }
  );

  // 4. Posts del foro sin usuario asociado
  db.run(
    `DELETE FROM forum_posts WHERE user_id NOT IN (SELECT id FROM users)`,
    function (err) {
      if (!err && this.changes > 0) {
        console.log(`Limpieza: ${this.changes} post(s) del foro huérfano(s) eliminado(s).`);
      }
    }
  );

  console.log('--- Limpieza de datos huérfanos completada ---');
}

module.exports = db;