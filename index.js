require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/config/database');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes'); // NUEVO
const publicationRoutes = require('./src/routes/publicationRoutes');
const forumRoutes = require('./src/routes/forumRoutes');
const questionRoutes = require('./src/routes/questionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'https://sistema-unefa.netlify.app',  // Tu Frontend en producción    
    'http://localhost:3000'               // Tu entorno local (si usas otro puerto)
  ]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir carpeta de archivos estáticos (uploads)
// Esto permite acceder a http://localhost:5000/uploads/archivo.jpg
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // NUEVO -> localhost:5000/api/users/profile
app.use('/api/publications', publicationRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/questions', questionRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema UNEFA funcionando', status: 'online' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});