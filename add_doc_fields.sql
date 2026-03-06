-- Esegui questo SQL nel tuo progetto Supabase (SQL Editor)
-- Aggiunge i campi per la gestione avanzata della validazione documenti

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS doc_rejected      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_rejected_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_validated      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_blocked        BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN     DEFAULT FALSE;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_users_doc_rejected  ON users(doc_rejected)  WHERE doc_rejected = true;
CREATE INDEX IF NOT EXISTS idx_users_is_suspended  ON users(is_suspended)  WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_users_is_validated  ON users(is_validated)  WHERE is_validated = true;

ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_warning_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
