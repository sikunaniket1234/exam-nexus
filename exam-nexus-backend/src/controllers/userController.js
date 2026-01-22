// src/controllers/userController.js
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// CREATE USER (Updated to save 'created_by')
exports.createUser = async (req, res) => {
  const { full_name, email, password, role } = req.body;
  const { schoolId, userId } = req.user;

  // Security: Only Admins can create Teachers
  if (req.user.role !== 'ADMIN' && role === 'TEACHER') {
    return res.status(403).json({ error: 'Only Admins can create Teachers.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (school_id, full_name, email, password_hash, role, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [schoolId, full_name, email, hashed, role, userId] // <--- SAVING CREATOR ID
    );

    res.json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
};
// GET /api/users/list
exports.getUsers = async (req, res) => {
  const schoolId = req.user.schoolId || req.user.school_id;
  const requesterId = req.user.userId;
  const requesterRole = req.user.role; // 'ADMIN' or 'TEACHER'

  try {
    let query = `
      SELECT id, full_name, email, role, created_at, created_by 
      FROM users 
      WHERE school_id = $1
    `;
    const params = [schoolId];

    // LOGIC: 
    // If ADMIN: See everything.
    // If TEACHER: See only Students created by ME.
    if (requesterRole === 'TEACHER') {
      query += ` AND created_by = $2 AND role = 'STUDENT'`;
      params.push(requesterId);
    } else {
      // Admin sees everyone, ordered by Role (Admins first, then Teachers, then Students)
      query += ` ORDER BY CASE WHEN role = 'ADMIN' THEN 1 WHEN role = 'TEACHER' THEN 2 ELSE 3 END, created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};