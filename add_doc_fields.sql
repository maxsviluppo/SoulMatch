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
