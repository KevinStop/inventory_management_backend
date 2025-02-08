require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT.
 * @param {Object} payload - Datos para incluir en el token (userId, email, role).
 * @returns {string} Token generado.
 */

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Configura la cookie con el token JWT.
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {string} token - Token JWT generado.
 */
const setTokenCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    maxAge: 3600000, // 1 hora
  });
};

module.exports = { generateToken, setTokenCookie };