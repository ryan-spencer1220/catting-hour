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

-- Allow authenticated users to insert
create policy "authenticated_insert" on public.cats
  for insert
  with check ( auth.role() = 'authenticated' );

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

-- name_unknown support (run in Supabase SQL editor)
ALTER TABLE public.cats ADD COLUMN IF NOT EXISTS name_unknown boolean DEFAULT false;

-- Allow any authenticated user to suggest a real name for unknown-name cats
CREATE OR REPLACE FUNCTION public.suggest_cat_name(cat_id uuid, suggested_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.cats
  SET name = suggested_name, name_unknown = false
  WHERE id = cat_id AND name_unknown = true;
END;
$$;
