-- ============================================================================
-- ExamNexus Database Schema - Create Tables
-- ============================================================================
-- This file contains all CREATE TABLE statements for the ExamNexus application
-- Tables are ordered by dependency (no foreign key constraints to undefined tables)
-- ============================================================================

-- 1. SCHOOLS TABLE (Base/Root table - no dependencies)
-- ============================================================================
-- Table: public.schools
-- Description: Represents the tenants (schools) in the multi-tenant platform
-- Each school has its own subdomain and admin
-- DROP TABLE IF EXISTS public.schools;

CREATE TABLE IF NOT EXISTS public.schools
(
    id integer NOT NULL DEFAULT nextval('schools_id_seq'::regclass),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    subdomain character varying(50) COLLATE pg_catalog."default" NOT NULL,
    admin_email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    logo_url text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schools_pkey PRIMARY KEY (id),
    CONSTRAINT schools_admin_email_key UNIQUE (admin_email),
    CONSTRAINT schools_subdomain_key UNIQUE (subdomain)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.schools
    OWNER to postgres;


-- 2. USERS TABLE (Teachers & Students)
-- ============================================================================
-- Table: public.users
-- Description: All users in the system (Teachers, Students, Admins)
-- Unique constraint on (school_id, email) ensures email uniqueness within a school
-- but allows the same email across different schools
-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    school_id integer,
    full_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role character varying(20) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_school_id_email_key UNIQUE (school_id, email),
    CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id)
        REFERENCES public.schools (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['TEACHER'::character varying, 'STUDENT'::character varying, 'ADMIN'::character varying]::text[]))
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;


-- 3. EXAMS TABLE
-- ============================================================================
-- Table: public.exams
-- Description: Represents exams created by teachers
-- Stores exam metadata and scheduling information
-- DROP TABLE IF EXISTS public.exams;

CREATE TABLE IF NOT EXISTS public.exams
(
    id integer NOT NULL DEFAULT nextval('exams_id_seq'::regclass),
    school_id integer,
    teacher_id integer,
    title character varying(200) COLLATE pg_catalog."default" NOT NULL,
    instructions text COLLATE pg_catalog."default",
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    is_published boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_via character varying(20) COLLATE pg_catalog."default" DEFAULT 'MANUAL'::character varying,
    is_open_to_all boolean DEFAULT true,
    auto_publish boolean DEFAULT false,
    CONSTRAINT exams_pkey PRIMARY KEY (id),
    CONSTRAINT exams_school_id_fkey FOREIGN KEY (school_id)
        REFERENCES public.schools (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT exams_teacher_id_fkey FOREIGN KEY (teacher_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.exams
    OWNER to postgres;


-- 4. QUESTIONS TABLE
-- ============================================================================
-- Table: public.questions
-- Description: Questions associated with specific exams
-- Options are stored as JSONB for flexibility with different question types
-- DROP TABLE IF EXISTS public.questions;

CREATE TABLE IF NOT EXISTS public.questions
(
    id integer NOT NULL DEFAULT nextval('questions_id_seq'::regclass),
    exam_id integer,
    question_text text COLLATE pg_catalog."default" NOT NULL,
    question_type character varying(20) COLLATE pg_catalog."default" DEFAULT 'MCQ'::character varying,
    options jsonb NOT NULL,
    points integer DEFAULT 1,
    image_url text COLLATE pg_catalog."default",
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id)
        REFERENCES public.exams (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.questions
    OWNER to postgres;


-- 5. QUESTION_BANK TABLE
-- ============================================================================
-- Table: public.question_bank
-- Description: Reusable question bank maintained by teachers
-- Teachers can create questions here and reuse them across multiple exams
-- DROP TABLE IF EXISTS public.question_bank;

CREATE TABLE IF NOT EXISTS public.question_bank
(
    id integer NOT NULL DEFAULT nextval('question_bank_id_seq'::regclass),
    school_id integer,
    teacher_id integer,
    subject character varying(50) COLLATE pg_catalog."default" NOT NULL,
    difficulty character varying(20) COLLATE pg_catalog."default" DEFAULT 'Medium'::character varying,
    question_text text COLLATE pg_catalog."default" NOT NULL,
    options jsonb NOT NULL,
    points integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT question_bank_pkey PRIMARY KEY (id),
    CONSTRAINT question_bank_school_id_fkey FOREIGN KEY (school_id)
        REFERENCES public.schools (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT question_bank_teacher_id_fkey FOREIGN KEY (teacher_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.question_bank
    OWNER to postgres;


-- 6. EXAM_ASSIGNMENTS TABLE
-- ============================================================================
-- Table: public.exam_assignments
-- Description: Maps exams to students (which students take which exams)
-- Composite primary key (exam_id, student_id) ensures a student is assigned only once per exam
-- DROP TABLE IF EXISTS public.exam_assignments;

CREATE TABLE IF NOT EXISTS public.exam_assignments
(
    exam_id integer NOT NULL,
    student_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT exam_assignments_pkey PRIMARY KEY (exam_id, student_id),
    CONSTRAINT exam_assignments_exam_id_fkey FOREIGN KEY (exam_id)
        REFERENCES public.exams (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT exam_assignments_student_id_fkey FOREIGN KEY (student_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.exam_assignments
    OWNER to postgres;


-- 7. SUBMISSIONS TABLE
-- ============================================================================
-- Table: public.submissions
-- Description: Student exam submissions and their answers
-- Stores the student's responses, score, and proctoring violation count
-- draft_answers is stored as JSONB for flexible storage of answer data
-- DROP TABLE IF EXISTS public.submissions;

CREATE TABLE IF NOT EXISTS public.submissions
(
    id integer NOT NULL DEFAULT nextval('submissions_id_seq'::regclass),
    exam_id integer,
    student_id integer,
    score integer DEFAULT 0,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'COMPLETED'::character varying,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    violation_count integer DEFAULT 0,
    draft_answers jsonb,
    CONSTRAINT submissions_pkey PRIMARY KEY (id),
    CONSTRAINT submissions_exam_id_fkey FOREIGN KEY (exam_id)
        REFERENCES public.exams (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.submissions
    OWNER to postgres;


-- ============================================================================
-- END OF CREATE TABLES
-- ============================================================================
