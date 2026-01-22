const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const csv = require('csv-parser');

exports.importStudents = async (req, res) => {
  const { schoolId } = req.user;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Please upload a CSV file' });

  const results = [];
  const defaultPassword = 'password123'; // Simple default for bulk imports
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  // Read the CSV file
  fs.createReadStream(file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        let addedCount = 0;

        for (const row of results) {
          // Expects CSV headers: Name, Email
          if (row.Name && row.Email) {
            // Check if exists
            const check = await client.query('SELECT id FROM users WHERE email = $1', [row.Email]);
            
            if (check.rows.length === 0) {
              await client.query(
                `INSERT INTO users (school_id, full_name, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4, 'STUDENT')`,
                [schoolId, row.Name, row.Email, hashedPassword]
              );
              addedCount++;
            }
          }
        }

        await client.query('COMMIT');
        // Delete temp file
        fs.unlinkSync(file.path);
        
        res.json({ message: `Successfully imported ${addedCount} students.` });

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Import failed' });
      } finally {
        client.release();
      }
    });
};