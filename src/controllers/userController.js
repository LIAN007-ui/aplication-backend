const db = require('../config/database');
const bcrypt = require('bcryptjs');

// 1. OBTENER PERFIL DEL USUARIO LOGUEADO
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let query = '';

  if (userRole === 'student') {
    query = `
      SELECT u.id, u.username, u.email, u.role, 
             p.first_name, p.last_name, p.cedula, p.career, p.score, p.photo_url,
             p.current_semester_id,
             s.name as semester_name, s.code as semester_code
      FROM users u
      JOIN student_profiles p ON u.id = p.user_id
      LEFT JOIN semesters s ON p.current_semester_id = s.id
      WHERE u.id = ?
    `;
  } else if (userRole === 'teacher') {
    query = `
      SELECT u.id, u.username, u.email, u.role, 
             p.full_name, p.photo_url,
             p.assigned_semester_id,
             s.name as assigned_semester_name
      FROM users u
      JOIN teacher_profiles p ON u.id = p.user_id
      LEFT JOIN semesters s ON p.assigned_semester_id = s.id
      WHERE u.id = ?
    `;
  } else {
    // Admin
    query = `SELECT id, username, email, role FROM users WHERE id = ?`;
  }

  db.get(query, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json(row);
  });
};

// 2. OBTENER ESTUDIANTES POR SEMESTRE (Para Docentes)
exports.getStudentsBySemester = (req, res) => {
  const { semester_id } = req.params;
  const query = `
    SELECT u.id, u.email,
           p.first_name as nombre, p.last_name as apellido,
           p.cedula, p.score as puntuacion, p.photo_url as foto
    FROM users u
    JOIN student_profiles p ON u.id = p.user_id
    WHERE p.current_semester_id = ?
    ORDER BY p.score DESC
  `;
  db.all(query, [semester_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// 3. OBTENER TODOS LOS USUARIOS (Para Admin y Docente - Sin filtro backend por ahora)
exports.getAllUsers = (req, res) => {
  const query = `
    SELECT u.id, u.role, u.email, u.username,
           sp.first_name, sp.last_name, sp.score, sp.cedula, sp.career, sp.photo_url,
           s.id as student_semester_id, s.name as student_semester_name,
           tp.full_name, 
           ts.id as teacher_semester_id, ts.name as teacher_semester_name
    FROM users u
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    LEFT JOIN semesters s ON sp.current_semester_id = s.id
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    LEFT JOIN semesters ts ON tp.assigned_semester_id = ts.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Normalizamos los datos para el frontend
    const users = rows.map(user => ({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
      // Datos especificos de estudiante
      nombre: user.role === 'student' ? user.first_name : (user.full_name || user.username),
      apellido: user.role === 'student' ? user.last_name : '',
      cedula: user.cedula || '',
      carrera: user.career || '',
      // Aquí es donde está la clave: devolvemos el NOMBRE del semestre tal cual está en DB
      semestre: user.role === 'student' ? user.student_semester_name : user.teacher_semester_name,
      puntuacion: user.score || 0,
      foto: user.photo_url || null,
      semestre_id: user.student_semester_id || user.teacher_semester_id,
      assignedSemester: user.teacher_semester_name // Devolvemos el NOMBRE para el docente también
    }));
    res.json(users);
  });
};

// 4. CREAR USUARIO (Solo Admin)
exports.createUser = (req, res) => {
  const { username, email, password, role, ...profileData } = req.body;

  // 1. Validaciones Generales
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (Usuario, Email, Password, Rol).' });
  }

  // 2. Validación OBLIGATORIA de Semestre (Sin valores por defecto)
  if (role === 'student') {
    if (!profileData.current_semester_id) {
      return res.status(400).json({ error: 'Seguridad: Es OBLIGATORIO asignar un semestre al estudiante.' });
    }
  }
  if (role === 'teacher') {
    if (!profileData.assigned_semester_id) {
      return res.status(400).json({ error: 'Seguridad: Es OBLIGATORIO asignar un semestre al docente.' });
    }
  }

  // 3. VALIDACIÓN PREVIA: Verificar cédula duplicada ANTES de crear usuario
  if (role === 'student' && profileData.cedula) {
    const cedulaLimpia = String(profileData.cedula).replace(/\D/g, '');

    db.get(
      `SELECT sp.cedula FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE REPLACE(REPLACE(REPLACE(sp.cedula, 'V-', ''), 'E-', ''), '.', '') = ?`,
      [cedulaLimpia],
      (err, existing) => {
        if (existing) {
          return res.status(400).json({ error: 'La cédula ya está registrada en el sistema.' });
        }
        // Cédula libre, proceder
        proceedWithCreateUser(res, username, email, password, role, profileData);
      }
    );
  } else {
    proceedWithCreateUser(res, username, email, password, role, profileData);
  }
};

function proceedWithCreateUser(res, username, email, password, role, profileData) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const queryUser = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;

  db.run(queryUser, [username, email, hash, role], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario o correo ya existe en el sistema.' });
      return res.status(500).json({ error: err.message });
    }

    const userId = this.lastID;

    if (role === 'student') {
      const { first_name, last_name, cedula, career, current_semester_id } = profileData;
      const queryStudent = `INSERT INTO student_profiles (user_id, first_name, last_name, cedula, career, current_semester_id) VALUES (?, ?, ?, ?, ?, ?)`;

      db.run(queryStudent, [userId, first_name, last_name, cedula, career, current_semester_id], (err) => {
        if (err) {
          // ROLLBACK: Si falla el perfil, eliminar el usuario huérfano
          db.run(`DELETE FROM users WHERE id = ?`, [userId]);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Estudiante creado exitosamente' });
      });

    } else if (role === 'teacher') {
      const { full_name, assigned_semester_id } = profileData;
      const queryTeacher = `INSERT INTO teacher_profiles (user_id, full_name, assigned_semester_id) VALUES (?, ?, ?)`;

      db.run(queryTeacher, [userId, full_name, assigned_semester_id], (err) => {
        if (err) {
          // ROLLBACK: Si falla el perfil, eliminar el usuario huérfano
          db.run(`DELETE FROM users WHERE id = ?`, [userId]);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Docente creado exitosamente' });
      });

    } else {
      res.status(201).json({ message: 'Administrador creado exitosamente' });
    }
  });
}

// 5. ELIMINAR USUARIO (con limpieza completa de datos relacionados)
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  // Primero eliminamos todos los datos relacionados para evitar perfiles huérfanos
  db.serialize(() => {
    // Eliminar perfil de estudiante si existe
    db.run(`DELETE FROM student_profiles WHERE user_id = ?`, [id]);
    // Eliminar perfil de docente si existe
    db.run(`DELETE FROM teacher_profiles WHERE user_id = ?`, [id]);
    // Eliminar intentos de quiz si existen
    db.run(`DELETE FROM quiz_attempts WHERE user_id = ?`, [id]);
    // Eliminar posts del foro si existen
    db.run(`DELETE FROM forum_posts WHERE user_id = ?`, [id]);

    // Finalmente eliminar el usuario base
    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ message: 'Eliminado correctamente' });
    });
  });
};

// 6. OBTENER USUARIO POR ID (Para Profile.jsx)
exports.getUserById = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT u.id, u.username, u.email, u.role,
           sp.first_name, sp.last_name, sp.cedula, sp.photo_url, sp.career, sp.score,
           tp.full_name, tp.photo_url as teacher_photo
    FROM users u
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    WHERE u.id = ?
  `;
  db.get(query, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });

    let responseData = {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role
    };

    if (row.role === 'student') {
      responseData = {
        ...responseData,
        first_name: row.first_name,
        last_name: row.last_name,
        cedula: row.cedula,
        photo_url: row.photo_url,
        career: row.career,
        score: row.score
      };
    } else if (row.role === 'teacher') {
      responseData = {
        ...responseData,
        full_name: row.full_name,
        photo_url: row.teacher_photo
      };
    }

    res.json(responseData);
  });
};

