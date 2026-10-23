-- The Friend Zone Schema
-- Tables: user_profiles, rooms, room_players, saved_questions, custom_packs

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🎮',
  email TEXT,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  truths_completed INT NOT NULL DEFAULT 0,
  dares_completed INT NOT NULL DEFAULT 0,
  unlocked_packs TEXT[] NOT NULL DEFAULT '{"pack_starter"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby',
  current_round INT NOT NULL DEFAULT 0,
  total_rounds INT NOT NULL DEFAULT 5,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Room Players
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🎮',
  score INT NOT NULL DEFAULT 0,
  lives INT NOT NULL DEFAULT 10,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  connected BOOLEAN NOT NULL DEFAULT true,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(room_code, player_id)
);

-- 4. Saved Questions (Favorites)
CREATE TABLE IF NOT EXISTS public.saved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  guest_id TEXT,
  game_type TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Custom Packs
CREATE TABLE IF NOT EXISTS public.custom_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  category TEXT NOT NULL,
  game_types TEXT[] NOT NULL DEFAULT '{}',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS Security Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_packs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for guest room sessions
CREATE POLICY "Public can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Public can insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update rooms" ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "Public can view room players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Public can insert room players" ON public.room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update room players" ON public.room_players FOR UPDATE USING (true);
CREATE POLICY "Public can delete room players" ON public.room_players FOR DELETE USING (true);

-- User Profiles policy
CREATE POLICY "Users can view all public profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Saved questions policy
CREATE POLICY "Users can view own saved questions" ON public.saved_questions FOR SELECT 
  USING (auth.uid() = user_id OR guest_id IS NOT NULL);
CREATE POLICY "Users can insert saved questions" ON public.saved_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own saved questions" ON public.saved_questions FOR DELETE 
  USING (auth.uid() = user_id OR guest_id IS NOT NULL);

-- Enable Supabase Realtime publication for rooms and room_players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;
END $$;
