-- Run these statements in the Supabase SQL editor (https://app.supabase.com) for the project.

-- Enable uuid generation extension (usually already available)
create extension if not exists "uuid-ossp";

-- Create cats table
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  temperament text,
  indoor boolean default false,
  notes text,
  lat double precision,
  lng double precision,
  image text,
  created_at timestamptz default now(),
  owner uuid references auth.users(id) on delete set null
);

-- Index for geospatial-ish queries (simple)
create index if not exists idx_cats_created_at on public.cats (created_at desc);
create index if not exists idx_cats_location on public.cats (lat, lng);

-- Row level security: require authenticated users to insert/update/delete their own rows
alter table public.cats enable row level security;

-- Allow anyone to select (read) cats
create policy "public_select" on public.cats
  for select
  using ( true );

-- Allow authenticated users to insert (owner must be their own uid or null)
create policy "authenticated_insert" on public.cats
  for insert
  with check ( auth.role() = 'authenticated' AND (owner IS NULL OR owner = auth.uid()) );

-- Allow owners to update their own rows
create policy "owners_update" on public.cats
  for update
  using ( owner = auth.uid() )
  with check ( owner = auth.uid() );

-- Allow owners to delete their own rows
create policy "owners_delete" on public.cats
  for delete
  using ( owner = auth.uid() );

-- Example seed data (optional)
-- insert into public.cats (name, type, temperament, indoor, notes, lat, lng) values
-- ('Mochi','Domestic Shorthair','Friendly', false, 'Often seen near the coffee shop.', 37.7749, -122.4194);

-- Storage bucket creation (run in Supabase Storage UI or via API): create a bucket named 'cat-images' and set it public if you want direct public links.
-- To create a public bucket via SQL is not supported; use the Supabase UI: Storage -> Create new bucket -> Name: cat-images -> Public: On

-- After creating the bucket, you can control access via signed URLs or public files.

-- Notes:
-- - If you want public select to be restricted, change the select policy to 'owner = auth.uid()' instead of true.
-- - The 'owner' column is optional but helpful to enforce user-level permissions.
-- - gen_random_uuid() requires the pgcrypto extension; if not available, you can use uuid_generate_v4() from uuid-ossp extension.

-- name_unknown support
ALTER TABLE public.cats ADD COLUMN IF NOT EXISTS name_unknown boolean DEFAULT false;

-- ────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  city text,
  push_token text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using ( true );

create policy "profiles_insert" on public.profiles
  for insert with check ( id = auth.uid() );

create policy "profiles_update" on public.profiles
  for update using ( id = auth.uid() ) with check ( id = auth.uid() );

create policy "profiles_delete" on public.profiles
  for delete using ( id = auth.uid() );

-- ────────────────────────────────────────────────
-- follows
-- ────────────────────────────────────────────────
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "follows_select" on public.follows
  for select using ( true );

create policy "follows_insert" on public.follows
  for insert with check ( follower_id = auth.uid() );

create policy "follows_delete" on public.follows
  for delete using ( follower_id = auth.uid() );

-- ────────────────────────────────────────────────
-- checkins
-- ────────────────────────────────────────────────
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  author uuid references auth.users(id) on delete set null,
  author_name text,
  note text not null,
  created_at timestamptz default now()
);

alter table public.checkins enable row level security;

create policy "checkins_select" on public.checkins
  for select using ( true );

create policy "checkins_insert" on public.checkins
  for insert with check ( auth.role() = 'authenticated' AND (author IS NULL OR author = auth.uid()) );

create policy "checkins_delete" on public.checkins
  for delete using ( author = auth.uid() );

-- ────────────────────────────────────────────────
-- cat_likes
-- ────────────────────────────────────────────────
create table if not exists public.cat_likes (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (cat_id, user_id)
);

alter table public.cat_likes enable row level security;

create policy "cat_likes_select" on public.cat_likes
  for select using ( true );

create policy "cat_likes_insert" on public.cat_likes
  for insert with check ( user_id = auth.uid() );

create policy "cat_likes_delete" on public.cat_likes
  for delete using ( user_id = auth.uid() );

-- ────────────────────────────────────────────────
-- cat_photos
-- ────────────────────────────────────────────────
create table if not exists public.cat_photos (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  url text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.cat_photos enable row level security;

create policy "cat_photos_select" on public.cat_photos
  for select using ( true );

create policy "cat_photos_insert" on public.cat_photos
  for insert with check ( auth.role() = 'authenticated' AND (uploaded_by IS NULL OR uploaded_by = auth.uid()) );

create policy "cat_photos_delete" on public.cat_photos
  for delete using ( uploaded_by = auth.uid() );

-- Allow authenticated users to suggest a real name for unknown-name cats
CREATE OR REPLACE FUNCTION public.suggest_cat_name(cat_id uuid, suggested_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.cats
  SET name = suggested_name, name_unknown = false
  WHERE id = cat_id AND name_unknown = true;
END;
$$;

-- Restrict suggest_cat_name to authenticated users only
REVOKE EXECUTE ON FUNCTION public.suggest_cat_name(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.suggest_cat_name(uuid, text) TO authenticated;

-- ────────────────────────────────────────────────
-- Input length constraints
-- ────────────────────────────────────────────────
ALTER TABLE public.cats
  ADD CONSTRAINT cats_name_length    CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT cats_notes_length   CHECK (char_length(notes) <= 1000),
  ADD CONSTRAINT cats_type_length    CHECK (char_length(type) <= 100),
  ADD CONSTRAINT cats_temperament_length CHECK (char_length(temperament) <= 100);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 1 AND 50),
  ADD CONSTRAINT profiles_city_length     CHECK (char_length(city) <= 100);

ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_note_length CHECK (char_length(note) BETWEEN 1 AND 500);
