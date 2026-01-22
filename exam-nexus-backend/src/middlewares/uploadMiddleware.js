const multer = require('multer');

// Store files in memory (RAM) temporarily so we can pass them directly to AI
// This is faster than saving to disk for simple AI tasks.
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

module.exports = upload;