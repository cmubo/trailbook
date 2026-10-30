# Technical specification

This describes Trailbook as it is built. The requested product is in [brief.md](brief.md). Setup, seed accounts, and deployment steps are in the repository [README](../README.md). Read [context.md](context.md) before changing local data.

## Stack

One Next.js application. There is no separate API server, Prisma schema, Redis, paid map, or extra image host.

| Piece | In use |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript, strict |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui on Base UI. The only shared primitive in `src/components/ui` is the button |
| Icons | Lucide |
| Data | Supabase Postgres, Auth, and Storage, via `@supabase/supabase-js` and `@supabase/ssr` |
| Validation | Zod 4 |
| Forms | React Hook Form on the hike editor |
| Hosting target | Vercel, not deployed |
| Database changes | SQL migrations in `supabase/migrations` |

This Next.js release differs from older App Router versions. `AGENTS.md` points at `node_modules/next/dist/docs/`. Page props use the generated `PageProps` and `LayoutProps` types. Session refresh is `src/proxy.ts`, which exports `proxy`.

## Layout of the code

- `src/app` — routes.
- `src/components` — journal shell, hike list filters, cards, photos, comments, ratings, and the hike form.
- `src/lib/auth` — session, membership, and the owner route check.
- `src/lib/supabase` — browser client, server client, admin client, and the proxy helper.
- `src/lib/env.ts` — server-only environment. `src/lib/env-public.ts` is the part the browser client may import. Importing `getEnv` from a client component throws.
- `src/lib/hikes` — queries, actions, filters, validation, and photo resize.
- `src/lib/profile` — profile queries, avatar actions, and the initials colour.
- `src/types/database.ts` — generated database types. Refresh with `npm run db:types` after a schema change.
- `supabase/migrations` — schema. `supabase/seed.sql` — local data only. `supabase/tests/permissions.test.sql` — pgTAP, run with `npm run test:db`.

## Routes

- `/` sends a signed-in member to `/hikes` and everyone else to `/login`.
- `/login` is the email magic link. It has three frames: the form, the sent state, and an error.
- `/auth/callback` exchanges the auth code for a session.
- `/auth/sign-out` clears the session. `?reason=access` is used when access was revoked.
- `/hikes` is the hike list, year chips, and filters, for an active member.
- `/hikes/find` redirects an active member to `/hikes` with the same query.
- `/hikes/new` and `/hikes/[id]/edit` are the owner hike form. Anyone else gets not found.
- `/hikes/[id]` is the hike page, for an active member.
- `/members` lists active members.
- `/profile` is the signed-in member’s photo, name, and sign out.
- `/admin/[secret]` is invites and membership. The path must match `OWNER_ROUTE_SECRET`, and the signed-in user must be the active owner. A member who opens it gets not found.

There is no `/members/[id]` page. The brief listed it as optional.

## Data model

Migrations:

- `20261010111201_journal_foundation.sql` — tables, RLS, storage buckets, the first-owner trigger, and the invite hook.
- `20261010123314_set_hike_participants.sql` — replaces the people on a hike in one transaction.
- `20261010125154_allow_hike_storage_delete.sql` — storage delete policy.
- `20261010131340_clear_cover_on_photo_delete.sql` — clears `cover_photo_path` when that photo row goes away.

Tables match the brief, with these extra rules:

- `profiles.display_name` is trimmed and between 1 and 80 characters. `avatar_path` is null or exactly `<user-id>/avatar.webp`.
- `user_roles.role` is `owner` or `member`. `status` is `active` or `revoked`. One owner row is allowed. Revoking a member keeps their comments, ratings, photos, and attendance.
- `hikes.trail_url` must be `https` when it is set. Latitude and longitude are both set or both empty. Difficulty is `easy`, `moderate`, or `hard`. Distance is above 0 and below 500 km.
- `hike_participants` uses the composite primary key `(hike_id, user_id)`.
- `hike_ratings` is unique per hike and member, score 1 to 5. Averages come from the `hike_rating_summaries` view, not a stored copy.
- `invitations.status` is `pending`, `accepted`, or `revoked`. One pending invite per email. Invites last seven days. An expired invite stays pending until it is replaced or revoked, and it cannot be accepted.
- Deleting a hike cascades participants, photos, comments, and ratings. Deleting a profile does not delete hikes that person created (`created_by` is `on delete restrict`). Photo and comment authors are also `on delete restrict`.

Helper functions that bypass row level security live in the `private` schema, which is not exposed through the API. Role checks use `private.is_active_member()` and `private.is_owner()`. Roles are not read from editable user metadata.

`set_hike_participants` is the only way the owner replaces the people on a hike. Newly added people must be active members. Someone who was already on a hike and was later revoked can stay until the owner removes them.

## Authentication and the owner

Public signup is disabled. A `before_user_created` hook rejects an email that does not have a pending, unexpired invitation. The first account created while no owner exists becomes the owner. After that, an invitation is required. Magic links use `shouldCreateUser: false` for ordinary sign-in. There is no password login and no server-side cooldown on the login form.

Sessions are Supabase access and refresh tokens in cookies. Access tokens last one hour. Refresh tokens are not given a time box or inactivity timeout. `src/proxy.ts` refreshes the session. Server code uses `getClaims()`, not `getSession()`. Sign-out is explicit. A revoked member loses access on the next request, including an open session, and is sent through `/auth/sign-out?reason=access`.

