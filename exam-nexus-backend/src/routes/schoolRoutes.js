// src/routes/schoolRoutes.js
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const authMiddleware  = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Make sure this matches 'registerSchool'
router.post('/onboard', schoolController.registerSchool); 
router.get('/list', schoolController.listSchools);
router.get('/settings', authMiddleware, schoolController.getSchoolSettings);
router.put('/settings', authMiddleware, upload.single('logo'), schoolController.updateSchoolSettings);
module.exports = router;