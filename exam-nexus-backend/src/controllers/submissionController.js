// const { pool } = require('../config/db');

// // Helper to shuffle array (Fisher-Yates algorithm)
// function shuffleArray(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

// // 1. GET EXAM (Sanitized + Randomized + Resumable)
// exports.getExamForStudent = async (req, res) => {
//   const { examId } = req.params;
//   const studentId = req.user.userId;

//   try {
//     // A. Fetch Exam Details
//     const examResult = await pool.query(
//       'SELECT title, instructions, start_time, end_time FROM exams WHERE id = $1', 
//       [examId]
//     );

//     if (examResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Exam not found' });
//     }

//     // B. Fetch Questions (THIS WAS MISSING)
//     const questionsResult = await pool.query(
//       'SELECT id, question_text, options, points FROM questions WHERE exam_id = $1',
//       [examId]
//     );

//     // C. Shuffle Logic
//     const shuffledQuestions = shuffleArray(questionsResult.rows);

//     // D. Sanitize (Remove 'is_correct' so students can't cheat)
//     const fullyRandomized = shuffledQuestions.map(q => {
//       const sanitizedOptions = q.options.map(opt => ({
//         text: opt.text // Only send text, keep hidden 'is_correct' on server
//       }));
      
//       return { 
//         id: q.id,
//         question_text: q.question_text,
//         points: q.points,
//         options: sanitizedOptions 
//       };
//     });

//     // E. Fetch Draft (If student already started)
//     const submissionCheck = await pool.query(
//       'SELECT draft_answers FROM submissions WHERE exam_id = $1 AND student_id = $2',
//       [examId, studentId]
//     );

//     // F. Send Response
//     res.json({
//       exam: examResult.rows[0],
//       questions: fullyRandomized,
//       saved_answers: submissionCheck.rows.length > 0 ? submissionCheck.rows[0].draft_answers : [],
//       server_time: new Date().toISOString(), // Critical for Timer
//       end_time: examResult.rows[0].end_time
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error fetching exam' });
//   }
// };

// // 2. SAVE DRAFT (Heartbeat)
// exports.saveDraft = async (req, res) => {
//   const { examId } = req.params;
//   const { answers } = req.body; 
//   const studentId = req.user.userId;

//   try {
//     // Update existing row
//     const updateResult = await pool.query(
//       `UPDATE submissions 
//        SET draft_answers = $1, status = 'IN_PROGRESS' 
//        WHERE exam_id = $2 AND student_id = $3
//        RETURNING id`,
//       [JSON.stringify(answers), examId, studentId]
//     );

//     // If no row exists, create one
//     if (updateResult.rowCount === 0) {
//       await pool.query(
//         `INSERT INTO submissions (exam_id, student_id, draft_answers, status)
//          VALUES ($1, $2, $3, 'IN_PROGRESS')`,
//         [examId, studentId, JSON.stringify(answers)]
//       );
//     }

//     res.json({ message: 'Draft saved' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to save draft' });
//   }
// };

// // 3. SUBMIT EXAM
// exports.submitExam = async (req, res) => {
//   const { examId } = req.params;
//   const { answers } = req.body; 
//   const studentId = req.user.userId;

//   try {
//     // Fetch ORIGINAL questions (with correct answers)
//     const questionsResult = await pool.query(
//       'SELECT id, options, points FROM questions WHERE exam_id = $1',
//       [examId]
//     );

//     let totalScore = 0;
    
//     // Calculate Score
//     questionsResult.rows.forEach(q => {
//       const studentAnswer = answers.find(a => a.question_id === q.id);
//       if (studentAnswer) {
//         const selectedIndex = studentAnswer.selected_option_index;
//         // Verify against DB
//         if (q.options[selectedIndex] && q.options[selectedIndex].is_correct) {
//           totalScore += q.points;
//         }
//       }
//     });

//     // Update Submission to COMPLETED
//     // We also save the final answers into draft_answers just in case
//     await pool.query(
//       `UPDATE submissions 
//        SET score = $1, status = 'COMPLETED', draft_answers = $2, submitted_at = NOW()
//        WHERE exam_id = $3 AND student_id = $4`,
//       [totalScore, JSON.stringify(answers), examId, studentId]
//     );

//     // If UPDATE didn't find a row (rare case where user submits without any draft saving), INSERT it
//     // (Optional safety check, usually draft exists by now)

//     res.json({ message: 'Exam submitted successfully' });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Submission failed' });
//   }
// };

// // 4. RECORD WARNING (Anti-Cheat)
// exports.recordWarning = async (req, res) => {
//   const { examId } = req.params;
//   const studentId = req.user.userId;

//   try {
//     await pool.query(
//       `UPDATE submissions 
//        SET violation_count = violation_count + 1 
//        WHERE exam_id = $1 AND student_id = $2`,
//       [examId, studentId]
//     );
//     res.json({ message: 'Warning recorded' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
const { pool } = require('../config/db');

