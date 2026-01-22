const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// Match the export name used in your routes (e.g., registerSchool or onboardSchool)
exports.registerSchool = async (req, res) => {
  // 1. FIX: Destructure 'admin_password' to match the Angular Frontend form
  const { school_name, subdomain, admin_name, admin_email, admin_password } = req.body;

  // Validation
  if (!school_name || !subdomain || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Check if subdomain exists (Optional: The unique constraint in DB also catches this, but this is friendlier)
    const checkSubdomain = await client.query('SELECT * FROM schools WHERE subdomain = $1', [subdomain]);
    if (checkSubdomain.rows.length > 0) {
      throw new Error('Subdomain already taken. Please choose another.');
    }

    // 3. Insert School
    // Note: We use school_name for the 'name' column
    const schoolResult = await client.query(
      'INSERT INTO schools (name, subdomain, admin_email) VALUES ($1, $2, $3) RETURNING id',
      [school_name, subdomain.toLowerCase(), admin_email]
    );
    const newSchoolId = schoolResult.rows[0].id;

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin_password, salt); // FIX: Use admin_password

    // 5. Insert School Admin into Users Table
    // We force role to 'TEACHER' as the initial admin
    await client.query(
      'INSERT INTO users (school_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [newSchoolId, admin_name, admin_email, hashedPassword, 'TEACHER'] 
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'School and Admin registered successfully!',
      school_id: newSchoolId,
      subdomain: subdomain 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    
    // Better Error Handling for Duplicates
    if (error.code === '23505') { // Postgres Unique Violation
      if (error.constraint.includes('subdomain')) {
        return res.status(400).json({ error: 'Subdomain is already in use.' });
      }
      if (error.constraint.includes('admin_email')) {
        return res.status(400).json({ error: 'This email is already registered as an admin.' });
      }
    }

    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Don't forget to keep the list function!
exports.listSchools = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schools ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching schools' });
  }
};

// GET /api/schools/settings
exports.getSchoolSettings = async (req, res) => {
  const { schoolId } = req.user;
  
  try {
    const result = await pool.query(
      'SELECT name, subdomain, admin_email, logo_url FROM schools WHERE id = $1',
      [schoolId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'School not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// PUT /api/schools/settings
exports.updateSchoolSettings = async (req, res) => {
  const { schoolId } = req.user;
  const { name } = req.body;
  const file = req.file; // From multer (logo upload)

  if (!name) return res.status(400).json({ error: 'School name is required' });

  try {
    let query = 'UPDATE schools SET name = $1';
    let params = [name];

    // If a new logo file was uploaded
    if (file) {
      // In a real app, upload 'file' to S3/Cloudinary here. 
      // For now, we assume local storage and save the path.
      // Make sure your backend serves the 'uploads' folder statically!
      const logoUrl = `http://localhost:5000/uploads/${file.filename}`;
      query += ', logo_url = $2 WHERE id = $3';
      params.push(logoUrl, schoolId);
    } else {
      query += ' WHERE id = $2';
      params.push(schoolId);
    }

    await pool.query(query, params);
    res.json({ message: 'School settings updated successfully', logo_url: file ? params[1] : undefined });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
};