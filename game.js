const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const Game = require('../models/Game');
const User = require('../models/User');

const router = express.Router();

// Crear una nueva partida
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { apuesta } = req.body;

    if (!apuesta || apuesta < 1) {
      return res.status(400).json({ msg: 'La apuesta mínima es de 1 sol' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (user.saldo < apuesta) {
      return res.status(400).json({ msg: 'Saldo insuficiente para crear esta partida' });
    }

    // Descontar apuesta
    user.saldo -= apuesta;
    await user.save();

    // Crear partida
    const nuevaPartida = new Game({
      jugador1: user._id,
      apuesta,
      turno: user._id
    });

    await nuevaPartida.save();

    res.status(201).json({
      msg: 'Partida creada exitosamente',
      partida: nuevaPartida
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// 🧾 Historial de partidas del usuario logueado
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const partidas = await Game.find({
      $or: [{ jugador1: userId }, { jugador2: userId }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('jugador1', 'username')
      .populate('jugador2', 'username');

    const historial = partidas.map(p => ({
      id: p._id,
      apuesta: p.apuesta,
      estado: p.estado,
      ganador: p.ganador,
      fecha: p.createdAt,
      rival: (p.jugador1._id.toString() === userId)
        ? (p.jugador2?.username || 'Esperando rival')
        : (p.jugador1?.username || 'Esperando rival'),
      resultado:
        !p.ganador ? 'En juego' :
        p.ganador.toString() === userId ? 'Ganaste' : 'Perdiste'
    }));

    res.json(historial);
  } catch (err) {
    console.error('🔥 Error al obtener historial:', err);
    res.status(500).json({ msg: 'Error al obtener historial', error: err.message });
  }
});


// Unirse a una partida existente
router.post('/join/:id', verifyToken, async (req, res) => {
  try {
    const partida = await Game.findById(req.params.id);
    if (!partida) return res.status(404).json({ msg: 'Partida no encontrada' });

    if (partida.estado !== 'esperando') {
      return res.status(400).json({ msg: 'Esta partida ya no está disponible para unirse' });
    }

    if (String(partida.jugador1) === req.user.id) {
      return res.status(400).json({ msg: 'No puedes unirte a tu propia partida' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (user.saldo < partida.apuesta) {
      return res.status(400).json({ msg: 'Saldo insuficiente para unirse a esta partida' });
    }

    // Descontar apuesta
    user.saldo -= partida.apuesta;
    await user.save();

    // Actualizar partida
    partida.jugador2 = user._id;
    partida.estado = 'en_juego';

    // 🔧 Establecer turno inicial si aún no hay jugadas
    if (!partida.movimientos || partida.movimientos.length === 0) {
      // Esto garantiza que el primer turno siempre sea del jugador1
      partida.turno = partida.jugador1;
    }

    await partida.save();

    res.status(200).json({
      msg: 'Te uniste a la partida exitosamente',
      partida
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


// Ver partidas disponibles para unirse
router.get('/available', verifyToken, async (req, res) => {
  try {
    const partidas = await Game.find({ estado: 'esperando' }).populate('jugador1', 'username');

    res.json(partidas.map(p => ({
      id: p._id,
      creador: p.jugador1.username,
      apuesta: p.apuesta,
      creado: p.createdAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


// Ruta para registrar una jugada y verificar victoria
router.post('/:id/move', verifyToken, async (req, res) => {
  const { index } = req.body;
  const userId = req.user.id;

  try {
    console.log('🕹️ Jugada recibida:', { index, userId, partidaId: req.params.id });

    const partida = await Game.findById(req.params.id);
    if (!partida) return res.status(404).json({ msg: 'Partida no encontrada' });

    console.log('📄 Partida encontrada:', partida._id);
    console.log('📦 Tablero actual:', partida.tablero);
    console.log('📜 Movimientos actuales:', partida.movimientos);

    const esJugador1 = partida.jugador1.toString() === userId;
    const esJugador2 = partida.jugador2?.toString() === userId;
    if (!esJugador1 && !esJugador2) return res.status(403).json({ msg: 'No participas en esta partida' });

    if (partida.estado !== 'en_juego') return res.status(400).json({ msg: 'La partida no está activa' });

    const turnoActual = partida.movimientos.length % 2 === 0 ? 'jugador1' : 'jugador2';
    const jugadorEnTurno = turnoActual === 'jugador1' ? partida.jugador1.toString() : partida.jugador2?.toString();

    console.log('🎯 Turno actual:', turnoActual, '→', jugadorEnTurno);

    if (jugadorEnTurno !== userId) return res.status(403).json({ msg: 'No es tu turno' });

    const ocupada = partida.movimientos.some(m => m.index === index);
    if (ocupada) return res.status(400).json({ msg: 'Esa celda ya fue jugada' });

    console.log('✅ Celda libre, registrando movimiento...');

    // Agregar movimiento
    partida.movimientos.push({ jugador: userId, index });

    // Actualizar tablero
    const fila = Math.floor(index / 5);
    const columna = index % 5;
    partida.tablero[fila][columna] = userId;

    console.log(`🧩 Posición jugada: fila ${fila}, columna ${columna}`);

    // Verificar victoria
    const esVictoria = verificarVictoria(partida.tablero, fila, columna, userId);
console.log('🏁 ¿Victoria?:', esVictoria);

let indicesGanadores = [];

// Siempre calcula los índices ganadores si hay victoria
if (esVictoria) {
  indicesGanadores = obtenerIndicesGanadores(partida.tablero, userId);

  if (!partida.ganador) {
    partida.ganador = userId;
    partida.estado = 'finalizada';

    await partida.save();

    // 💰 Premiar
    const totalApuesta = partida.apuesta * 2;
    let porcentajeComision = 0.1;
    if (partida.apuesta >= 6 && partida.apuesta <= 20) porcentajeComision = 0.08;
    else if (partida.apuesta > 20) porcentajeComision = 0.05;

    const comision = totalApuesta * porcentajeComision;
    const premio = totalApuesta - comision;

    const ganador = await User.findById(userId);
    if (!ganador) return res.status(404).json({ msg: 'Usuario ganador no encontrado' });

    ganador.saldo += premio;
    await ganador.save();
  } else {
    console.log('⚠️ Ya se entregó el premio anteriormente.');
  }
}

  
    if (!esVictoria) {
  // Cambiar el turno al jugador contrario
  const siguienteTurno = (userId === partida.jugador1.toString())
    ? partida.jugador2
    : partida.jugador1;
  partida.turno = siguienteTurno;
}
   
    await partida.save();

    console.log('✅ Movimiento registrado y partida guardada.');

    res.json({
  msg: esVictoria ? '¡Victoria!' : 'Jugada registrada',
  movimientos: partida.movimientos,
  tablero: partida.tablero,
  ganador: partida.ganador || null,
  indicesGanadores
});



  } catch (err) {
    console.error('🔥 ERROR en jugada:', err);
    res.status(500).json({ msg: 'Error en el servidor', error: err.message });
  }
});


// 👉 Lógica para verificar 5 en línea
function verificarVictoria(tablero, fila, columna, jugadorId) {
  const direcciones = [
    [0, 1],   // Horizontal →
    [1, 0],   // Vertical ↓
    [1, 1],   // Diagonal ↘
    [1, -1]   // Diagonal ↙
  ];

  for (const [dx, dy] of direcciones) {
    let conteo = 1;

    // Revisa en ambas direcciones
    for (let dir = -1; dir <= 1; dir += 2) {
      let x = fila + dir * dx;
      let y = columna + dir * dy;

      while (x >= 0 && x < 5 && y >= 0 && y < 5 && tablero[x][y] === jugadorId) {
        conteo++;
        x += dir * dx;
        y += dir * dy;
      }
    }

    if (conteo >= 5) return true;
  }

  return false;
}

// Obtener datos de una partida por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const partida = await Game.findById(req.params.id)
      .populate('jugador1', 'username saldo')
      .populate('jugador2', 'username saldo');

    if (!partida) {
      return res.status(404).json({ msg: 'Partida no encontrada' });
    }

    // Verificar si hay un ganador y calcular los índices ganadores
    let indicesGanadores = [];
    if (partida.ganador) {
      indicesGanadores = obtenerIndicesGanadores(partida.tablero, partida.ganador);
    }

    // Enviar toda la info relevante al frontend
    res.json({
      jugador1: partida.jugador1,
      jugador2: partida.jugador2,
      movimientos: partida.movimientos,
      turno: partida.turno,
      estado: partida.estado,
      ganador: partida.ganador,
      indicesGanadores
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


function obtenerIndicesGanadores(tablero, jugadorId) {
  const direcciones = [
    [0, 1],   // Horizontal →
    [1, 0],   // Vertical ↓
    [1, 1],   // Diagonal ↘
    [1, -1]   // Diagonal ↙
  ];

  for (let fila = 0; fila < 5; fila++) {
    for (let col = 0; col < 5; col++) {
      if (tablero[fila][col] !== jugadorId) continue;

      for (const [dx, dy] of direcciones) {
        const indices = [[fila, col]];
        let x = fila + dx;
        let y = col + dy;

        while (indices.length < 5 && x >= 0 && x < 5 && y >= 0 && y < 5 && tablero[x][y] === jugadorId) {
          indices.push([x, y]);
          x += dx;
          y += dy;
        }

        if (indices.length === 5) {
          return indices.map(([f, c]) => f * 5 + c);
        }
      }
    }
  }

  return [];
}


module.exports = router;
