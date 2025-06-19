const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// REGISTRO
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const userExist = await User.findOne({ username });
    if (userExist) return res.status(400).json({ msg: 'El usuario ya existe' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashed });
    await newUser.save();

    res.status(201).json({ msg: 'Usuario registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        saldo: user.saldo
      }
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


module.exports = router;

const verifyToken = require('../middleware/authMiddleware');

// DEPÓSITO DE SALDO
router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount < 5) {
      return res.status(400).json({ msg: 'El depósito mínimo es de 5 soles' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    user.saldo += amount;
    await user.save();

    res.json({ msg: 'Depósito exitoso', nuevoSaldo: user.saldo });
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


// PERFIL DEL USUARIO AUTENTICADO
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // No queremos mostrar la contraseña

    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    res.json({
      username: user.username,
      saldo: user.saldo,
      id: user._id
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});


