// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');


// Existing Routes
router.post('/generate', authMiddleware, upload.single('reference_file'), examController.createExamWithAI);
router.post('/:examId/publish', authMiddleware, examController.publishResults);
router.post('/manual', authMiddleware, examController.createManualExam); // <--- ADD THIS
router.post('/:examId/assign', authMiddleware, examController.assignStudents);
router.patch('/:id/publish', authMiddleware, examController.publishExam);
router.get('/:id/questions', authMiddleware, examController.getExamQuestions);
router.put('/questions/:questionId', authMiddleware, examController.updateQuestion);
router.delete('/questions/:questionId', authMiddleware, examController.deleteQuestion);
router.post('/generate-preview', authMiddleware, upload.single('reference_file'), examController.generatePreview);
// --- NEW GLUE API ROUTES ---

// Teacher Dashboard: List my exams
router.get('/teacher/list', authMiddleware, examController.getTeacherExams);

// Student Dashboard: List upcoming exams
router.get('/student/list', authMiddleware, examController.getStudentExams);

// Exam Stats: See who submitted
router.get('/:examId/stats', authMiddleware, examController.getExamStats);

module.exports = router;