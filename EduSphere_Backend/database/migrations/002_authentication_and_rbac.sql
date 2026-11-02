USE school_db;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_expiry (user_id, expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions (name, module, description) VALUES
  ('users.manage', 'users', 'Create, view, update, and deactivate user accounts.'),
  ('roles.manage', 'roles', 'Create roles and assign permissions to roles.'),
  ('permissions.manage', 'permissions', 'Create and view permissions.'),
  ('audit.read', 'audit', 'Review administrative audit events.'),
  ('admissions.read', 'admissions', 'View admissions workspace.'),
  ('students.read', 'students', 'View student workspace.'),
  ('academics.read', 'academics', 'View academic setup workspace.'),
  ('teaching.read', 'teaching', 'View teaching workspace.'),
  ('attendance.read', 'attendance', 'Access attendance for assigned sections.'),
  ('assessments.read', 'assessments', 'View assessments and results workspace.'),
  ('timetable.read', 'timetable', 'View timetable workspace.'),
  ('records.read', 'records', 'View transfers and certificates workspace.'),
  ('reports.read', 'reports', 'View reports workspace.'),
  ('system.health.read', 'system', 'View system health information.');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'admissions.read', 'students.read', 'academics.read', 'reports.read'
)
WHERE r.name = 'Registrar';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'teaching.read', 'assessments.read', 'timetable.read', 'academics.read'
)
WHERE r.name = 'Teacher';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'attendance.read'
WHERE r.name = 'Attendance Controller';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('students.read', 'timetable.read', 'records.read')
WHERE r.name = 'Student';
