const { pool } = require('../config/db');

// GET /api/bank (With Filters)
exports.getQuestions = async (req, res) => {
  const { schoolId } = req.user;
  const { subject, difficulty } = req.query;

  try {
    let query = 'SELECT * FROM question_bank WHERE school_id = $1';
    let params = [schoolId];
    let idx = 2;

    if (subject) {
      query += ` AND subject = $${idx}`;
      params.push(subject);
      idx++;
    }
    if (difficulty) {
      query += ` AND difficulty = $${idx}`;
      params.push(difficulty);
      idx++;
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch question bank' });
  }
};

// POST /api/bank/add
exports.addQuestion = async (req, res) => {
  const { schoolId, userId } = req.user;
  const { subject, difficulty, question_text, options, points } = req.body;

  try {
    await pool.query(
      `INSERT INTO question_bank (school_id, teacher_id, subject, difficulty, question_text, options, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [schoolId, userId, subject, difficulty, question_text, JSON.stringify(options), points]
    );
    res.json({ message: 'Saved to Question Bank' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save question' });
  }
};

exports.bulkAddQuestions = async (req, res) => {
  const { schoolId, userId } = req.user;
  const { questions, subject, difficulty } = req.body; 
  // questions = [{ question_text, options, points }]

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const q of questions) {
      await client.query(
        `INSERT INTO question_bank (school_id, teacher_id, subject, difficulty, question_text, options, points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          schoolId, userId, 
          subject || 'General', 
          difficulty || 'Medium', 
          q.question_text, 
          JSON.stringify(q.options), 
          q.points || 1
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `Successfully added ${questions.length} questions to the bank.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk import questions' });
  } finally {
    client.release();
  }
};