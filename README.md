# Trailbook

Trailbook is a private hiking journal for a small group of friends. One owner creates hikes and invitations. Members sign in with email magic links, then read hikes, rate them, comment, and add photos.

## Stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS and shadcn/ui
- Lucide icons
- Supabase Postgres, Auth, and Storage
- Zod for validation
- React Hook Form for the hike editor

The app is one Next.js project. It does not use a separate API server, Prisma, or a paid map provider.

## Prerequisites

- Node.js 22 or newer
- Docker Desktop, OrbStack, or another Docker-compatible runtime
- npm

Docker has to be running before the Supabase CLI can start the local database, auth, and storage services.

## Install

```bash
npm install
```

The Supabase CLI is a dev dependency. Use `npx supabase` from this repository rather than a global install.

## Local development

```bash
npx supabase start
npm run db:reset
cp .env.example .env.local
```

Fill `.env.local` from `npx supabase status`. Use the local API URL and the publishable key. Put the secret key in `SUPABASE_SECRET_KEY` and do not prefix it with `NEXT_PUBLIC_`.

Generate an admin path secret:

```bash
openssl rand -hex 32
```

Put that value in `OWNER_ROUTE_SECRET`.

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000. Signed-out visitors see the login page. After a magic link, `/` sends members to the hike list at `/hikes`.

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

`npm run db:reset` refuses to run unless `supabase status` reports a local API URL. `npx supabase db reset` itself also targets the local Docker database. Do not pass a remote database URL to it. `npx supabase db push` applies migrations to a linked project and does not run the seed.

## Environment variables

`.env.example` lists every variable. `.env.local` is gitignored.

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client key. Row Level Security still applies |
| `SUPABASE_SECRET_KEY` | Server-only admin client for narrow operations such as invitations |
| `NEXT_PUBLIC_SITE_URL` | Auth redirect origin |
| `OWNER_ROUTE_SECRET` | Path segment for `/admin/<secret>`. Not a privilege |

Local values come from `npx supabase status`. Production values come from the hosted Supabase project and the Vercel project. Never put the secret key or `OWNER_ROUTE_SECRET` in a `NEXT_PUBLIC_` variable.

## Database

Schema changes belong in `supabase/migrations`. The first migration creates:

- `profiles`, tied to `auth.users`
- `user_roles`, with `owner` or `member`, and `active` or `revoked`
- `hikes`, `hike_participants`, `hike_photos`, `hike_comments`, `hike_ratings`
- `invitations`
- `hike_rating_summaries`, a view that calculates the average and count
- `set_hike_participants`, which replaces the people on a hike in one transaction
- private `hike-photos` and `avatars` storage buckets and their policies

Roles are not read from editable user metadata. Helper functions that bypass row level security live in the `private` schema, which is not exposed through the API.

Regenerate TypeScript types after a schema change:

```bash
npm run db:types
```

### Seed data

`supabase/seed.sql` runs only after a local reset. It creates a fictional group:

- Owner: `callum@trailbook.test` (Callum Reid)
- Members: Priya Shah, Tom Becker, Ellie Ward, and Sam Okafor
- Revoked member: Jo Lin, whose comments and hike attendance remain
- Pending invite: `maya@trailbook.test`
- Revoked invite: `dan@trailbook.test`
- Expired invite: `expired@trailbook.test`

Hikes, participants, ratings, comments, and photo metadata are included. The seed photo rows have captions and no image files. Photos are uploaded from the hike page.

The seed deletes its helper function when it finishes. It does not contain production credentials.

### Permissions

`npm run test:db` runs the pgTAP file in `supabase/tests` against the local database and rolls the transaction back. It checks that anonymous visitors cannot read hikes, members cannot create hikes or invitations, members cannot edit someone else's comment or promote themselves, ratings stay unique, a photo row without an uploaded file is rejected, a member can rename only themselves, an avatar path has to match their own id, revoked members lose access, the owner can create and delete a hike, and only the owner can replace the people on a hike.

Do not run `supabase test db --linked` against production.

## Authentication

Sign-in is email magic links only. The app does not collect passwords. Public signup is disabled. A before-user-created hook rejects new accounts that do not have a pending, unexpired invitation.

The first account created while no owner exists becomes the owner. After that, an invitation is required. Invitations last seven days and can be pending, accepted, or revoked. An expired invite stays pending until it is replaced or revoked, and it cannot be accepted.

Open http://localhost:3000 and sign in with `callum@trailbook.test`. Local auth emails are captured by Mailpit at http://127.0.0.1:54324. They are not delivered to a real inbox. Open the message there and follow the link in the same browser. The login page stores a short-lived verifier cookie, and `/auth/callback` exchanges the returned code for a session. A link requested outside that browser cannot finish the exchange.

An address that has not been invited is refused. The owner invites people from the private admin page. That creates the member and sends an invitation email, also captured by Mailpit. They sign in by opening that link.

Sessions use Supabase's access and refresh tokens in cookies, refreshed by `src/proxy.ts`. Access tokens last one hour. Refresh tokens are not given a time box or inactivity timeout, so members stay signed in across visits until they sign out, their access is revoked, or the browser drops the cookies. Revoked members lose access immediately, including any session that is still open.

## Journal

