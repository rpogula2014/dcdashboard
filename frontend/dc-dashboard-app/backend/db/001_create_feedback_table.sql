-- Migration: Create AI Chat Feedback Table
-- Database: postgres://cocoindex:cocoindex@localhost/cocoindex
-- Created: 2025-12-05

-- Table to store user feedback on AI responses in Talk to Data feature
CREATE TABLE IF NOT EXISTS ai_chat_feedback (
    id SERIAL PRIMARY KEY,
    user_question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    dcid VARCHAR(50) NOT NULL,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('good', 'bad')),
    feedback_text TEXT,
    user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on dcid for filtering by organization
CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_dcid ON ai_chat_feedback(dcid);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_created_at ON ai_chat_feedback(created_at DESC);

-- Index on rating for filtering good/bad feedback
CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_rating ON ai_chat_feedback(rating);

-- Comment on table
COMMENT ON TABLE ai_chat_feedback IS 'Stores user feedback (thumbs up/down) on AI responses in Talk to Data feature';
COMMENT ON COLUMN ai_chat_feedback.user_question IS 'The question the user asked';
COMMENT ON COLUMN ai_chat_feedback.ai_response IS 'The AI response that was rated';
COMMENT ON COLUMN ai_chat_feedback.dcid IS 'Organization/DC identifier';
COMMENT ON COLUMN ai_chat_feedback.rating IS 'User rating: good or bad';
COMMENT ON COLUMN ai_chat_feedback.feedback_text IS 'Optional text feedback from user';
COMMENT ON COLUMN ai_chat_feedback.user_email IS 'User email (hardcoded for now, Okta later)';
COMMENT ON COLUMN ai_chat_feedback.created_at IS 'Timestamp when feedback was submitted';
