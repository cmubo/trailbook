-- Trailbook foundation.
-- One private group, one owner, and invited members. Roles live in user_roles,
-- never in editable user metadata. Public signup is also rejected by the auth hook.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin;

create or replace function private.is_hike_object_path(target_hike uuid, object_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select object_path ~ (
    '^' || target_hike::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  );
$$;

revoke all on function private.is_hike_object_path(uuid, text) from public;
grant execute on function private.is_hike_object_path(uuid, text) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Profiles are created by the auth trigger, not by clients.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_avatar_path_check check (
    avatar_path is null or avatar_path = id::text || '/avatar.webp'
  )
);

-- Trusted roles. status lets the owner revoke access without deleting contributions.
create table public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_roles_role_check check (role in ('owner', 'member')),
  constraint user_roles_status_check check (status in ('active', 'revoked'))
);

create unique index user_roles_one_owner_idx
  on public.user_roles (role)
  where role = 'owner';

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and status = 'active'
      and role in ('owner', 'member')
  );
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and status = 'active'
      and role = 'owner'
  );
$$;

revoke all on function private.is_active_member() from public;
revoke all on function private.is_owner() from public;
grant execute on function private.is_active_member() to authenticated;
grant execute on function private.is_owner() to authenticated;

create table public.hikes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  hike_date date not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  trail_url text,
  distance_km numeric(6, 2),
  difficulty text,
  cover_photo_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint hikes_title_length check (char_length(btrim(title)) between 1 and 140),
  constraint hikes_description_length check (description is null or char_length(description) <= 8000),
  constraint hikes_location_length check (location_name is null or char_length(btrim(location_name)) between 1 and 120),
  constraint hikes_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint hikes_longitude_check check (longitude is null or longitude between -180 and 180),
  constraint hikes_coordinates_check check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint hikes_trail_url_check check (
    trail_url is null or (char_length(trail_url) <= 2000 and trail_url ~ '^https://')
  ),
  constraint hikes_distance_check check (distance_km is null or (distance_km > 0 and distance_km < 500)),
  constraint hikes_difficulty_check check (
    difficulty is null or difficulty in ('easy', 'moderate', 'hard')
  ),
  constraint hikes_cover_path_check check (
    cover_photo_path is null or private.is_hike_object_path(id, cover_photo_path)
  )
);

create index hikes_hike_date_idx on public.hikes (hike_date desc);
create index hikes_created_by_idx on public.hikes (created_by);

create table public.hike_participants (
  hike_id uuid not null references public.hikes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (hike_id, user_id)
);

create index hike_participants_user_id_idx on public.hike_participants (user_id);

create table public.hike_photos (
  id uuid primary key default gen_random_uuid(),
  hike_id uuid not null references public.hikes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint hike_photos_caption_length check (caption is null or char_length(caption) <= 300),
  constraint hike_photos_path_check check (private.is_hike_object_path(hike_id, storage_path))
);

create index hike_photos_hike_id_idx on public.hike_photos (hike_id, created_at);
create index hike_photos_user_id_idx on public.hike_photos (user_id);

create table public.hike_comments (
  id uuid primary key default gen_random_uuid(),
  hike_id uuid not null references public.hikes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  content text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint hike_comments_content_length check (char_length(btrim(content)) between 1 and 2000)
);

create index hike_comments_hike_id_idx on public.hike_comments (hike_id, created_at);
create index hike_comments_user_id_idx on public.hike_comments (user_id);

create table public.hike_ratings (
  id uuid primary key default gen_random_uuid(),
  hike_id uuid not null references public.hikes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  score integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint hike_ratings_score_check check (score between 1 and 5),
  constraint hike_ratings_one_per_member unique (hike_id, user_id)
);

create index hike_ratings_hike_id_idx on public.hike_ratings (hike_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending',
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  constraint invitations_email_check check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint invitations_status_check check (status in ('pending', 'accepted', 'revoked')),
  constraint invitations_accepted_check check (
    (status = 'accepted' and accepted_at is not null)
    or (status <> 'accepted' and accepted_at is null)
  )
);

create unique index invitations_one_pending_email_idx
  on public.invitations (email)
  where status = 'pending';

