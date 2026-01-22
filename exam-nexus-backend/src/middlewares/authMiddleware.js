// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    // Remove "Bearer " if present
    const cleanToken = token.replace('Bearer ', '');
    const verified = jwt.verify(cleanToken, process.env.JWT_SECRET);
    req.user = verified; // Attaches userId, schoolId to the request
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid Token' });
  }
};