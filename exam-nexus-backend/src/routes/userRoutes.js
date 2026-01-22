// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Reuse your multer config
const importController = require('../controllers/importController');
router.get('/list', authMiddleware, userController.getUsers); // <--- ADD THIS
// POST /api/users/create
router.post('/create', authMiddleware, userController.createUser);
router.post('/import', authMiddleware, upload.single('file'), importController.importStudents);
module.exports = router;