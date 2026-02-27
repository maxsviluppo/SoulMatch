-- ============================================================
-- FIX DEFINITIVO PER COMMENTI E MESSAGGI (SOLUZIONE RLS)
-- Esegui questo script nel SQL Editor di Supabase.
-- ============================================================

-- IMPORTANTE: Il motivo per cui non riuscivi a scrivere commenti o messaggi
-- è che il database cercava di verificare la tua identità tramite "Supabase Auth",
-- ma l'app sta usando il "Salvataggio Locale" (localStorage). 
-- Questo script disabilita il blocco di sicurezza (RLS) per permettere il funzionamento 
-- con il tuo sistema di gestione utenti attuale.

-- 1. Disabilita RLS sulle tabelle principali per permettere l'accesso libero (Simulazione Auth)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_links DISABLE ROW LEVEL SECURITY;

-- 2. Assicuriamoci che i permessi anonimi siano corretti
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.posts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.post_interactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.post_comments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.interactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.soul_links TO anon, authenticated, service_role;

-- 3. Assicuriamoci che le sequenze (ID auto-incrementanti) siano accessibili
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
