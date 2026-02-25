-- ============================================================
--  SoulMatch — Create soul_links table
--  Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.soul_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_soul_links_sender   ON public.soul_links(sender_id);
CREATE INDEX IF NOT EXISTS idx_soul_links_receiver ON public.soul_links(receiver_id);
CREATE INDEX IF NOT EXISTS idx_soul_links_status   ON public.soul_links(status);

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_soul_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS soul_links_updated_at ON public.soul_links;
CREATE TRIGGER soul_links_updated_at
  BEFORE UPDATE ON public.soul_links
  FOR EACH ROW EXECUTE FUNCTION update_soul_links_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.soul_links ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view their soul_links"         ON public.soul_links;
DROP POLICY IF EXISTS "Users can send soul_link requests"       ON public.soul_links;
DROP POLICY IF EXISTS "Receiver can update soul_link status"    ON public.soul_links;
DROP POLICY IF EXISTS "Users can delete their soul_links"       ON public.soul_links;

CREATE POLICY "Users can view their soul_links"
  ON public.soul_links FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send soul_link requests"
  ON public.soul_links FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can update soul_link status"
  ON public.soul_links FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can delete their soul_links"
  ON public.soul_links FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