Signed-in members see `/hikes`, newest date first. Each hike shows its date, location, distance, difficulty, who went, and the average rating when one exists. Text, year, person, and a minimum rating of 3, 4, or 5 are filters on that same page. An empty filter result says nothing matched.

A hike page shows the description, the people who went, the saved trail link, and a Google Maps link built from the stored coordinates. Both open in a new tab. Trail links have to be `https`.

An active member can set one rating from 1 to 5 and change it later. They can add a comment, and edit or delete their own. Comments are listed oldest first. Someone else's comment stays as they wrote it.

Photos are chosen on that page, resized in the browser, and stored in the private `hike-photos` bucket. The page shows them with a signed link that lasts an hour. The person who uploaded a photo can delete it, and the owner can delete any photo. The owner can also choose one uploaded photo as the cover, which then appears on the hike list. Seeded photo rows have captions and no files, so they do not show a broken image.

A member opens Profile from the header to change their own name. The name is trimmed and stays between 1 and 80 characters. They can add a photo there too. The browser crops it to a square, resizes it, and stores one WebP file at `avatars/<user-id>/avatar.webp`. The hike page shows that photo beside their name on who went, comments, and photo credits when the file exists. Otherwise the circle stays, filled with a colour chosen for that member and their initials. The hike list keeps names as text.

The owner can create, edit, and delete hikes. The new-hike link is only a shortcut: `/hikes/new` and `/hikes/[id]/edit` are not found for anyone else, and the server actions check the owner again. Saving the people on a hike goes through `set_hike_participants`. Only active members can be newly added. Someone who was already on a hike and later lost access can stay on that record until the owner removes them. Deleting a hike also removes its participants, comments, ratings, and matching photo files. Confirm that delete on the edit page before it runs.

The seed stores cover paths and photo captions without uploading the files. A cover appears on the list only after the matching file is in storage.

## Owner administration

The owner is the single active row in `user_roles` with `role = 'owner'`. Membership is managed at `/admin/<OWNER_ROUTE_SECRET>`, separate from the hike list. From there the owner can invite an email address, revoke a pending invitation, remove a member's access, or restore it. A member who knows that address still gets a not-found response. The secret is compared on the server and is not passed into client-side configuration.

If the secret is lost, generate a new one, put it in the environment, and restart or redeploy. The owner account does not depend on the secret.

If the owner account itself is lost, create a replacement from the Supabase SQL editor by assigning `role = 'owner'` to an existing active profile, or by removing the old owner row and creating one new auth user before anyone else. Do not do this in the seed file, and do not point a reset at production.

## Storage

`hike-photos` is a private bucket. Object names look like `<hike-id>/<photo-id>.jpg`. The database stores the path, not the file. Deleting a photo row or a hike deletes the matching storage objects. Avatars use `avatars/<user-id>/avatar.webp`.

Clients must be signed in. Hike photos and avatars are shown with short-lived signed URLs created while the page renders, not public links. The browser resizes a photo before upload. The hike-photos bucket accepts JPEG, PNG, and WebP up to 12 MB. Avatars are WebP up to 2 MB, and a member can replace or remove only their own. Deleting a hike or a photo row removes the matching storage objects. If that photo was the cover, the cover path is cleared too.

## Production

Use a separate hosted Supabase project and a Vercel project.

1. Create the Supabase project and keep its URL and keys out of git.
2. Set the Vercel environment variables from `.env.example`.
3. In Supabase Auth, set the site URL to the Vercel URL and add `https://<deployment>/auth/callback` to the redirect allow list.
4. Disable public signups, and configure the `before_user_created` hook to `private.before_user_created` the same way `supabase/config.toml` does locally.
5. Apply migrations with `npx supabase link` and `npx supabase db push`. Do not reset or seed production.
6. Create the owner through the Auth admin tools while no owner row exists. The database trigger assigns the owner role to that first account.
7. Set `OWNER_ROUTE_SECRET` in Vercel and open `/admin/<that-secret>` after signing in as the owner.
8. Configure production email (Supabase's email limits, or your own SMTP). Magic links will not reach anyone until this is set.

Schema changes should be compatible with the version of the app that is already deployed. Storage buckets and policies travel with the migrations.

## Tests and checks

```bash
npm run test:db
npm run lint
npm run build
```

`npm run build` needs `.env.local` or the equivalent environment variables.

## Cost

The project is meant to stay on free tiers: Vercel for the app, and Supabase for Postgres, Auth, and Storage. There is no paid map, analytics, or image-processing service.

The limit most likely to matter first is photo storage and download bandwidth. Auth email quotas are the next constraint once the app sends real magic links. Free-tier limits change, so check the current Supabase and Vercel pricing before relying on a number.

## Troubleshooting

- `supabase start` fails immediately: Docker is not running, or another local Supabase project is using the same ports.
- Magic link never arrives: open Mailpit, not your email app. Local mail is not sent to the internet.
- "Email logins are disabled": restart the local stack after changing `supabase/config.toml` with `npx supabase stop` and `npx supabase start`.
- A new member cannot be created: add a pending invitation for that exact email first. Public signup is closed.
- The admin URL returns not found: the signed-in account is not the active owner, or `OWNER_ROUTE_SECRET` does not match the path.
- `npm run db:reset` refuses to run: `npx supabase status` is not showing a local API URL. Start the local stack first.
