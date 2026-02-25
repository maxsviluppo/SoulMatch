-- Enable DELETE operations for users on their own data

-- 1. USERS table: a user can delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.users 
FOR DELETE 
USING (auth.uid() = id);

-- 2. INTERACTIONS table: a user can delete interactions they made or received
CREATE POLICY "Users can delete their interactions" 
ON public.interactions 
FOR DELETE 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 3. CHAT_REQUESTS table: a user can delete their chat history (sent or received)
-- Corrected column names: from_user_id and to_user_id
CREATE POLICY "Users can delete their chat requests" 
ON public.chat_requests 
FOR DELETE 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 4. POSTS table: a user can delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- 5. POST_INTERACTIONS table: a user can delete their own post interactions
CREATE POLICY "Users can delete their own post interactions" 
ON public.post_interactions 
FOR DELETE 
USING (auth.uid() = user_id);
