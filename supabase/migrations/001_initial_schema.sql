-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for Mishna Madness tournament application
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  phone      text NOT NULL,
  seed       integer,
  eliminated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tournaments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  status                text CHECK (status IN ('registration', 'active', 'completed')) DEFAULT 'registration',
  current_round         integer DEFAULT 1 CHECK (current_round BETWEEN 1 AND 6),
  registration_deadline timestamptz NOT NULL,
  created_at            timestamptz DEFAULT now()
);

CREATE TABLE rounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number    integer NOT NULL CHECK (round_number BETWEEN 1 AND 6),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  special_seder   text,
  status          text CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  UNIQUE (tournament_id, round_number)
);

CREATE TABLE matchups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id          uuid REFERENCES rounds(id) ON DELETE CASCADE,
  matchup_number    integer NOT NULL,
  participant_1_id  uuid REFERENCES participants(id) ON DELETE SET NULL,
  participant_2_id  uuid REFERENCES participants(id) ON DELETE SET NULL,
  special_masechta  text NOT NULL,
  winner_id         uuid REFERENCES participants(id) ON DELETE SET NULL,
  next_matchup_id   uuid REFERENCES matchups(id) ON DELETE SET NULL,
  p1_total_score    integer DEFAULT 0,
  p2_total_score    integer DEFAULT 0
);

CREATE TABLE score_submissions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchup_id               uuid REFERENCES matchups(id) ON DELETE CASCADE,
  participant_id           uuid REFERENCES participants(id) ON DELETE CASCADE,
  masechta                 text NOT NULL,
  seder                    text NOT NULL,
  mishnayos_count          integer NOT NULL CHECK (mishnayos_count > 0),
  is_special_masechta      boolean DEFAULT false,
  is_special_seder         boolean DEFAULT false,
  learned_entire_masechta  boolean DEFAULT false,
  raw_points               integer NOT NULL,
  multiplied_points        integer NOT NULL,
  submitted_at             timestamptz DEFAULT now(),
  is_late                  boolean DEFAULT false
);

CREATE TABLE notifications_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  type           text CHECK (type IN ('bracket_update', 'reminder_5pm', 'reminder_9pm', 'late_grace_8am', 'round_results')) NOT NULL,
  sent_at        timestamptz DEFAULT now(),
  channel        text CHECK (channel IN ('email', 'sms')) NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_matchups_round_id          ON matchups (round_id);
CREATE INDEX idx_matchups_participant_1_id  ON matchups (participant_1_id);
CREATE INDEX idx_matchups_participant_2_id  ON matchups (participant_2_id);
CREATE INDEX idx_score_submissions_matchup  ON score_submissions (matchup_id);
CREATE INDEX idx_score_submissions_participant ON score_submissions (participant_id);
CREATE INDEX idx_notifications_log_participant ON notifications_log (participant_id);
CREATE INDEX idx_rounds_tournament_id       ON rounds (tournament_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log  ENABLE ROW LEVEL SECURITY;

-- Permissive policies — app uses server-side admin client for auth
CREATE POLICY "allow_all_participants"      ON participants       FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tournaments"       ON tournaments        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rounds"            ON rounds             FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_matchups"          ON matchups           FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_score_submissions" ON score_submissions  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notifications_log" ON notifications_log  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
