const cron = require('node-cron');
const { pool } = require('../config/db');

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('⏰ Cron Job: Checking for expired exams...');
  
  const client = await pool.connect();
  try {
    // 1. Find exams that ended > 5 minutes ago (buffer time)
    const result = await client.query(
      `SELECT id FROM exams 
       WHERE end_time < (NOW() - INTERVAL '5 minutes') 
       AND is_published = FALSE` // Optimization: Ignore old exams
    );
    
    for (const exam of result.rows) {
      // 2. Find "Abandoned" submissions (IN_PROGRESS)
      const abandoned = await client.query(
        `SELECT id, student_id, draft_answers 
         FROM submissions 
         WHERE exam_id = $1 AND status = 'IN_PROGRESS'`,
        [exam.id]
      );

      for (const sub of abandoned.rows) {
        // 3. Calculate Score from Draft
        // (We need to fetch questions for this exam to grade it)
        const qResult = await client.query('SELECT id, options, points FROM questions WHERE exam_id = $1', [exam.id]);
        let score = 0;
        const answers = sub.draft_answers || [];

        qResult.rows.forEach(q => {
          const studentAns = answers.find(a => a.question_id === q.id);
          if (studentAns) {
             const selectedIdx = studentAns.selected_option_index;
             if (q.options[selectedIdx] && q.options[selectedIdx].is_correct) {
               score += q.points;
             }
          }
        });

        // 4. Update to COMPLETED
        await client.query(
          `UPDATE submissions SET score = $1, status = 'COMPLETED' WHERE id = $2`,
          [score, sub.id]
        );
        console.log(`✅ Auto-submitted student ${sub.student_id} for exam ${exam.id}`);
      }
    }
  } catch (err) {
    console.error('Cron Error:', err);
  } finally {
    client.release();
  }
});