// src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware'); // Use existing disk storage config

// Ensure uploadMiddleware is using diskStorage, not memoryStorage for this one!
// If your previous middleware was memoryStorage (for AI), create a new 'diskUpload.js' middleware.

router.post('/image', upload.single('file'), require('../controllers/uploadController').uploadImage);
module.exports = router;