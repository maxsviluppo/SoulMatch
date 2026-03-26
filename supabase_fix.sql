-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.site_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Force RLS to be disabled for easy access by the node server
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;

-- 3. Ensure permissions are set for the anon role (the one used by the supabase key in server.ts)
GRANT ALL ON public.site_settings TO anon;
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO postgres;
GRANT ALL ON public.site_settings TO service_role;

-- 4. Insert default SEO if not present (optional)
INSERT INTO public.site_settings (key, value)
VALUES ('seo_configs', '{"title": "SoulMatch", "description": "L''app per anime gemelle", "htmlTag": "<meta name=\"google-site-verification\" content=\"-3T4sAfXQecLX8oMrQlfCSQGo2QY8JMDCgl1kqoNi8s\" />"}')
ON CONFLICT (key) DO NOTHING;
