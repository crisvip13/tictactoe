const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  jugador1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jugador2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  apuesta: { type: Number, required: true },
  tablero: { type: [[String]], default: Array(5).fill().map(() => Array(5).fill('')) },
  turno: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  estado: { type: String, enum: ['esperando', 'en_juego', 'finalizada'], default: 'esperando' },
  
  // 👇 AÑADE ESTA PARTE 👇
  movimientos: [
    {
      jugador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      index: { type: Number }
    }
  ],

  ganador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
