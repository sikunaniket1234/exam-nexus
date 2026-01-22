// src/routes/submissionRoutes.js
const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require login
router.use(authMiddleware);

// GET /api/submissions/exam/:examId/take -> Fetch exam questions
router.get('/exam/:examId/take', submissionController.getExamForStudent);

// POST /api/submissions/exam/:examId/submit -> Submit answers
router.post('/exam/:examId/submit', submissionController.submitExam);
router.post('/exam/:examId/warning', submissionController.recordWarning); // <--- ADD THIS
module.exports = router;