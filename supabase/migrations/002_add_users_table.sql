-- ============================================================
-- 002_add_users_table.sql
-- Add users table for account management (separate from
-- tournament participants). Link participants to users.
-- ============================================================

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  phone      text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE participants ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_participants_user_id ON participants (user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_users" ON users FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Migrate existing participants into users table, then link them
INSERT INTO users (name, email, phone, created_at)
SELECT name, email, phone, created_at FROM participants;

UPDATE participants p
SET user_id = u.id
FROM users u
WHERE p.email = u.email;
