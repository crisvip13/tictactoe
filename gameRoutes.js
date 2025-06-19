// ✅ Paso 1: Backend (gameRoutes.js)


// Ruta para registrar una jugada y devolver el estado actual
router.post('/game/:id/move', authMiddleware, async (req, res) => {
  const { index } = req.body; // celda de 0 a 24
  const userId = req.user.id;

  try {
    const partida = await Game.findById(req.params.id);
    if (!partida) return res.status(404).json({ msg: 'Partida no encontrada' });

    const esJugador1 = partida.jugador1.toString() === userId;
    const esJugador2 = partida.jugador2?.toString() === userId;
    if (!esJugador1 && !esJugador2) return res.status(403).json({ msg: 'No participas en esta partida' });

    // Determinar turno actual
    const turnoActual = partida.movimientos.length % 2 === 0 ? 'jugador1' : 'jugador2';
    const jugadorEnTurno = turnoActual === 'jugador1' ? partida.jugador1.toString() : partida.jugador2?.toString();

    if (jugadorEnTurno !== userId) return res.status(403).json({ msg: 'No es tu turno' });

    // Verificar que no se haya jugado en esa celda
    const ocupada = partida.movimientos.some(m => m.index === index);
    if (ocupada) return res.status(400).json({ msg: 'Esa celda ya fue jugada' });

    // Agregar movimiento
    partida.movimientos.push({ jugador: userId, index });
    await partida.save();

    res.json({ msg: 'Jugada registrada', movimientos: partida.movimientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});



