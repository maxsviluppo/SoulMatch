-- ============================================================
-- FIX REPORTS TABLE RLS & PERMISSIONS
-- Esegui questo nel Supabase SQL Editor
-- ============================================================

-- Assicuriamoci che la tabella reports esista e abbia le colonne corrette
-- Nota: assumiamo che la tabella esista già se il sistema la usa.

-- Disabilita RLS per semplicità (coerente con setup_database_complete.sql)
-- o abilitalo con policy aperte per anon se l'admin non usa auth.
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;

-- Permessi completi per tutti i ruoli così che l'admin possa operare
GRANT ALL ON TABLE public.reports TO anon, authenticated, service_role;

-- Se is_read non esiste, aggiungiamola
-- ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Assicuriamoci che i permessi sulle sequenze siano corretti
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