create index invitations_invited_by_idx on public.invitations (invited_by);

create view public.hike_rating_summaries
with (security_invoker = true) as
select
  hike_id,
  count(*)::integer as rating_count,
  round(avg(score)::numeric, 2) as average_score
from public.hike_ratings
group by hike_id;

-- Keep a profile and role in step with auth, and refuse accounts that were not invited.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_name text;
  invite_id uuid;
begin
  if new.email is null then
    raise exception 'An email address is required';
  end if;

  next_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if next_name is null then
    next_name := split_part(new.email, '@', 1);
  end if;
  next_name := left(next_name, 80);

  insert into public.profiles (id, display_name)
  values (new.id, next_name);

  perform pg_advisory_xact_lock(845221);

  if not exists (select 1 from public.user_roles where role = 'owner') then
    if exists (
      select 1
      from public.invitations
      where email = lower(new.email)
        and status = 'pending'
    ) then
      raise exception 'The owner account must exist before an invitation can be accepted';
    end if;

    insert into public.user_roles (user_id, role, status)
    values (new.id, 'owner', 'active');
    return new;
  end if;

  update public.invitations
  set
    status = 'accepted',
    accepted_at = pg_catalog.now()
  where email = lower(new.email)
    and status = 'pending'
    and expires_at > pg_catalog.now()
  returning id into invite_id;

  if invite_id is null then
    raise exception 'An invitation is required to join Trailbook';
  end if;

  insert into public.user_roles (user_id, role, status)
  values (new.id, 'member', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

create or replace function private.protect_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed';
  end if;
  new.display_name := btrim(new.display_name);
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row
  execute function private.protect_profile();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

create or replace function private.protect_user_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Roles can only be assigned when an account is created';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.role is distinct from old.role then
      raise exception 'Role assignment cannot be changed';
    end if;
    if old.role = 'owner' and new.status is distinct from 'active' then
      raise exception 'The owner account cannot be revoked';
    end if;
  end if;
  return new;
end;
$$;

create trigger user_roles_protect
  before insert or update on public.user_roles
  for each row
  execute function private.protect_user_role();

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row
  execute function private.set_updated_at();

create or replace function private.protect_hike()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  if new.difficulty is not null then
    new.difficulty := lower(btrim(new.difficulty));
  end if;
  if tg_op = 'INSERT' and (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'Hike creator cannot be changed';
  end if;
  return new;
end;
$$;

create trigger hikes_protect
  before insert or update on public.hikes
  for each row
  execute function private.protect_hike();

create trigger hikes_set_updated_at
  before update on public.hikes
  for each row
  execute function private.set_updated_at();

create or replace function private.protect_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.user_roles
    where user_id = new.user_id
      and status = 'active'
      and role in ('owner', 'member')
  ) then
    raise exception 'Only active members can be added to a hike';
  end if;
  return new;
end;
$$;

create trigger hike_participants_protect
  before insert on public.hike_participants
  for each row
  execute function private.protect_participant();

create or replace function private.protect_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (select auth.uid()) is not null then
    new.user_id := (select auth.uid());
    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'hike-photos'
        and name = new.storage_path
        and owner = (select auth.uid())
    ) then
      raise exception 'Upload the photograph before saving it';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.hike_id is distinct from old.hike_id
      or new.user_id is distinct from old.user_id
      or new.storage_path is distinct from old.storage_path
      or new.created_at is distinct from old.created_at then
      raise exception 'Photograph identity cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

create trigger hike_photos_protect
  before insert or update on public.hike_photos
  for each row
  execute function private.protect_photo();

create or replace function private.delete_hike_photo_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'hike-photos'
    and name = old.storage_path;
  return old;
end;
$$;

create trigger hike_photos_delete_object
  after delete on public.hike_photos
  for each row
  execute function private.delete_hike_photo_object();

create or replace function private.delete_hike_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'hike-photos'
    and name like old.id::text || '/%';
  return old;
end;
$$;

create trigger hikes_delete_objects
  before delete on public.hikes
  for each row
  execute function private.delete_hike_objects();

