-- 1. SCHOOLS (The Tenants)
-- This table holds the "Admin" accounts for each school
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'greenwood'.examnexus.com
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS (Teachers & Students)
-- All users belong to a specific school
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('TEACHER', 'STUDENT')),
    
    -- Constraint: An email must be unique *within* a school, 
    -- but two different schools can have a student named "john@gmail.com"
    UNIQUE (school_id, email) 
);

-- 3. EXAMS
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id), -- Critical for isolation
    teacher_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    instructions TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_published BOOLEAN DEFAULT FALSE, -- Results published?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUESTIONS (The Question Bank)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'MCQ',
    
    -- We store options as a JSON array for flexibility
    -- e.g., [{"text": "Paris", "is_correct": true}, {"text": "London", "is_correct": false}]
    options JSONB NOT NULL, 
    
    points INTEGER DEFAULT 1
);

-- 5. SUBMISSIONS (Student Answers)
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id),
    student_id INTEGER REFERENCES users(id),
    score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'COMPLETED', -- or 'FLAGGED' for cheating
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);