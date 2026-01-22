// src/controllers/examController.js
const { pool } = require('../config/db');
const geminiService = require('../utils/geminiService');
const emailService = require('../utils/emailService');

exports.createExamWithAI = async (req, res) => {
  const { schoolId, userId, role } = req.user; 
  // EXTRACT NEW FIELDS
  const { 
    title, instructions, text_content, 
    question_count, marks_per_question, difficulty,
    start_time, end_time // Date fields
  } = req.body;
  
  const file = req.file;

  if (role !== 'TEACHER') return res.status(403).json({ error: 'Unauthorized' });

  try {
    // 1. Generate Questions (Pass Count & Difficulty)
    // Default to 5 questions if not sent
    const qCount = parseInt(question_count) || 5;
    const diff = difficulty || 'Medium';

    const questionsData = await geminiService.generateQuestions(
      text_content, 
      file ? file.buffer : null, 
      file ? file.mimetype : null,
      qCount,
      diff
    );

    // 2. Insert Exam (With Dates)
    const examResult = await pool.query(
      `INSERT INTO exams (school_id, teacher_id, title, instructions, start_time, end_time, created_via) 
       VALUES ($1, $2, $3, $4, $5, $6, 'AI') RETURNING id`,
      [
        schoolId, 
        userId, 
        title, 
        instructions, 
        start_time || new Date(), // Default to now if missing
        end_time || new Date(Date.now() + 2 * 60 * 60 * 1000) // Default +2 hours
      ]
    );
    const examId = examResult.rows[0].id;

    // 3. Insert Questions (With Custom Marks)
    const points = parseInt(marks_per_question) || 1; // Default 1 mark

    for (const q of questionsData) {
      await pool.query(
        `INSERT INTO questions (exam_id, question_text, options, points) 
         VALUES ($1, $2, $3, $4)`,
        [examId, q.question_text, JSON.stringify(q.options), points]
      );
    }

    res.json({ message: 'Exam created!', examId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};
exports.createManualExam = async (req, res) => {
  const { schoolId, userId } = req.user;
  const { 
    title, instructions, start_time, end_time, 
    questions, auto_publish // Array of manual questions
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create the Exam
    const examResult = await client.query(
      `INSERT INTO exams (school_id, teacher_id, title, instructions, start_time, end_time, created_via, auto_publish) 
       VALUES ($1, $2, $3, $4, $5, $6, 'MANUAL', $7) RETURNING id`,
      [
        schoolId, userId, title, instructions, 
        start_time, end_time, 
        (auto_publish || false) // Handle the new Auto-Publish flag
      ]
    );
    const examId = examResult.rows[0].id;

    // 2. Loop through the Manual Questions and Insert them
    // questions = [{ question_text: "...", points: 1, options: [...] }]
    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (exam_id, question_text, options, points) 
         VALUES ($1, $2, $3, $4)`,
        [examId, q.question_text, JSON.stringify(q.options), q.points]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Manual Exam created successfully!', examId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to create manual exam' });
  } finally {
    client.release();
  }
};
  exports.publishResults = async (req, res) => {
  const { examId } = req.params;
  const { schoolId } = req.user; // Ensure teacher only publishes their own school's exams

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify Exam belongs to this school
    const examCheck = await client.query(
      'SELECT title, is_published FROM exams WHERE id = $1 AND school_id = $2',
      [examId, schoolId]
    );

    if (examCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found or access denied' });
    }

    if (examCheck.rows[0].is_published) {
      return res.status(400).json({ error: 'Results already published' });
    }

    const examTitle = examCheck.rows[0].title;

    // 2. Fetch all submissions with User Details (JOIN)
    // We need email, name, score
    const submissions = await client.query(
      `SELECT u.email, u.full_name, s.score 
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.exam_id = $1`,
      [examId]
    );

    // 3. Calculate Max Score (to show "10/20")
    const pointsResult = await client.query(
      'SELECT SUM(points) as max_score FROM questions WHERE exam_id = $1',
      [examId]
    );
    const maxScore = pointsResult.rows[0].max_score || 0;

    // 4. Update Exam Status to Published
    await client.query(
      'UPDATE exams SET is_published = TRUE WHERE id = $1',
      [examId]
    );

    await client.query('COMMIT');

    // 5. Send Emails (Do this AFTER committing DB changes)
    // We assume there aren't thousands of students. 
    // If there are >1000, we would use a Message Queue (like BullMQ/Redis).
    // For now, a simple Promise.all is fine.
    
    console.log(`📧 Sending emails to ${submissions.rows.length} students...`);
    
    // We don't await this so the Teacher gets a fast "Success" response
    // The emails send in the background.
    submissions.rows.forEach(student => {
      emailService.sendResultEmail(
        student.email, 
        student.full_name, 
        examTitle, 
        student.score, 
        maxScore
      );
    });

    res.json({ message: `Results published! Sending emails to ${submissions.rows.length} students.` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to publish results' });
  } finally {
    client.release();
  }
};
// 1. GET /api/exams/teacher/list
exports.getTeacherExams = async (req, res) => {
  const { userId } = req.user;

  try {
    const result = await pool.query(
      `SELECT id, title, start_time, end_time, is_published, created_at 
       FROM exams 
       WHERE teacher_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

// 2. GET /api/exams/student/list
exports.getStudentExams = async (req, res) => {
  const { schoolId } = req.user;

  try {
    // Show exams for this school. 
    // We can filter out exams that ended a long time ago if needed.
    const result = await pool.query(
      `SELECT id, title, start_time, end_time, instructions 
       FROM exams 
       WHERE school_id = $1 
       ORDER BY start_time DESC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

// 3. GET /api/exams/:examId/stats
exports.getExamStats = async (req, res) => {
  const { examId } = req.params;
  
  try {
    // Get basic count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM submissions WHERE exam_id = $1',
      [examId]
    );

    // Get list of students who submitted (with scores if needed, or just status)
    const listResult = await pool.query(
      `SELECT u.full_name, s.submitted_at, s.score 
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.exam_id = $1
       ORDER BY s.score DESC`,
      [examId]
    );

    res.json({
      total_submissions: parseInt(countResult.rows[0].total),
      students: listResult.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// POST /api/exams/:examId/regrade
exports.regradeExam = async (req, res) => {
  const { examId } = req.params;
  const { updatedQuestions } = req.body; // Optional: If they corrected the key in the UI

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. (Optional) Update the Answer Keys in DB if provided
    if (updatedQuestions) {
      for (const q of updatedQuestions) {
        await client.query(
          'UPDATE questions SET options = $1 WHERE id = $2',
          [JSON.stringify(q.options), q.id]
        );
      }
    }

    // 2. Fetch fresh questions (with correct answers)
    const questionsRes = await client.query('SELECT id, options, points FROM questions WHERE exam_id = $1', [examId]);
    const questions = questionsRes.rows;

    // 3. Fetch ALL submissions
    const subsRes = await client.query('SELECT id, draft_answers FROM submissions WHERE exam_id = $1', [examId]);
    
    // 4. Recalculate Loop
    for (const sub of subsRes.rows) {
      let newScore = 0;
      const answers = sub.draft_answers || []; // We rely on the draft/saved answers

      questions.forEach(q => {
        const studentAns = answers.find(a => a.question_id === q.id);
        if (studentAns) {
          const selectedIdx = studentAns.selected_option_index;
          if (q.options[selectedIdx] && q.options[selectedIdx].is_correct) {
            newScore += q.points;
          }
        }
      });

      // Update Score
      await client.query('UPDATE submissions SET score = $1 WHERE id = $2', [newScore, sub.id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Regraded ${subsRes.rows.length} submissions successfully.` });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Regrade failed' });
  } finally {
    client.release();
  }
};

// POST /api/exams/:examId/assign
exports.assignStudents = async (req, res) => {
  const { examId } = req.params;
  const { studentIds, isOpenToAll } = req.body; // { studentIds: [1, 2], isOpenToAll: false }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update Exam Flag
    await client.query('UPDATE exams SET is_open_to_all = $1 WHERE id = $2', [isOpenToAll, examId]);

    // 2. Clear old assignments (if updating)
    await client.query('DELETE FROM exam_assignments WHERE exam_id = $1', [examId]);

    // 3. Insert New Assignments (Only if not open to all)
    if (!isOpenToAll && studentIds && studentIds.length > 0) {
      for (const studentId of studentIds) {
        await client.query(
          'INSERT INTO exam_assignments (exam_id, student_id) VALUES ($1, $2)',
          [examId, studentId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Assignments updated successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to assign students' });
  } finally {
    client.release();
  }
};

// UPDATE THE EXISTING 'getStudentExams' FUNCTION
exports.getStudentExams = async (req, res) => {
  const { schoolId, userId } = req.user;

  try {
    // Logic: Get exams that are (Public AND in my school) OR (Assigned specifically to ME)
    const result = await pool.query(
      `SELECT e.id, e.title, e.start_time, e.end_time, e.instructions 
       FROM exams e
       LEFT JOIN exam_assignments ea ON e.id = ea.exam_id
       WHERE e.school_id = $1 
       AND (e.is_open_to_all = TRUE OR ea.student_id = $2)
       AND e.is_published = TRUE
       ORDER BY e.start_time DESC`,
      [schoolId, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

// src/controllers/examController.js

// PATCH /api/exams/:id/publish
exports.publishExam = async (req, res) => {
  const { id } = req.params;
  const { schoolId } = req.user;

  try {
    const result = await pool.query(
      `UPDATE exams 
       SET is_published = TRUE 
       WHERE id = $1 AND school_id = $2 
       RETURNING id`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found or unauthorized' });
    }

    res.json({ message: 'Exam published successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
};

// src/controllers/examController.js

// GET /api/exams/:id/questions
exports.getExamQuestions = async (req, res) => {
  const { id } = req.params;
  const { schoolId } = req.user;

  try {
    // Verify ownership/school
    const examCheck = await pool.query(
      'SELECT * FROM exams WHERE id = $1 AND school_id = $2', 
      [id, schoolId]
    );
    if (examCheck.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });

    // Fetch questions
    const questions = await pool.query(
      'SELECT * FROM questions WHERE exam_id = $1 ORDER BY id ASC',
      [id]
    );

    res.json({ exam: examCheck.rows[0], questions: questions.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

// PUT /api/exams/questions/:questionId
exports.updateQuestion = async (req, res) => {
  const { questionId } = req.params;
  const { question_text, options, points } = req.body; // options is array of {text, is_correct}

  try {
    await pool.query(
      `UPDATE questions 
       SET question_text = $1, options = $2, points = $3 
       WHERE id = $4`,
      [question_text, JSON.stringify(options), points, questionId]
    );
    res.json({ message: 'Question updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
};

// DELETE /api/exams/questions/:questionId
exports.deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  try {
    await pool.query('DELETE FROM questions WHERE id = $1', [questionId]);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

exports.generatePreview = async (req, res) => {
  try {
    const { subject, difficulty, question_count, text_content } = req.body;
    const file = req.file; // If they uploaded a PDF/Image

    // 1. Prepare context for AI
    let context = text_content || "";
    
    // (Optional) If you have PDF parsing logic, it goes here:
    // if (file) { context += await parsePdf(file.path); }

    if (!context && !subject) {
      return res.status(400).json({ error: 'Please provide a subject or content context.' });
    }

    // 2. Call your AI Logic (Reusing your existing AI Prompt logic)
    // This expects your AI service to return an ARRAY of questions
    const generatedQuestions = await geminiService.generateQuestions({
      text: context,
      subject: subject,
      difficulty: difficulty,
      count: question_count || 5,
      type: 'MULTIPLE_CHOICE' // or whatever your prompt expects
    });

    // 3. Return JSON directly (Do NOT save to DB)
    res.json({ 
      message: 'Preview generated', 
      questions: generatedQuestions 
    });

  } catch (err) {
    console.error('AI Preview Error:', err);
    res.status(500).json({ error: 'Failed to generate preview questions.' });
  }
};