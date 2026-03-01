CREATE TABLE IF NOT EXISTS public.room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.room_messages DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.room_messages TO anon, authenticated, service_role;

-- IMPORTANTE: Abilita il Realtime sulla tabella room_messages per far funzionare i messaggi istantanei
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
    END IF;
END
$$;
