-- Local development data only.
-- `supabase db push` does not run this file. `npm run db:reset` rebuilds the local
-- Docker database and then applies it. Do not point that command at production.

create or replace function private.seed_local_user(
  user_id uuid,
  user_email text,
  display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    user_email,
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', display_name),
    pg_catalog.now(),
    pg_catalog.now(),
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    user_id,
    user_id,
    jsonb_build_object('sub', user_id::text, 'email', user_email, 'email_verified', true),
    'email',
    user_id::text,
    pg_catalog.now(),
    pg_catalog.now(),
    pg_catalog.now()
  );
end;
$$;

select private.seed_local_user(
  '10000000-0000-4000-8000-000000000001',
  'callum@trailbook.test',
  'Callum Reid'
);

insert into public.invitations (email, invited_by)
values
  ('priya@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('tom@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('ellie@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('sam@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('jo@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('maya@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('dan@trailbook.test', '10000000-0000-4000-8000-000000000001'),
  ('expired@trailbook.test', '10000000-0000-4000-8000-000000000001');

select private.seed_local_user('10000000-0000-4000-8000-000000000002', 'priya@trailbook.test', 'Priya Shah');
select private.seed_local_user('10000000-0000-4000-8000-000000000003', 'tom@trailbook.test', 'Tom Becker');
select private.seed_local_user('10000000-0000-4000-8000-000000000004', 'ellie@trailbook.test', 'Ellie Ward');
select private.seed_local_user('10000000-0000-4000-8000-000000000005', 'sam@trailbook.test', 'Sam Okafor');
select private.seed_local_user('10000000-0000-4000-8000-000000000006', 'jo@trailbook.test', 'Jo Lin');

insert into public.hikes (
  id, title, description, hike_date, location_name, latitude, longitude, trail_url, distance_km, difficulty, cover_photo_path, created_by
) values
  (
    '20000000-0000-4000-8000-000000000001',
    'Pike o'' Blisco from the Old Dungeon Ghyll',
    'Cloud sat on the tops until Red Tarn, then lifted all at once. Lunch on the summit with Langdale below us.',
    '2026-09-12',
    'Great Langdale',
    54.4475,
    -3.1105,
    'https://example.com/trails/pike-o-blisco',
    11.80,
    'moderate',
    '20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.jpg',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Striding Edge in the clag',
    'A slow crossing in low cloud, with the summit cairn appearing later than anyone expected.',
    '2026-08-23',
    'Glenridding',
    54.5270,
    -3.0160,
    'https://example.com/trails/striding-edge',
    14.20,
    'hard',
    null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Buttermere loop',
    'A steady circuit of the lake, with a swim at the south end before the walk back.',
    '2026-08-01',
    'Buttermere',
    54.5400,
    -3.2770,
    'https://example.com/trails/buttermere-loop',
    7.40,
    'moderate',
    null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Cat Bells at golden hour',
    'A short evening walk above Derwentwater. We were back in Keswick before dark.',
    '2026-07-17',
    'Keswick',
    54.5690,
    -3.1710,
    'https://example.com/trails/cat-bells',
    5.10,
    'easy',
    null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'St Bees Head coast path',
    'Wind on the cliffs and a late lunch in the village. The first cold day of the autumn.',
    '2025-11-16',
    'St Bees',
    54.4910,
    -3.6070,
    'https://example.com/trails/st-bees-head',
    8.60,
    'easy',
    null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'Langdale Pikes at first light',
    'A longer day from the same start as Pike o'' Blisco, with the tops clear at dawn.',
    '2025-10-04',
    'Great Langdale',
    54.4530,
    -3.1030,
    'https://example.com/trails/langdale-pikes',
    16.40,
    'hard',
    null,
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.hike_participants (hike_id, user_id)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006');

insert into public.hike_ratings (hike_id, user_id, score)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 5),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 4),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 5),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 4),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 5),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 4);

insert into public.hike_comments (hike_id, user_id, content, created_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'Still not over that cloud inversion. Best lunch spot we have found.',
    '2026-09-14 10:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    'Added the photos from my phone. The one of Callum on the stile is a keeper.',
    '2026-09-15 18:30:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'Can we do Crinkle Crags next? Same start, longer day.',
    '2026-09-16 09:15:00+00'
  );

insert into public.hike_photos (id, hike_id, user_id, storage_path, caption, created_at)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.jpg',
    'Climbing out of Oxendale',
    '2026-09-12 11:00:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002.jpg',
    'Summit cairn',
    '2026-09-12 13:10:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000003.jpg',
    'The edge in the cloud',
    '2026-08-23 12:40:00+00'
  );

update public.user_roles
set status = 'revoked'
where user_id = '10000000-0000-4000-8000-000000000006';

update public.invitations
set status = 'revoked'
where email = 'dan@trailbook.test';

update public.invitations
set expires_at = pg_catalog.now() - interval '10 days'
where email = 'expired@trailbook.test';

drop function private.seed_local_user(uuid, text, text);
