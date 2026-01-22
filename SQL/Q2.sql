-- Run in your Database Tool (pgAdmin/DBeaver)
-- Replace '1' with your actual School ID
INSERT INTO users (school_id, full_name, email, password_hash, role) 
VALUES (1, 'Student One', 'student@school.com', 'hashed_password_here', 'STUDENT');