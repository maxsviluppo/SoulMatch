-- Migration: Add last_seen column to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users
UPDATE public.users SET last_seen = NOW() WHERE last_seen IS NULL;
