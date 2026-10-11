-- Replace the people on one hike in a single transaction.
-- Security invoker keeps the existing owner policies in force.
-- The function also checks the owner, because it is exposed to signed-in clients.

create or replace function public.set_hike_participants(
  target_hike uuid,
  member_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  chosen uuid[];
begin
  if not private.is_owner() then
    raise exception 'Only the owner can change participants';
  end if;

  if not exists (select 1 from public.hikes where id = target_hike) then
    raise exception 'Hike not found';
  end if;

  select coalesce(array_agg(distinct member_id), '{}'::uuid[])
  into chosen
  from unnest(coalesce(member_ids, '{}'::uuid[])) as member_id;

  if exists (
    select 1
    from unnest(chosen) as member_id
    where not exists (
      select 1
      from public.hike_participants as existing
      where existing.hike_id = target_hike
        and existing.user_id = member_id
    )
    and not exists (
      select 1
      from public.user_roles
      where user_id = member_id
        and status = 'active'
        and role in ('owner', 'member')
    )
  ) then
    raise exception 'Only active members can be added to a hike';
  end if;

  delete from public.hike_participants
  where hike_id = target_hike
    and not (user_id = any (chosen));

  insert into public.hike_participants (hike_id, user_id)
  select target_hike, member_id
  from unnest(chosen) as member_id
  where not exists (
    select 1
    from public.hike_participants as existing
    where existing.hike_id = target_hike
      and existing.user_id = member_id
  );
end;
$$;

revoke all on function public.set_hike_participants(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.set_hike_participants(uuid, uuid[]) to authenticated;

comment on function public.set_hike_participants(uuid, uuid[]) is
  'Replaces the people on a hike in one transaction. Owner only. Newly added people must be active members.';
