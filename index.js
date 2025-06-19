const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB', err));

// Rutas
app.get('/', (req, res) => {
  res.send('API de Tic Tac Toe Apuestas funcionando');
});

const authRoutes = require('./routes/auth');
console.log('✅ Rutas de autenticación cargadas');

app.use('/api/auth', authRoutes);
const gameRoutes = require('./routes/game');
app.use('/api/game', gameRoutes);


const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));


// 👇 Esto siempre al final
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