create or replace function private.protect_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.user_id := (select auth.uid());
  end if;
  new.content := btrim(new.content);
  if tg_op = 'UPDATE' then
    if new.hike_id is distinct from old.hike_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Comment identity cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

create trigger hike_comments_protect
  before insert or update on public.hike_comments
  for each row
  execute function private.protect_comment();

create trigger hike_comments_set_updated_at
  before update on public.hike_comments
  for each row
  execute function private.set_updated_at();

create or replace function private.protect_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.user_id := (select auth.uid());
  end if;
  if tg_op = 'UPDATE' then
    if new.hike_id is distinct from old.hike_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Rating identity cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

create trigger hike_ratings_protect
  before insert or update on public.hike_ratings
  for each row
  execute function private.protect_rating();

create trigger hike_ratings_set_updated_at
  before update on public.hike_ratings
  for each row
  execute function private.set_updated_at();

create or replace function private.protect_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.email := lower(btrim(new.email));
    new.status := 'pending';
    new.accepted_at := null;
    new.expires_at := pg_catalog.now() + interval '7 days';
    if (select auth.uid()) is not null then
      new.invited_by := (select auth.uid());
    end if;

    if exists (
      select 1
      from auth.users
      where lower(email) = new.email
    ) then
      raise exception 'That email already has an account. Restore their access instead of sending a new invitation';
    end if;

    update public.invitations
    set status = 'revoked'
    where email = new.email
      and status = 'pending';

    return new;
  end if;

  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.invited_by is distinct from old.invited_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Invitation identity cannot be changed';
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  if old.status = 'pending'
    and new.status = 'revoked'
    and (select private.is_owner()) then
    return new;
  end if;

  raise exception 'Invitation cannot be changed';
end;
$$;

create trigger invitations_protect
  before insert or update on public.invitations
  for each row
  execute function private.protect_invitation();

-- Reject Auth API signups unless a pending invitation exists.
-- Direct SQL, used by the local seed, does not pass through this hook.
create or replace function private.before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_email text;
begin
  next_email := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));

  -- The first account is the owner. Public signup stays disabled, so only an
  -- operator using the Auth admin API can create that account.
  if not exists (select 1 from public.user_roles where role = 'owner') then
    return '{}'::jsonb;
  end if;

  if exists (
    select 1
    from public.invitations
    where email = next_email
      and status = 'pending'
      and expires_at > pg_catalog.now()
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'An invitation is required to join Trailbook.'
    )
  );
end;
$$;

revoke all on function private.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.hikes enable row level security;
alter table public.hike_participants enable row level security;
alter table public.hike_photos enable row level security;
alter table public.hike_comments enable row level security;
alter table public.hike_ratings enable row level security;
alter table public.invitations enable row level security;

create policy profiles_select_members
  on public.profiles
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    and (select private.is_active_member())
  )
  with check (
    id = (select auth.uid())
    and (select private.is_active_member())
  );

create policy user_roles_select_members
  on public.user_roles
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy user_roles_revoke_members
  on public.user_roles
  for update
  to authenticated
  using (
    (select private.is_owner())
    and role = 'member'
  )
  with check (
    (select private.is_owner())
    and role = 'member'
    and status in ('active', 'revoked')
  );

create policy hikes_select_members
  on public.hikes
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy hikes_insert_owner
  on public.hikes
  for insert
  to authenticated
  with check (
    (select private.is_owner())
    and created_by = (select auth.uid())
  );

create policy hikes_update_owner
  on public.hikes
  for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy hikes_delete_owner
  on public.hikes
  for delete
  to authenticated
  using ((select private.is_owner()));

create policy hike_participants_select_members
  on public.hike_participants
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy hike_participants_insert_owner
  on public.hike_participants
  for insert
  to authenticated
  with check ((select private.is_owner()));

create policy hike_participants_delete_owner
  on public.hike_participants
  for delete
  to authenticated
  using ((select private.is_owner()));

create policy hike_photos_select_members
  on public.hike_photos
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy hike_photos_insert_member
  on public.hike_photos
  for insert
  to authenticated
  with check (
    (select private.is_active_member())
    and user_id = (select auth.uid())
  );

create policy hike_photos_update_own
  on public.hike_photos
  for update
  to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_member()))
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));

