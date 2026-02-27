-- 1. POST_COMMENTS table
ALTER TABLE IF EXISTS public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post comments" ON public.post_comments;
CREATE POLICY "Anyone can view post comments" ON public.post_comments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert post comments" ON public.post_comments;
CREATE POLICY "Users can insert post comments" ON public.post_comments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own post comments" ON public.post_comments;
CREATE POLICY "Users can update their own post comments" ON public.post_comments
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own post comments" ON public.post_comments;
CREATE POLICY "Users can delete their own post comments" ON public.post_comments
FOR DELETE TO authenticated USING (auth.uid() = user_id);
