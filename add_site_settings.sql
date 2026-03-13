-- ============================================================
-- AGGIUNTA TABELLA IMPOSTAZIONI SITO (HOME SLIDER)
-- Esegui questo nel SQL Editor di Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserimento Slider Iniziale
INSERT INTO public.site_settings (key, value) 
VALUES ('home_slider', '["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop", "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80&w=2000&auto=format&fit=crop", "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=2000&auto=format&fit=crop"]')
ON CONFLICT (key) DO NOTHING;

-- Permessi (RLS Disabilitato per semplicità come richiesto dal progetto)
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.site_settings TO anon, authenticated, service_role;
