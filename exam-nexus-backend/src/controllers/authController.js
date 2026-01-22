// src/controllers/authController.js
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password, subdomain } = req.body;

  // 1. Basic Validation
  if (!email || !password || !subdomain) {
    return res.status(400).json({ error: 'Email, Password, and School ID/Subdomain are required' });
  }

  try {
    // 2. Find the School first
    const schoolQuery = await pool.query('SELECT id FROM schools WHERE subdomain = $1', [subdomain]);
    
    if (schoolQuery.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    const schoolId = schoolQuery.rows[0].id;

    // 3. Find the User IN THAT SPECIFIC SCHOOL
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND school_id = $2', 
      [email, schoolId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userQuery.rows[0];

    // 4. Check Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 5. Generate JWT Token (The Digital Badge)
    const token = jwt.sign(
      { 
        userId: user.id, 
        schoolId: user.school_id, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token expires in 1 day
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.full_name,
        role: user.role,
        school_id: user.school_id
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};