UPDATE users SET email = 'sikunaniket1234@gmail.com' WHERE role = 'STUDENT';

ALTER TABLE exams ADD COLUMN created_via VARCHAR(20) DEFAULT 'MANUAL';

ALTER TABLE submissions ADD COLUMN violation_count INTEGER DEFAULT 0;

ALTER TABLE submissions ADD COLUMN draft_answers JSONB;

ALTER TABLE questions ADD COLUMN image_url TEXT;