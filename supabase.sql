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

-- ────────────────────────────────────────────────
-- Push notifications
-- ────────────────────────────────────────────────

-- Async HTTP from Postgres (available on Supabase). Lets triggers call the
-- Expo push service without blocking the write that triggered them.
create extension if not exists pg_net;

-- Private per-user settings: push token, last-known location (for "cat added
-- near me") and per-category prefs. Kept OUT of `profiles` because that table
-- is world-readable — a push token / location must only be visible to its
-- owner. Server-side triggers read this via SECURITY DEFINER (bypassing RLS).
create table if not exists public.user_settings (
  id              uuid primary key references auth.users(id) on delete cascade,
  push_token      text,
  lat             double precision,
  lng             double precision,
  notify_nearby   boolean not null default true,
  notify_likes    boolean not null default true,
  notify_comments boolean not null default true,
  notify_follows  boolean not null default true,
  updated_at      timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select" on public.user_settings
  for select using ( id = auth.uid() );
create policy "user_settings_insert" on public.user_settings
  for insert with check ( id = auth.uid() );
create policy "user_settings_update" on public.user_settings
  for update using ( id = auth.uid() ) with check ( id = auth.uid() );
create policy "user_settings_delete" on public.user_settings
  for delete using ( id = auth.uid() );

-- Migrate any existing push tokens off the world-readable profiles table,
-- then drop the old column.
insert into public.user_settings (id, push_token)
select id, push_token from public.profiles where push_token is not null
on conflict (id) do update set push_token = excluded.push_token;

alter table public.profiles drop column if exists push_token;

-- Send a JSON array of Expo push messages. Failures never bubble up, so a push
-- problem can't roll back the like/comment/follow/cat insert that triggered it.
create or replace function public.send_expo_push(messages jsonb)
returns void
language plpgsql
security definer
set search_path = public, net, extensions
as $$
begin
  if messages is null or jsonb_array_length(messages) = 0 then
    return;
  end if;
  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := messages
    );
  exception when others then
    -- swallow: a failed notification must not block the user's action
    null;
  end;
end;
$$;

-- Like on your cat → notify the finder
create or replace function public.tg_notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_cat_name text;
  v_token text;
  v_pref boolean;
  v_actor text;
begin
  select owner, name into v_owner, v_cat_name from public.cats where id = new.cat_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  select push_token, notify_likes into v_token, v_pref from public.user_settings where id = v_owner;
  if v_token is null or not coalesce(v_pref, true) then
    return new;
  end if;
  select coalesce(username, 'Someone') into v_actor from public.profiles where id = new.user_id;
  v_actor := coalesce(v_actor, 'Someone');
  perform public.send_expo_push(jsonb_build_array(jsonb_build_object(
    'to', v_token,
    'title', 'New like 🐾',
    'body', v_actor || ' liked ' || coalesce(v_cat_name, 'your cat'),
    'sound', 'default',
    'data', jsonb_build_object('type', 'like', 'catId', new.cat_id)
  )));
  return new;
end;
$$;

drop trigger if exists trg_notify_like on public.cat_likes;
create trigger trg_notify_like after insert on public.cat_likes
  for each row execute function public.tg_notify_like();

-- Comment on your cat → notify the finder
create or replace function public.tg_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_cat_name text;
  v_token text;
  v_pref boolean;
begin
  select owner, name into v_owner, v_cat_name from public.cats where id = new.cat_id;
  if v_owner is null or v_owner = new.author then
    return new;
  end if;
  select push_token, notify_comments into v_token, v_pref from public.user_settings where id = v_owner;
  if v_token is null or not coalesce(v_pref, true) then
    return new;
  end if;
  perform public.send_expo_push(jsonb_build_array(jsonb_build_object(
    'to', v_token,
    'title', 'New comment 🐾',
    'body', coalesce(new.author_name, 'Someone') || ' commented on ' || coalesce(v_cat_name, 'your cat'),
    'sound', 'default',
    'data', jsonb_build_object('type', 'comment', 'catId', new.cat_id)
  )));
  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.checkins;
create trigger trg_notify_comment after insert on public.checkins
  for each row execute function public.tg_notify_comment();

-- New follower → notify the followed user
create or replace function public.tg_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_pref boolean;
  v_actor text;
begin
  if new.following_id = new.follower_id then
    return new;
  end if;
  select push_token, notify_follows into v_token, v_pref from public.user_settings where id = new.following_id;
  if v_token is null or not coalesce(v_pref, true) then
    return new;
  end if;
  select coalesce(username, 'Someone') into v_actor from public.profiles where id = new.follower_id;
  v_actor := coalesce(v_actor, 'Someone');
  perform public.send_expo_push(jsonb_build_array(jsonb_build_object(
    'to', v_token,
    'title', 'New follower',
    'body', v_actor || ' started following you',
    'sound', 'default',
    'data', jsonb_build_object('type', 'follow', 'userId', new.follower_id)
  )));
  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.tg_notify_follow();

-- New cat added → notify everyone within 5 km whose last-known location is set
create or replace function public.tg_notify_new_cat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msgs jsonb;
begin
  if new.lat is null or new.lng is null then
    return new;
  end if;
  select jsonb_agg(jsonb_build_object(
    'to', p.push_token,
    'title', 'New cat nearby 🐾',
    'body', coalesce(new.name, 'A cat') || ' was just spotted near you',
    'sound', 'default',
    'data', jsonb_build_object('type', 'nearby', 'catId', new.id)
  ))
  into v_msgs
  from public.user_settings p
  where p.push_token is not null
    and coalesce(p.notify_nearby, true)
    and p.id is distinct from new.owner
    and p.lat is not null
    and p.lng is not null
    -- Great-circle distance (km) between the user and the new cat
    and 6371 * acos(least(1, greatest(-1,
          sin(radians(p.lat)) * sin(radians(new.lat)) +
          cos(radians(p.lat)) * cos(radians(new.lat)) *
          cos(radians(p.lng - new.lng))
        ))) <= 5;
  perform public.send_expo_push(v_msgs);
  return new;
end;
$$;

drop trigger if exists trg_notify_new_cat on public.cats;
create trigger trg_notify_new_cat after insert on public.cats
  for each row execute function public.tg_notify_new_cat();
