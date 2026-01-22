const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Get School Stats (Admins)
router.get('/stats', reportController.getPlatformStats);

// Get Cheating List for an Exam (Teachers)
router.get('/violations/:examId', reportController.getExamViolations);
router.get('/admin/stats', authMiddleware, reportController.getAdminStats);
module.exports = router;