create policy hike_photos_delete_own_or_owner
  on public.hike_photos
  for delete
  to authenticated
  using (
    (select private.is_active_member())
    and (
      user_id = (select auth.uid())
      or (select private.is_owner())
    )
  );

create policy hike_comments_select_members
  on public.hike_comments
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy hike_comments_insert_member
  on public.hike_comments
  for insert
  to authenticated
  with check (
    (select private.is_active_member())
    and user_id = (select auth.uid())
  );

create policy hike_comments_update_own
  on public.hike_comments
  for update
  to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_member()))
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));

create policy hike_comments_delete_own
  on public.hike_comments
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_member()));

create policy hike_ratings_select_members
  on public.hike_ratings
  for select
  to authenticated
  using ((select private.is_active_member()));

create policy hike_ratings_insert_own
  on public.hike_ratings
  for insert
  to authenticated
  with check (
    (select private.is_active_member())
    and user_id = (select auth.uid())
  );

create policy hike_ratings_update_own
  on public.hike_ratings
  for update
  to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_member()))
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));

create policy invitations_select_owner
  on public.invitations
  for select
  to authenticated
  using ((select private.is_owner()));

create policy invitations_insert_owner
  on public.invitations
  for insert
  to authenticated
  with check ((select private.is_owner()));

create policy invitations_update_owner
  on public.invitations
  for update
  to authenticated
  using ((select private.is_owner()) and status = 'pending')
  with check ((select private.is_owner()) and status = 'revoked');

revoke all on table public.profiles from anon, public;
revoke all on table public.user_roles from anon, public;
revoke all on table public.hikes from anon, public;
revoke all on table public.hike_participants from anon, public;
revoke all on table public.hike_photos from anon, public;
revoke all on table public.hike_comments from anon, public;
revoke all on table public.hike_ratings from anon, public;
revoke all on table public.invitations from anon, public;
revoke all on table public.hike_rating_summaries from anon, public;

grant select, update on public.profiles to authenticated;
grant select, update on public.user_roles to authenticated;
grant select, insert, update, delete on public.hikes to authenticated;
grant select, insert, delete on public.hike_participants to authenticated;
grant select, insert, update, delete on public.hike_photos to authenticated;
grant select, insert, update, delete on public.hike_comments to authenticated;
grant select, insert, update on public.hike_ratings to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant select on public.hike_rating_summaries to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select, insert, update, delete on public.hikes to service_role;
grant select, insert, update, delete on public.hike_participants to service_role;
grant select, insert, update, delete on public.hike_photos to service_role;
grant select, insert, update, delete on public.hike_comments to service_role;
grant select, insert, update, delete on public.hike_ratings to service_role;
grant select, insert, update, delete on public.invitations to service_role;
grant select on public.hike_rating_summaries to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'hike-photos',
    'hike-photos',
    false,
    12582912,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152,
    array['image/webp']
  );

create policy hike_photos_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'hike-photos'
    and (select private.is_active_member())
  );

create policy hike_photos_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'hike-photos'
    and (select private.is_active_member())
    and owner = (select auth.uid())
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    and exists (
      select 1
      from public.hikes
      where hikes.id::text = split_part(name, '/', 1)
    )
  );

create policy hike_photos_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'hike-photos'
    and owner = (select auth.uid())
    and (select private.is_active_member())
  )
  with check (
    bucket_id = 'hike-photos'
    and owner = (select auth.uid())
    and (select private.is_active_member())
  );

create policy hike_photos_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'hike-photos'
    and (
      owner = (select auth.uid())
      or (select private.is_owner())
    )
  );

create policy avatars_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.is_active_member())
  );

create policy avatars_storage_write
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and owner = (select auth.uid())
    and name = (select auth.uid())::text || '/avatar.webp'
  );

create policy avatars_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and owner = (select auth.uid())
    and name = (select auth.uid())::text || '/avatar.webp'
  )
  with check (
    bucket_id = 'avatars'
    and owner = (select auth.uid())
    and name = (select auth.uid())::text || '/avatar.webp'
  );

create policy avatars_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and owner = (select auth.uid())
    and name = (select auth.uid())::text || '/avatar.webp'
  );
