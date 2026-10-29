CREATE DATABASE IF NOT EXISTS school_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_language CHECK (preferred_language IN ('en', 'am'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description TEXT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  module VARCHAR(80) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade_number SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(50) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grades_number (grade_number),
  CONSTRAINT chk_grades_number CHECK (grade_number BETWEEN 9 AND 12)
) ENGINE=InnoDB;

INSERT IGNORE INTO grades (grade_number, name) VALUES
  (9, 'Grade 9'),
  (10, 'Grade 10'),
  (11, 'Grade 11'),
  (12, 'Grade 12');

CREATE TABLE IF NOT EXISTS academic_years (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Planned',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_years_name (name),
  CONSTRAINT chk_academic_year_dates CHECK (end_date > start_date),
  CONSTRAINT chk_academic_year_status CHECK (status IN ('Planned', 'Active', 'Closed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS terms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Planned',
  PRIMARY KEY (id),
  UNIQUE KEY uq_terms_year_name (academic_year_id, name),
  KEY idx_terms_year_dates (academic_year_id, start_date, end_date),
  CONSTRAINT fk_terms_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT chk_terms_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_terms_status CHECK (status IN ('Planned', 'Active', 'Closed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NOT NULL,
  section_name VARCHAR(20) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  status VARCHAR(20) NOT NULL DEFAULT 'Planned',
  PRIMARY KEY (id),
  UNIQUE KEY uq_sections_year_grade_name (academic_year_id, grade_id, section_name),
  UNIQUE KEY uq_sections_id_year_grade (id, academic_year_id, grade_id),
  UNIQUE KEY uq_sections_id_year (id, academic_year_id),
  KEY idx_sections_grade_year_status (grade_id, academic_year_id, status),
  CONSTRAINT fk_sections_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_sections_grade FOREIGN KEY (grade_id) REFERENCES grades (id) ON DELETE RESTRICT,
  CONSTRAINT chk_sections_capacity CHECK (capacity BETWEEN 1 AND 50),
  CONSTRAINT chk_sections_status CHECK (status IN ('Planned', 'Open', 'Closed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_code VARCHAR(30) NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  name_am VARCHAR(150) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_code (subject_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  student_number VARCHAR(30) NOT NULL,
  legal_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NULL,
  address TEXT NULL,
  admission_date DATE NOT NULL,
  student_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_user (user_id),
  UNIQUE KEY uq_students_number (student_number),
  KEY idx_students_name (legal_name),
  KEY idx_students_status (student_status),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_students_status CHECK (student_status IN ('Active', 'Transferred', 'Completed', 'Withdrawn'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  employee_number VARCHAR(30) NOT NULL,
  employment_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teachers_user (user_id),
  UNIQUE KEY uq_teachers_employee_number (employee_number),
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_teachers_status CHECK (employment_status IN ('Active', 'Inactive', 'On Leave'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registration_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_number VARCHAR(40) NOT NULL,
  applicant_user_id BIGINT UNSIGNED NULL,
  applicant_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NULL,
  contact_information VARCHAR(255) NOT NULL,
  requested_grade_id BIGINT UNSIGNED NOT NULL,
  previous_school VARCHAR(200) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_notes TEXT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_registration_applications_number (application_number),
  KEY idx_applications_status_submitted (status, submitted_at),
  KEY idx_applications_name_dob (applicant_name, date_of_birth),
  CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_applications_grade FOREIGN KEY (requested_grade_id) REFERENCES grades (id) ON DELETE RESTRICT,
  CONSTRAINT fk_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_applications_status CHECK (status IN ('Pending', 'Under Review', 'Requires Correction', 'Approved', 'Rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS application_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  uploaded_by BIGINT UNSIGNED NULL,
  verified_by BIGINT UNSIGNED NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_application_documents_application (application_id),
  CONSTRAINT fk_application_documents_application FOREIGN KEY (application_id) REFERENCES registration_applications (id) ON DELETE RESTRICT,
  CONSTRAINT fk_application_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_application_documents_verifier FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_application_documents_status CHECK (verification_status IN ('Pending', 'Verified', 'Rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NOT NULL,
  section_id BIGINT UNSIGNED NOT NULL,
  allocation_order BIGINT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  enrollment_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollments_student_year (student_id, academic_year_id),
  KEY idx_enrollments_year_grade_section_status (academic_year_id, grade_id, section_id, status),
  KEY idx_enrollments_allocation (academic_year_id, grade_id, allocation_order),
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_grade FOREIGN KEY (grade_id) REFERENCES grades (id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_section_scope FOREIGN KEY (section_id, academic_year_id, grade_id) REFERENCES sections (id, academic_year_id, grade_id) ON DELETE RESTRICT,
  CONSTRAINT chk_enrollments_status CHECK (status IN ('Active', 'Completed', 'Transferred', 'Withdrawn', 'Repeated'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  section_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teacher_assignments_scope (teacher_id, subject_id, section_id, academic_year_id),
  KEY idx_teacher_assignments_teacher_year (teacher_id, academic_year_id),
  CONSTRAINT fk_teacher_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_assignments_section_scope FOREIGN KEY (section_id, academic_year_id) REFERENCES sections (id, academic_year_id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_assignments_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT chk_teacher_assignments_status CHECK (status IN ('Active', 'Inactive'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_controller_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  section_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_controller_scope (teacher_id, section_id, academic_year_id),
  KEY idx_attendance_controller_section (section_id, academic_year_id, active),
  CONSTRAINT fk_attendance_controller_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_controller_section_scope FOREIGN KEY (section_id, academic_year_id) REFERENCES sections (id, academic_year_id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_controller_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_controller_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_enrollment_date (enrollment_id, attendance_date),
  KEY idx_attendance_date_status (attendance_date, status),
  CONSTRAINT fk_attendance_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_attendance_status CHECK (status IN ('Present', 'Absent', 'Late', 'Excused'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grading_schemes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grading_scheme_scope (academic_year_id, grade_id, subject_id, name),
  KEY idx_grading_schemes_status (academic_year_id, grade_id, status),
  CONSTRAINT fk_grading_schemes_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_grading_schemes_grade FOREIGN KEY (grade_id) REFERENCES grades (id) ON DELETE RESTRICT,
  CONSTRAINT fk_grading_schemes_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
  CONSTRAINT fk_grading_schemes_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_grading_schemes_status CHECK (status IN ('Draft', 'Active', 'Archived'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessment_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grading_scheme_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  weight_percentage DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assessment_categories_scheme_name (grading_scheme_id, name),
  CONSTRAINT fk_assessment_categories_scheme FOREIGN KEY (grading_scheme_id) REFERENCES grading_schemes (id) ON DELETE RESTRICT,
  CONSTRAINT chk_assessment_category_weight CHECK (weight_percentage > 0 AND weight_percentage <= 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_assignment_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  max_score DECIMAL(7,2) NOT NULL,
  assessment_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assessments_assignment_term (teacher_assignment_id, term_id),
  CONSTRAINT fk_assessments_teacher_assignment FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_assessments_category FOREIGN KEY (category_id) REFERENCES assessment_categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_assessments_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE RESTRICT,
  CONSTRAINT chk_assessments_max_score CHECK (max_score > 0),
  CONSTRAINT chk_assessments_status CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Published', 'Returned'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id BIGINT UNSIGNED NOT NULL,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(7,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  entered_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marks_assessment_enrollment (assessment_id, enrollment_id),
  KEY idx_marks_enrollment (enrollment_id),
  CONSTRAINT fk_marks_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_marks_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_marks_entered_by FOREIGN KEY (entered_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_marks_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_marks_score CHECK (score >= 0),
  CONSTRAINT chk_marks_status CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Returned'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subject_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  teacher_assignment_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  weighted_score DECIMAL(6,2) NULL,
  rank_in_section SMALLINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subject_results_scope (enrollment_id, teacher_assignment_id, term_id),
  KEY idx_subject_results_publication (enrollment_id, status, term_id),
  CONSTRAINT fk_subject_results_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_subject_results_assignment FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_subject_results_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE RESTRICT,
  CONSTRAINT fk_subject_results_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_subject_results_score CHECK (weighted_score IS NULL OR weighted_score BETWEEN 0 AND 100),
  CONSTRAINT chk_subject_results_status CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Published', 'Returned'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_year_summaries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  average_score DECIMAL(6,2) NULL,
  rank_in_grade SMALLINT UNSIGNED NULL,
  progression_decision VARCHAR(30) NOT NULL DEFAULT 'Review Required',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_year_summaries_enrollment (enrollment_id),
  CONSTRAINT fk_student_year_summaries_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_year_summaries_approver FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_student_year_average CHECK (average_score IS NULL OR average_score BETWEEN 0 AND 100),
  CONSTRAINT chk_student_year_progression CHECK (progression_decision IN ('Promoted', 'Repeat', 'Review Required', 'Completed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS timetable_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_assignment_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_timetable_day_time (day_of_week, start_time, end_time),
  KEY idx_timetable_assignment (teacher_assignment_id, day_of_week),
  CONSTRAINT fk_timetable_teacher_assignment FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT chk_timetable_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_timetable_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  direction VARCHAR(20) NOT NULL,
  transfer_type VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_by BIGINT UNSIGNED NULL,
  processed_at TIMESTAMP NULL,
  decision_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_transfers_student_status (student_id, status),
  CONSTRAINT fk_student_transfers_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_transfers_processor FOREIGN KEY (processed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_student_transfers_direction CHECK (direction IN ('Incoming', 'Outgoing')),
  CONSTRAINT chk_student_transfers_status CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Completed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transfer_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transfer_documents_transfer (transfer_id),
  CONSTRAINT fk_transfer_documents_transfer FOREIGN KEY (transfer_id) REFERENCES student_transfers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS certificates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  certificate_type VARCHAR(80) NOT NULL,
  certificate_number VARCHAR(50) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Issued',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_certificates_number (certificate_number),
  KEY idx_certificates_student (student_id, issued_at),
  CONSTRAINT fk_certificates_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_issuer FOREIGN KEY (issued_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_certificates_status CHECK (status IN ('Issued', 'Revoked'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile_correction_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  requested_changes JSON NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_profile_correction_requests_status (status, created_at),
  CONSTRAINT fk_profile_correction_requests_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
  CONSTRAINT fk_profile_correction_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_profile_correction_requests_status CHECK (status IN ('Pending', 'Approved', 'Rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  request_id VARCHAR(100) NULL,
  summary JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_actor_time (actor_user_id, created_at),
  KEY idx_audit_logs_entity (entity_type, entity_id, created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS backup_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Running',
  storage_reference VARCHAR(500) NULL,
  initiated_by BIGINT UNSIGNED NULL,
  error_summary TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_backup_records_status_time (status, started_at),
  CONSTRAINT fk_backup_records_initiator FOREIGN KEY (initiated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_backup_records_status CHECK (status IN ('Running', 'Succeeded', 'Failed'))
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (name, description, is_system_role) VALUES
  ('Super Admin', 'Full system administration access.', TRUE),
  ('Registrar', 'Admissions, student records, enrollment, and reporting.', TRUE),
  ('Teacher', 'Assigned classes, assessments, marks, and results.', TRUE),
  ('Attendance Controller', 'Attendance access for assigned sections.', TRUE),
  ('Student', 'Self-service access to the student''s own records.', TRUE);