// 1. GET EXAM (Deterministic Shuffle + Resumable)
exports.getExamForStudent = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.userId;

  try {
    // A. Fetch Exam Details
    const examResult = await pool.query(
      'SELECT title, instructions, start_time, end_time, duration_minutes FROM exams WHERE id = $1', 
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const now = new Date();
    // Optional: Strict Time Check
    // if (now < new Date(examResult.rows[0].start_time)) return res.status(403).json({ error: 'Exam not started' });

    // B. Fetch Questions with DETERMINISTIC SHUFFLE
    // This ensures if Student A refreshes, they get the EXACT SAME random order they had before.
    const questionsResult = await pool.query(
      `SELECT id, question_text, options, points 
       FROM questions 
       WHERE exam_id = $1 
       ORDER BY MD5(id::text || $2::text)`, // <--- Magic Fix: Consistent Randomness per User
      [examId, studentId]
    );

    // C. Sanitize (Remove 'is_correct')
    const sanitizedQuestions = questionsResult.rows.map(q => {
      const sanitizedOptions = q.options.map(opt => ({
        text: opt.text // 'is_correct' is hidden
      }));
      
      return { 
        id: q.id,
        question_text: q.question_text,
        points: q.points,
        options: sanitizedOptions 
      };
    });

    // D. Fetch Draft (Resume capability)
    const submissionCheck = await pool.query(
      'SELECT draft_answers FROM submissions WHERE exam_id = $1 AND student_id = $2',
      [examId, studentId]
    );

    // E. Send Response
    res.json({
      exam: examResult.rows[0],
      questions: sanitizedQuestions,
      saved_answers: submissionCheck.rows.length > 0 ? submissionCheck.rows[0].draft_answers : [],
      server_time: now.toISOString(),
      end_time: examResult.rows[0].end_time
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching exam' });
  }
};

// 2. SAVE DRAFT (Heartbeat)
exports.saveDraft = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body; 
  const studentId = req.user.userId;

  try {
    // UPSERT (Update if exists, Insert if not)
    const updateResult = await pool.query(
      `UPDATE submissions 
       SET draft_answers = $1, status = 'IN_PROGRESS', last_heartbeat = NOW()
       WHERE exam_id = $2 AND student_id = $3
       RETURNING id`,
      [JSON.stringify(answers), examId, studentId]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO submissions (exam_id, student_id, draft_answers, status)
         VALUES ($1, $2, $3, 'IN_PROGRESS')`,
        [examId, studentId, JSON.stringify(answers)]
      );
    }

    res.json({ message: 'Draft saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
};

// 3. SUBMIT EXAM
exports.submitExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body; 
  const studentId = req.user.userId;

  try {
    // 1. Calculate Score
    const questionsResult = await pool.query(
      'SELECT id, options, points FROM questions WHERE exam_id = $1',
      [examId]
    );

    let totalScore = 0;
    
    questionsResult.rows.forEach(q => {
      const studentAnswer = answers.find(a => a.question_id === q.id);
      if (studentAnswer) {
        const selectedIndex = studentAnswer.selected_option_index;
        // Verify index is valid and correct
        if (q.options[selectedIndex] && q.options[selectedIndex].is_correct) {
          totalScore += q.points;
        }
      }
    });

    // 2. Save Submission (Handle case where no draft existed)
    const updateResult = await pool.query(
      `UPDATE submissions 
       SET score = $1, status = 'COMPLETED', draft_answers = $2, submitted_at = NOW()
       WHERE exam_id = $3 AND student_id = $4
       RETURNING id`,
      [totalScore, JSON.stringify(answers), examId, studentId]
    );

    // Fallback: If user submitted instantly without a draft ever saving
    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO submissions (exam_id, student_id, draft_answers, score, status, submitted_at)
         VALUES ($1, $2, $3, $4, 'COMPLETED', NOW())`,
        [examId, studentId, JSON.stringify(answers), totalScore]
      );
    }

    res.json({ message: 'Exam submitted successfully', score: totalScore });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Submission failed' });
  }
};

// 4. RECORD WARNING
exports.recordWarning = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.userId;

  try {
    // We need to make sure a submission row exists to update the count
    const updateResult = await pool.query(
      `UPDATE submissions 
       SET violation_count = violation_count + 1 
       WHERE exam_id = $1 AND student_id = $2
       RETURNING violation_count`,
      [examId, studentId]
    );

    // If no row, create one (rare, but possible if warning happens immediately)
    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO submissions (exam_id, student_id, violation_count, status)
         VALUES ($1, $2, 1, 'IN_PROGRESS')`,
        [examId, studentId]
      );
    }

    res.json({ message: 'Warning recorded' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};