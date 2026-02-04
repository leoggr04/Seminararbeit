-- Migration: create participants table for activity posts
CREATE TABLE IF NOT EXISTS activity_participants (
  post_id INTEGER NOT NULL REFERENCES activity_posts(post_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_participants_post_id ON activity_participants(post_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_user_id ON activity_participants(user_id);
