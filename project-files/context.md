# Chat context

This is the handoff from the session that built Trailbook. Read [brief.md](brief.md) for the request and [technical-specification.md](technical-specification.md) for the current system. Local setup is in the repository [README](../README.md). The layout reference is in [design/](design/).

Do not treat this file as a new set of requirements. The user confirmed each stage below before the next one started.

## Done

1. Foundation and the local Supabase stack: Next.js, Tailwind, shadcn/ui, migrations, seed, RLS, storage buckets, and the README.
2. Sign-in and membership: magic links, invite-only signup, long-lived refreshable sessions, and the owner admin page.
3. Hike journal pages: list, detail, owner create and edit, participants, place, and trail link.
4. Photos, comments, and ratings.
5. Profile, members directory, and initials avatars. The user asked for a circle with a solid colour and initials, two letters, or one letter when the name has one word. The colour is a stable hash of the user id.
6. Design layout pass against `Trail Journal.html` and `Trail Journal.pdf`: phone bottom nav, wide top bar from about 800px, owner New hike placement, hike list cards, hike page, profile, members, login frames, grouped hike form, and the admin page.
7. Filter sheet. On a phone, search and “People and rating” open a bottom sheet on `/hikes`. Who came is a checkbox list. The URL repeats `member`. A hike matches only when every selected person came. `/hikes/find` redirects to `/hikes` with the same query.

Lint and the production build passed after the filter work. Database permission tests live in `supabase/tests/permissions.test.sql`.

## Deferred

Production hosting was the suggested next step. The user said to put it on hold, then asked for the filter sheet. The README already describes a separate hosted Supabase project and a Vercel project. Do not start that deployment unless they ask.

## Decisions that should stay

- One owner. Members do not create, edit, or delete hikes.
- The owner URL is obscurity plus a server role check. A member who opens it gets not found, not a special “not for this account” message.
- Do not print `OWNER_ROUTE_SECRET` or magic-link tokens.
- Trail links stay stored as `https` and the label is “Open the route”.
- The map stays a Google Maps search URL.
- JPEG, PNG, and WebP only.
- Do not overengineer. No Express, Redis, Prisma, paid maps, or extra image host.
- Commit only when asked.

## Local data

`npm run db:reset` reloads `supabase/seed.sql` and removes anything created afterwards. The seed owner is `callum@trailbook.test`, display name Callum Reid. On this machine the display name was changed to “Callum Mubo”, an avatar was uploaded, and a hike titled “Test Hike” (24 February 2026, Great Langdale) was added with a photo captioned “Test caption” and a comment. Those are not in the seed. Resetting the local database removes them.

Seed cover paths do not have files in storage, so those cards show the mountain placeholder. That is expected. The seed photo rows have captions and no image files.

Seed accounts, the revoked member, and the sample invites are listed in the README. Local auth mail is in Mailpit at http://127.0.0.1:54324. Sign in at http://localhost:3000 so the magic-link cookies match `NEXT_PUBLIC_SITE_URL`.

## How to continue

A new session should read this folder first, then the README, then the code for the area being changed. The design files are the visual source for layout. The technical specification is the source for behaviour that was chosen while building, including the filter sheet and the image rules.

If asked what is next, production hosting is the unfinished item from the brief. It was explicitly deferred. Confirm before setting up Vercel or a hosted Supabase project.