// 7. ACTUALIZAR USUARIO (Full Update - PUT/PATCH)
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const {
    username, email, password, // Campos tabla 'users'
    first_name, last_name, cedula, career, current_semester_id, score, // Campos 'student_profiles'
    full_name, assigned_semester_id, // Campos 'teacher_profiles'
    photo_url
  } = req.body;

  db.serialize(() => {
    // 1. Prepara hash de contraseña si se envió
    let passwordHash = null;
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    // 2. Actualizar tabla base 'users'
    // La consulta maneja actualizaciones condicionales
    const updateUsersQuery = `
        UPDATE users SET 
            username = COALESCE(?, username), 
            email = COALESCE(?, email),
            password_hash = COALESCE(?, password_hash)
        WHERE id = ?
    `;

    // Pasamos passwordHash solo si existe (si es null, COALESCE mantiene el valor viejo)
    // Pero COALESCE(NULL, val) = val. Si passwordHash es null, usa password_hash actual.
    db.run(updateUsersQuery, [username, email, passwordHash, id], (err) => {
      if (err) console.error("Error actualizando users:", err.message);

      // 3. Determinar rol para actualizar perfil específico
      db.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
        if (err) return;
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (user.role === 'student') {
          const query = `
                    UPDATE student_profiles SET 
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        cedula = COALESCE(?, cedula),
                        career = COALESCE(?, career),
                        current_semester_id = COALESCE(?, current_semester_id),
                        score = COALESCE(?, score),
                        photo_url = COALESCE(?, photo_url)
                    WHERE user_id = ?
                `;
          db.run(query, [first_name, last_name, cedula, career, current_semester_id, score, photo_url, id], (err) => {
            if (err) return res.status(500).json({ error: "Error actualizando estudiante: " + err.message });
            res.json({ message: 'Estudiante actualizado correctamente' });
          });

        } else if (user.role === 'teacher') {
          const query = `
                    UPDATE teacher_profiles SET 
                        full_name = COALESCE(?, full_name),
                        assigned_semester_id = COALESCE(?, assigned_semester_id),
                        photo_url = COALESCE(?, photo_url)
                    WHERE user_id = ?
                `;
          db.run(query, [full_name, assigned_semester_id, photo_url, id], (err) => {
            if (err) return res.status(500).json({ error: "Error actualizando docente: " + err.message });
            res.json({ message: 'Docente actualizado correctamente' });
          });

        } else {
          res.json({ message: 'Usuario actualizado correctamente' });
        }
      });
    });
  });
};