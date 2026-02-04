-- Create chats, chat_participants, messages and notifications tables

CREATE TABLE IF NOT EXISTS chats (
  chat_id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id INTEGER NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  role TEXT DEFAULT 'member',
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  message_id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
