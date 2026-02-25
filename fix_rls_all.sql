-- ============================================================
-- FIX COMPLETO POLICY RLS - SoulMatch
-- Incolla ed esegui tutto questo nel Supabase SQL Editor
-- ============================================================

-- 1. USERS table
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles" ON public.users
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
CREATE POLICY "Users can delete their own profile" ON public.users
FOR DELETE TO authenticated USING (auth.uid() = id);

-- 2. INTERACTIONS table (Like/Heart on profiles)
ALTER TABLE IF EXISTS public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view interactions" ON public.interactions;
CREATE POLICY "Anyone can view interactions" ON public.interactions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.interactions;
CREATE POLICY "Users can insert their own interactions" ON public.interactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their own interactions" ON public.interactions;
CREATE POLICY "Users can update their own interactions" ON public.interactions
FOR UPDATE TO authenticated USING (auth.uid() = from_user_id) WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can delete their interactions" ON public.interactions;
CREATE POLICY "Users can delete their interactions" ON public.interactions
FOR DELETE TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 3. POSTS table
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view posts" ON public.posts
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. POST_INTERACTIONS table (Like/Heart on posts)
ALTER TABLE IF EXISTS public.post_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post interactions" ON public.post_interactions;
CREATE POLICY "Anyone can view post interactions" ON public.post_interactions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert post interactions" ON public.post_interactions;
CREATE POLICY "Users can insert post interactions" ON public.post_interactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own post interactions" ON public.post_interactions;
CREATE POLICY "Users can delete their own post interactions" ON public.post_interactions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. CHAT_REQUESTS table
ALTER TABLE IF EXISTS public.chat_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own chats" ON public.chat_requests;
CREATE POLICY "Users can see their own chats" ON public.chat_requests
FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send chat requests" ON public.chat_requests;
CREATE POLICY "Users can send chat requests" ON public.chat_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their chat requests" ON public.chat_requests;
CREATE POLICY "Users can update their chat requests" ON public.chat_requests
FOR UPDATE TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can delete their chat requests" ON public.chat_requests;
CREATE POLICY "Users can delete their chat requests" ON public.chat_requests
FOR DELETE TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 6. SOUL_LINKS table
ALTER TABLE IF EXISTS public.soul_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their soul links" ON public.soul_links;
CREATE POLICY "Users can view their soul links" ON public.soul_links
FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send soul links" ON public.soul_links;
CREATE POLICY "Users can send soul links" ON public.soul_links
FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update soul links" ON public.soul_links;
CREATE POLICY "Users can update soul links" ON public.soul_links
FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete soul links" ON public.soul_links;
CREATE POLICY "Users can delete soul links" ON public.soul_links
FOR DELETE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================
-- FATTO! Tutte le tabelle ora hanno le policy RLS corrette.
-- ============================================================
