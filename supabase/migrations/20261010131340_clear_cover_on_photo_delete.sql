-- A member can delete their own photo, but cannot update the hike row.
-- Clear a cover that points at the deleted photo inside the same transaction.

create or replace function private.clear_cover_for_deleted_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.hikes
  set cover_photo_path = null
  where id = old.hike_id
    and cover_photo_path = old.storage_path;

  return old;
end;
$$;

revoke all on function private.clear_cover_for_deleted_photo() from public, anon, authenticated;

create trigger hike_photos_clear_cover
  after delete on public.hike_photos
  for each row
  execute function private.clear_cover_for_deleted_photo();