The login page and the magic link must share an origin. Locally that is `http://localhost:3000`, matching `NEXT_PUBLIC_SITE_URL`. A link opened from a different host cannot finish the PKCE exchange. Local mail is captured by Mailpit, not sent to a real inbox.

The owner route is `/admin/<OWNER_ROUTE_SECRET>`. The secret is read on the server from `getEnv()` and is not a `NEXT_PUBLIC_` variable. It hides the address. It does not grant the owner role. The page still checks that the signed-in user is the active owner, and returns not found otherwise. Do not print the secret or a magic-link token.

The owner invites from that page. The server admin client sends the invitation email and is limited to that kind of operation. Waiting and expired invites can be cancelled. An active member can be paused, and a revoked member can be restored.

## Storage and images

Two private buckets:

- `hike-photos`, object name `<hike-id>/<photo-id>.jpg`, 12 MB. The database stores the path. The browser resizes the selected JPEG, PNG, or WebP to a JPEG whose longest edge is at most 2000 pixels, quality 0.85, then uploads that one file. There is no separate thumbnail or original. HEIC is not accepted.
- `avatars`, one WebP per member at `<user-id>/avatar.webp`, 2 MB. The browser crops to a square first. A member can replace or remove only their own file.

Photos and avatars are shown with short-lived signed URLs created while the page renders, and only after `storage.list` shows the file. A cover path with no file shows the mountain placeholder. Several photos upload one after another. A failed file can be tried again. The person who uploaded a photo can delete it, and the owner can delete any photo. Deleting the row also deletes the storage object.

## Journal

Signed-in members land on `/hikes`. On a phone, a bottom nav links to Hikes, Members, and Profile. From about 800px up, those links sit in a top bar with the wordmark and the avatar. Sign out is on the profile page. The owner’s New hike button is in that bar, and on a phone it floats over the hike list only.

The list is titled “Our hikes”. The newest hike is a tall card. The rest sit under “Earlier”, newest first. On a wide screen the first four earlier hikes show, and “Show older hikes” reveals the rest. A card shows the cover when the file exists, otherwise a mountain placeholder, plus a photo count, title, average, date, place, and a short stack of avatars.

Year chips filter the list and keep the other active filters. On a phone, search and “People and rating” open a bottom sheet over the list: a dimmed background, a grab handle, search, year, who came, and rating. “Show N hikes” applies the draft and closes the sheet. The background, Escape, and the browser back button close it without applying. From about 800px up the same controls stay in the page and the sheet is not used.

Who came is a checkbox list. The URL repeats `member`. One id still works, including “See all” on the profile page. A hike matches only when every selected person was on it. The live count uses that rule. An empty result names the people, for example “Nothing with Priya and Tom”.

A hike page shows “Trail log · No. N”. The number is the hike’s place in date order, oldest first, and it is display only. Stars save 1 to 5. The labels are Not for me, It was fine, Good day out, Loved it, and One of the best. The trail link is labelled “Open the route”. The place opens a Google Maps search built from the stored coordinates. Photos are a grid. Tapping one opens a viewer with the caption and author. Comments show the author, avatar, and date. The author can edit or delete their own. The composer sits under the list. On a wide screen the story, photos, and comments are the main column. Group rating, your rating, who came, and the route sit beside them. The owner also sees Delete there. Deleting asks for confirmation and names how many photos, ratings, and comments will go.

`/members` lists active members with an avatar, name, and hike and photo counts. Revoked people stay off that list. They can still appear in “who came” if they are already on a hike. Profile shows the large avatar, name, counts, the hikes this member went on, the signed-in email, and sign out. The owner also gets a Group admin row. When there is no avatar file, the circle uses a colour chosen from a stable hash of the user id and the initials. One initial is shown when the name has one word.

The hike form is grouped into the basics, who’s coming, where, an optional cover, and optional trail details. The cover is chosen from a photo that already has a file.

## Where the build differs from the brief

- Image files are JPEG, PNG, or WebP. HEIC is out. One resized JPEG is stored, not a thumbnail plus a gallery size plus an original.
- The map is a Google Maps search URL. There is no embedded map.
- There is no separate invitation-acceptance page. The invite email leads into the same magic-link sign-in, and the database hook is what enforces the invite.
- `/hikes/find` redirects. Phone filters are a sheet on `/hikes`, not a separate screen.
- Several people can be selected, and the match is “every selected person came”.
- Avatars without a photo are initials on a stable colour, not a generated image.
- Automated tests cover database permissions. UI flows were checked in the browser during each stage. There is no browser test suite.
- Production hosting is documented in the README and has not been set up. That was deferred on purpose.

## Working on it

Follow the README for Docker, `npx supabase start`, `npm run db:reset`, `.env.local`, and `npm run dev`. `npm run db:reset` refuses to run unless `supabase status` reports a local API URL. Do not reset or seed a linked production database.

After a change, run `npm run lint` and `npm run build`. Run `npm run test:db` when a migration or policy changes. Do not run `supabase test db --linked`.

Do not add Express, Redis, Prisma, a paid map, or another image host. Do not put `SUPABASE_SECRET_KEY` or `OWNER_ROUTE_SECRET` in a `NEXT_PUBLIC_` variable or in these project files. Do not commit `.env.local`.
