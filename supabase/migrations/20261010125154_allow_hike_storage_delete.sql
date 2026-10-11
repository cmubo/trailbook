-- Supabase blocks direct deletes on storage.objects unless this transaction
-- setting is enabled. The hike triggers still remove the matching files.

create or replace function private.delete_hike_photo_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);

  delete from storage.objects
  where bucket_id = 'hike-photos'
    and name = old.storage_path;

  return old;
end;
$$;

create or replace function private.delete_hike_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);

  delete from storage.objects
  where bucket_id = 'hike-photos'
    and name like old.id::text || '/%';

  return old;
end;
$$;
