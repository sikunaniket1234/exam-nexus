const express = require('express');
const router = express.Router();
const controller = require('../controllers/questionBankController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, controller.getQuestions);
router.post('/add', authMiddleware, controller.addQuestion);
router.post('/bulk', authMiddleware, controller.bulkAddQuestions);
module.exports = router;