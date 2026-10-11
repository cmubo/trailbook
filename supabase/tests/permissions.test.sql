begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create or replace function pg_temp.attempt(actor uuid, statement text)
returns text
language plpgsql
set search_path = ''
as $$
begin
  if actor is null then
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
  else
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', actor::text, 'role', 'authenticated')::text,
      true
    );
    execute 'set local role authenticated';
  end if;

  execute statement;
  execute 'reset role';
  return 'ok';
exception
  when others then
    execute 'reset role';
    return sqlstate;
end;
$$;

create or replace function pg_temp.hike_count(actor uuid)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  total bigint;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', actor::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
  select count(*) into total from public.hikes;
  execute 'reset role';
  return total;
exception
  when others then
    execute 'reset role';
    raise;
end;
$$;

select ok(
  (
    select bool_and(relrowsecurity)
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where nspname = 'public'
      and relkind = 'r'
      and relname in (
        'profiles', 'user_roles', 'hikes', 'hike_participants',
        'hike_photos', 'hike_comments', 'hike_ratings', 'invitations'
      )
  ),
  'row level security is enabled on every exposed table'
);

select is(
  pg_temp.attempt(null, 'select 1 from public.hikes'),
  '42501',
  'anonymous visitors cannot read hikes'
);

select cmp_ok(
  pg_temp.hike_count('10000000-0000-4000-8000-000000000002'),
  '>=',
  1::bigint,
  'an active member can read hikes'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.hikes (title, hike_date, created_by)
      values ('Nope', '2026-02-02', '10000000-0000-4000-8000-000000000002')$$
  ),
  '42501',
  'a member cannot create a hike'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.invitations (email, invited_by)
      values ('new@example.test', '10000000-0000-4000-8000-000000000002')$$
  ),
  '42501',
  'a member cannot invite someone'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.user_roles
      set role = 'owner'
      where user_id = '10000000-0000-4000-8000-000000000002'$$
  ),
  'ok',
  'a member role update does not raise'
);

select is(
  (select role from public.user_roles where user_id = '10000000-0000-4000-8000-000000000002'),
  'member',
  'a member cannot promote themselves'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.hike_comments
      set content = 'Changed'
      where user_id = '10000000-0000-4000-8000-000000000003'$$
  ),
  'ok',
  'editing another comment is rejected quietly by row level security'
);

select is(
  (
    select content
    from public.hike_comments
    where user_id = '10000000-0000-4000-8000-000000000003'
  ),
  'Still not over that cloud inversion. Best lunch spot we have found.',
  'a member cannot change another member''s comment'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.hike_ratings (hike_id, user_id, score)
      values ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 4)$$
  ),
  'ok',
  'a member can rate a hike'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.hike_ratings
      set score = 5
      where hike_id = '20000000-0000-4000-8000-000000000003'
        and user_id = '10000000-0000-4000-8000-000000000002'$$
  ),
  'ok',
  'a member can update their own rating'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.hike_ratings (hike_id, user_id, score)
      values ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 3)$$
  ),
  '23505',
  'a member cannot save a second rating for the same hike'
);

select is(
  (
    select average_score
    from public.hike_rating_summaries
    where hike_id = '20000000-0000-4000-8000-000000000003'
  ),
  5.00,
  'the rating summary is calculated from stored scores'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.hike_comments (hike_id, user_id, content)
      values ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '   ')$$
  ),
  '23514',
  'a blank comment is rejected'
);

select is(
  pg_temp.hike_count('10000000-0000-4000-8000-000000000006'),
  0::bigint,
  'a revoked member cannot read hikes'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000001',
    $$insert into public.hikes (title, hike_date, created_by)
      values ('Owner route', '2026-03-03', '10000000-0000-4000-8000-000000000001')$$
  ),
  'ok',
  'the owner can create a hike'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000001',
    $$delete from public.hikes where title = 'Owner route'$$
  ),
  'ok',
  'the owner can delete a hike'
);

select is(
  (private.before_user_created('{"user":{"email":"stranger@example.test"}}'::jsonb) -> 'error' ->> 'http_code'),
  '403',
  'the auth hook rejects an address that was not invited'
);

select is(
  pg_temp.attempt(
    null,
    $$select public.set_hike_participants(
      '20000000-0000-4000-8000-000000000004',
      array['10000000-0000-4000-8000-000000000002']::uuid[]
    )$$
  ),
  '42501',
  'anonymous visitors cannot change hike participants'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$select public.set_hike_participants(
      '20000000-0000-4000-8000-000000000004',
      array['10000000-0000-4000-8000-000000000002']::uuid[]
    )$$
  ),
  'P0001',
  'a member cannot change hike participants'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000001',
    $$select public.set_hike_participants(
      '20000000-0000-4000-8000-000000000004',
      array[
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000006'
      ]::uuid[]
    )$$
  ),
  'P0001',
  'a revoked member cannot be newly added to a hike'
);

select is(
  (
    select array_agg(user_id order by user_id)
    from public.hike_participants
    where hike_id = '20000000-0000-4000-8000-000000000004'
  ),
  array[
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004'
  ]::uuid[],
  'a rejected participant update leaves the list unchanged'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000001',
    $$select public.set_hike_participants(
      '20000000-0000-4000-8000-000000000004',
      array[
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002'
      ]::uuid[]
    )$$
  ),
  'ok',
  'the owner can replace hike participants in one call'
);

select is(
  (
    select array_agg(user_id order by user_id)
    from public.hike_participants
    where hike_id = '20000000-0000-4000-8000-000000000004'
  ),
  array[
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ]::uuid[],
  'the participant function replaces the previous list'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$insert into public.hike_photos (hike_id, user_id, storage_path)
      values (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000099.jpg'
      )$$
  ),
  'P0001',
  'a photo row without an uploaded file is rejected'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.profiles
      set display_name = 'Priya N'
      where id = '10000000-0000-4000-8000-000000000002'$$
  ),
  'ok',
  'a member can update their own name'
);

select is(
  (
    select display_name
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'Priya N',
  'the saved name is stored'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.profiles
      set display_name = 'Not Callum'
      where id = '10000000-0000-4000-8000-000000000001'$$
  ),
  'ok',
  'updating another profile is denied without an error'
);

select is(
  (
    select display_name
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'Callum Reid',
  'a member cannot update someone else''s name'
);

select is(
  pg_temp.attempt(
    '10000000-0000-4000-8000-000000000002',
    $$update public.profiles
      set avatar_path = 'nope.webp'
      where id = '10000000-0000-4000-8000-000000000002'$$
  ),
  '23514',
  'an avatar path in another shape is rejected'
);

select * from finish();
rollback;
