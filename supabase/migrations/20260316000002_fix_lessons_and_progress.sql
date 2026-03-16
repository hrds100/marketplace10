-- Add missing columns to lessons table
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tier_required TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Fix user_progress: add unique constraint
ALTER TABLE user_progress
  DROP CONSTRAINT IF EXISTS user_progress_unique_step;

ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_unique_step
  UNIQUE (user_id, module_id, lesson_id, step_index);

ALTER TABLE user_progress
  ALTER COLUMN completed SET DEFAULT false;
