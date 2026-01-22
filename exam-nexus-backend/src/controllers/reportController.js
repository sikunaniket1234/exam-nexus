const { pool } = require('../config/db');

// 1. SUPER ADMIN / SCHOOL ADMIN REPORT
// "How many teachers are using AI vs Manual?"
exports.getPlatformStats = async (req, res) => {
  const { schoolId } = req.user;

  try {
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_exams,
        SUM(CASE WHEN created_via = 'AI' THEN 1 ELSE 0 END) as ai_generated,
        SUM(CASE WHEN created_via = 'MANUAL' THEN 1 ELSE 0 END) as manual_generated,
        COUNT(DISTINCT teacher_id) as active_teachers
       FROM exams 
       WHERE school_id = $1`,
      [schoolId]
    );
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 2. TEACHER REPORT: VIOLATION LOGS
// "Who cheated?"
exports.getExamViolations = async (req, res) => {
  const { examId } = req.params;

  try {
    // We assume you add a 'violation_count' column to submissions table
    const result = await pool.query(
      `SELECT u.full_name, s.score, s.violation_count, s.status
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.exam_id = $1 AND s.violation_count > 0
       ORDER BY s.violation_count DESC`,
      [examId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/reports/admin/stats
exports.getAdminStats = async (req, res) => {
  const { schoolId } = req.user;

  try {
    // 1. System Overview (Cards)
    const overview = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'TEACHER') as teacher_count,
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'STUDENT') as student_count,
        (SELECT COUNT(*) FROM exams WHERE school_id = $1) as exam_count,
        (SELECT COUNT(*) FROM submissions s JOIN exams e ON s.exam_id = e.id WHERE e.school_id = $1) as submission_count
    `, [schoolId]);

    // 2. Teacher Performance Table
    const teachers = await pool.query(`
      SELECT u.full_name, u.email, COUNT(e.id) as exams_created
      FROM users u
      LEFT JOIN exams e ON u.id = e.teacher_id
      WHERE u.school_id = $1 AND u.role = 'TEACHER'
      GROUP BY u.id
      ORDER BY exams_created DESC
    `, [schoolId]);

    // 3. Student Leaderboard (Top 10 by Average Score)
    const students = await pool.query(`
      SELECT u.full_name, u.email, 
             COUNT(s.id) as exams_taken, 
             ROUND(AVG(s.score), 2) as avg_score
      FROM users u
      LEFT JOIN submissions s ON u.id = s.student_id
      WHERE u.school_id = $1 AND u.role = 'STUDENT'
      GROUP BY u.id
      HAVING COUNT(s.id) > 0
      ORDER BY avg_score DESC
      LIMIT 10
    `, [schoolId]);

    res.json({
      overview: overview.rows[0],
      teachers: teachers.rows,
      students: students.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};