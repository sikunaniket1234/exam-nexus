// const express = require('express');
// const cors = require('cors');
// const path = require('path'); // <--- ADD THIS (Helper for file paths)
// require('dotenv').config();

// const { pool } = require('./src/config/db');

// // Import Routes
// const schoolRoutes = require('./src/routes/schoolRoutes');
// const authRoutes = require('./src/routes/authRoutes');
// const examRoutes = require('./src/routes/examRoutes');
// const submissionRoutes = require('./src/routes/submissionRoutes');
// const userRoutes = require('./src/routes/userRoutes');
// const reportRoutes = require('./src/routes/reportRoutes');
// const uploadRoutes = require('./src/routes/uploadRoutes'); // <--- 1. ADD THIS

// const app = express();

// // Start Background Jobs
// require('./src/cron/autoSubmit'); 

// // Middleware
// app.use(cors());
// app.use(express.json()); 

// // CRITICAL: Make the 'uploads' folder public so images can be seen
// // Access URL: http://localhost:5000/uploads/filename.jpg
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <--- 2. ADD THIS

// // Use Routes
// app.use('/api/schools', schoolRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/exams', examRoutes);
// app.use('/api/submissions', submissionRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/upload', uploadRoutes); // <--- 3. ADD THIS

// // Basic Route to Test Server
// app.get('/', (req, res) => {
//   res.send('ExamNexus API is running...');
// });

// // START SERVER
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
const express = require('express');
const cors = require('cors');
const path = require('path'); 
const cron = require('node-cron'); // <--- 1. IMPORT CRON
require('dotenv').config();

const { pool } = require('./src/config/db');

// Import Routes
const schoolRoutes = require('./src/routes/schoolRoutes');
const authRoutes = require('./src/routes/authRoutes');
const examRoutes = require('./src/routes/examRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const questionBankRoutes = require('./src/routes/questionBankRoutes'); // <--- IMPORT QUESTION BANK ROUTES

const app = express();

// Start Background Jobs (Existing)
require('./src/cron/autoSubmit'); 

// ==========================================
// 🕒 NEW CRON JOB: AUTO-PUBLISH EXAMS
// ==========================================
// Runs every minute to check for exams scheduled to start now
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find exams that are (Not Published) AND (Auto Publish is ON) AND (Start Time has passed)
    const result = await pool.query(`
      UPDATE exams 
      SET is_published = TRUE 
      WHERE is_published = FALSE 
      AND auto_publish = TRUE 
      AND start_time <= $1
      RETURNING id, title
    `, [now]);

    if (result.rowCount > 0) {
      console.log(`[Auto-Publish] Published ${result.rowCount} exams:`, result.rows.map(r => r.title));
    }
  } catch (err) {
    console.error('[Auto-Publish] Error:', err);
  }
});
// ==========================================


// Middleware
app.use(cors());
app.use(express.json()); 

// Make 'uploads' folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use Routes
app.use('/api/schools', schoolRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bank', questionBankRoutes);

// Basic Route to Test Server
app.get('/', (req, res) => {
  res.send('ExamNexus API is running...');
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});