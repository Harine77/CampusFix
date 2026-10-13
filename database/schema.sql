CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'staff', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(140) NOT NULL CHECK (length(trim(title)) >= 5),
  description TEXT NOT NULL CHECK (length(trim(description)) >= 15),
  category VARCHAR(40) NOT NULL CHECK (category IN ('Electrical', 'Plumbing', 'Furniture', 'IT & Wi-Fi', 'Classroom Equipment', 'Cleanliness', 'Safety', 'Other')),
  location VARCHAR(140) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected')),
  reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_staff_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  resolution_comment TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status <> 'Rejected') OR (rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0)),
  CHECK ((status <> 'Resolved') OR (resolution_comment IS NOT NULL AND length(trim(resolution_comment)) > 0))
);

CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  staff_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_history (
  id BIGSERIAL PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaints_reporter_idx ON complaints(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_assignee_idx ON complaints(assigned_staff_id, status);
CREATE INDEX IF NOT EXISTS complaints_filter_idx ON complaints(status, category, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS assignments_complaint_idx ON assignments(complaint_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS history_complaint_idx ON complaint_history(complaint_id, created_at DESC);
