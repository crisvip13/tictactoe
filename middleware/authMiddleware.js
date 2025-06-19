// server/middleware/authMiddleware.js


const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const header = req.header('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Acceso denegado. No token incluido.' });
  }

  const token = header.split(' ')[1]; // Extrae solo el token sin "Bearer"

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Aquí se guarda el ID y demás en req.user
    next();
  } catch (err) {
    res.status(400).json({ msg: 'Token no válido' });
  }
};

module.exports = verifyToken;

