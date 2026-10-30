# Trailbook project brief

This is the product brief given on 10 October 2026. The wording is unchanged. The numbered sections are headings so the document is easier to read. It describes the requested product. What was built is in [technical-specification.md](technical-specification.md).

## 1. Project objective

Build a private, mobile-first hiking journal web application for a small group of friends. The application allows the owner to create and manage hikes, assign attendees, and provide trail links and map locations. All authorised members can view hikes, upload photographs, add comments and rate hikes. The owner controls membership and is the only person authorised to create, edit or delete hike records. The application must be inexpensive to operate, easy to maintain and straightforward to develop locally. I primarily work with JavaScript and TypeScript, so use a TypeScript-first architecture. Do not overengineer the application. Prefer managed services, established libraries and straightforward implementations over custom infrastructure.

## 2. Technology stack

Use the following stack unless there is a compelling technical reason to recommend a change.

| Component | Technology |
| --- | --- |
| Framework | Next.js using the App Router |
| Language | TypeScript with strict mode |
| UI | React |
| Styling | Tailwind CSS |
| Component library | shadcn/ui |
| Icons | Lucide |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authentication method | Email magic links |
| File storage | Supabase Storage |
| Database access | @supabase/supabase-js |
| Server-side authentication | @supabase/ssr |
| Form validation | Zod |
| Form handling | React Hook Form where appropriate |
| Hosting | Vercel |
| Version control | Git |

Use stable, mutually compatible package versions at implementation time. Do not add unnecessary dependencies. In particular, avoid adding a separate Express server, Redis, Prisma, a dedicated image-hosting provider or a paid mapping service unless a genuine requirement emerges. Use Supabase's native PostgreSQL functionality and JavaScript client.

## 3. Architecture

Build a single Next.js application. Use the App Router for page routing and server-side functionality. Separate the application into sensible areas:

- UI components.
- Page and route components.
- Authentication utilities.
- Supabase client configuration.
- Database queries and mutations.
- Validation schemas.
- Types.
- Application services where useful.

Use Server Components by default. Use Client Components when browser interaction is required, such as image selection, interactive rating controls, form state and gallery navigation. Use Server Actions or Route Handlers for appropriate server-side mutations and operations. Choose the simplest approach that maintains clear separation of concerns. Do not build a separate REST API purely for the sake of having an API.

### Important security requirements

Never expose a Supabase service-role key to the browser. Use the publishable key for ordinary client access, with database permissions enforced through Row Level Security. Server-side operations requiring elevated privileges must be limited to specific trusted administrative operations. Where an elevated Supabase client is necessary, keep it server-only and use it exclusively in narrowly scoped functions that independently validate the authenticated user's permissions. Never assume that hiding a button or page makes an operation secure. All authorisation rules must be enforced on the server and, where appropriate, at the database level.

## 4. Local development and environments

Local development is a requirement, not an optional enhancement. Use the official Supabase CLI and its local development stack, which runs through Docker. The objective is to allow the application to run locally without depending on the production Supabase project.

### Required local setup

The repository should support a workflow similar to:

1. Install the project's Node.js dependencies.
2. Install the Supabase CLI.
3. Start the local Supabase services.
4. Apply database migrations.
5. Seed local development data.
6. Start the Next.js development server.
7. Test authentication, database operations and image uploads locally.

Use the official Supabase CLI commands appropriate to the installed version. For example, the workflow will generally involve:

```
npm install
```

```
npx supabase start
npx supabase db reset
```

```
npm run dev
```

Document any additional requirements, including Docker installation and local email testing. Use the Supabase CLI's generated local API URL, keys and other configuration values rather than hard-coding them.

### Database migrations

All database schema changes must be represented by version-controlled SQL migrations. Do not rely on manually creating tables in the Supabase dashboard. The repository should contain a migration history that can recreate the database from scratch. Migrations must include:

- Tables and columns.
- Primary and foreign keys.
- Constraints and indexes.
- Functions and triggers where required.
- Row Level Security policies.
- Storage bucket configuration and storage access policies where applicable.

Use migrations as the source of truth for both local development and production deployments.

### Seed data

Create a development seed process that generates realistic test data. Include:

- Several example hikes.
- Example member profiles.
- Hike participants.
- Example ratings.
- Comments.
- Example photo metadata where appropriate.

Seed data must be safe to recreate and must not overwrite or modify production data. Do not hard-code real production credentials or create a privileged production user through seed scripts. Document how to create or configure a local owner account for testing.

### Environment separation

Use separate environment configurations for local development and production. Provide a .env.example containing the names and descriptions of the required variables, but no real credentials. Use .env.local for local configuration and ensure it is excluded from Git. Local development should point to the local Supabase instance. Production should point to the production Supabase project. Do not allow a local database reset or seed command to operate on the production database accidentally. Include appropriate safeguards and clear setup documentation.

## 5. Authentication

Use Supabase Auth with email magic links. Do not implement password authentication. Do not implement SMS authentication. Do not introduce another authentication provider unless required by a genuine limitation.

### Login flow

Users should be able to:

1. Open the login page.
2. Enter their email address.
3. Request a magic link.
4. Open the link in their browser.
5. Authenticate and access the application.

Handle the authentication callback correctly, including exchanging the appropriate authentication code for a session. Configure the correct redirect URLs for both local development and production. Use environment variables for application URLs rather than hard-coding the production domain. Handle expired or invalid magic links gracefully. Show useful error messages without revealing unnecessary account information.

### Invite-only registration

The application must not support unrestricted public registration. Only the owner can invite new members. Implement a proper invitation flow that allows an invited person to establish an account using the intended email address. Invitations must not be usable to grant access to an arbitrary, different email address. Use the supported Supabase Auth invitation functionality where appropriate, or implement an invitation process that securely establishes the intended identity. An invitation should have a defined lifecycle, including pending, accepted and revoked states where applicable. Prevent an invitation from being accepted multiple times to create unintended accounts or permissions. Do not rely solely on hiding the sign-up form. Important: Supabase Auth settings and database authorisation must work together to enforce the invite-only requirement. Ensure that users cannot bypass the invitation process by calling authentication endpoints directly or manipulating browser requests.

### User profiles

Maintain a profile record associated with each authenticated Supabase user. Use the Supabase Auth user ID as the profile's stable identifier. A profile should include:

- User ID.
- Display name.
- Avatar path.
- Created timestamp.
- Updated timestamp.

Additional profile fields can be introduced where useful. Do not store passwords or authentication tokens in the profiles table.

## 6. Long-lived authentication sessions

A major usability requirement is to keep members logged in for an extended period. The experience should resemble a typical consumer social application, where users can return to the website repeatedly without needing to authenticate again every few days. However, do not implement this by creating permanent authentication tokens or disabling session security.

### Required behaviour

- Persist the authentication session appropriately in the browser.
- Use Supabase's supported session and refresh-token mechanisms.
- Ensure authentication works correctly across Next.js Server Components, Server Actions and Route Handlers.
- Configure @supabase/ssr correctly for server-side rendering and cookie-based sessions.
- Refresh sessions when appropriate.
- Ensure refreshed cookies are propagated correctly.
- Avoid unnecessarily short session lifetimes.
- Avoid forcing users to authenticate again when their session can legitimately be refreshed.
- Support explicit sign-out.
- Ensure revoked accounts can no longer access protected content.

Do not introduce custom local-storage token management if the supported Supabase client and SSR integration already handle the required behaviour. Do not implement arbitrary periodic logouts or excessively aggressive inactivity checks. Review the available Supabase Auth settings and configure suitable session limits for this private, low-risk application. Do not assume that a browser cookie can be made permanent regardless of browser behaviour or authentication-provider limits. A user who clears browser data, revokes their session or uses a browser that discards cookies may need to authenticate again. The goal is long-lived, automatically refreshed sessions, not the elimination of all possible reauthentication.

## 7. Owner account and private administration URL

The application has one privileged owner. The owner is the only person authorised to:

- Create hikes.
- Edit hikes.
- Delete hikes.
- Invite members.
- Revoke invitations.
- Manage membership.

All other authorised users are ordinary members.

### Owner login

The owner must authenticate through the same email magic-link system as other users. After authentication, the application must determine the user's role from trusted server-side data. Do not infer the user's role from an email address supplied by the browser or editable profile metadata. Use a trusted role assignment that ordinary members cannot modify.

### Private owner route

Create a configurable owner administration route, such as:

/admin/<OWNER_ROUTE_SECRET>

The unique path should be configured through an environment variable and should not be committed to version control. Use an environment variable with a descriptive name, such as:

OWNER_ROUTE_SECRET

The route must only be available when the authenticated user is the designated owner. The owner must still authenticate with their email magic link. If an ordinary member knows or guesses the route, they must not gain access. Do not create:

- A secret password bypass.
- A hidden authentication endpoint.
- An unauthenticated administrative API.
- A route that automatically grants the owner role.
- A backdoor using a query parameter or client-side flag.

Treat the obscure URL as an additional layer of obscurity, not as the security boundary. The owner's role must be independently verified. Do not include the route secret in browser-visible JavaScript, client-side configuration, logs or error messages. Avoid unnecessarily exposing whether a guessed administrative route exists. Provide an appropriate not-found or access-denied response for unauthorised requests.

### Owner recovery

Document how to recover owner access if the route secret or owner configuration is lost. Do not make the route secret the sole means of identifying the owner. Owner identity and privileges should be recoverable through trusted server-side configuration or a controlled administrative procedure.

## 8. Database schema

Use PostgreSQL with a relational schema. Use UUIDs for identifiers where appropriate, foreign keys for relationships, timestamps for auditability and database constraints to prevent invalid records. The following describes the minimum data model. Adapt field names and implementation details where appropriate, but preserve the intended relationships and permissions.

### profiles

Stores member profile information. Suggested columns:

```
id              UUID PRIMARY KEY
display_name    TEXT NOT NULL
avatar_path     TEXT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

The profile ID must correspond to the authenticated Supabase user ID. Use a secure mechanism to create profiles when users are provisioned or invited. Ensure profile creation cannot be used to grant privileges.

### user_roles

Stores trusted application roles. Suggested columns:

```
user_id         UUID PRIMARY KEY
role            TEXT NOT NULL
created_at      TIMESTAMPTZ
```

Supported roles:

owner

member

Restrict role assignment and changes to trusted administrative operations. Ordinary members must not be able to promote themselves to owner or modify another user's role. Consider using database functions or other controlled mechanisms for role checks, with appropriate execution permissions and protection against recursive RLS policies. Do not store the authoritative owner role solely in user-editable metadata.

### hikes

Stores the main hike records. Suggested columns:

```
id              UUID PRIMARY KEY
title           TEXT NOT NULL
description     TEXT NULL
hike_date       DATE NOT NULL
location_name   TEXT NULL
latitude        DOUBLE PRECISION NULL
longitude       DOUBLE PRECISION NULL
trail_url       TEXT NULL
distance_km     NUMERIC NULL
difficulty      TEXT NULL
```

cover_photo_path TEXT NULL

```
created_by      UUID NOT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

Not every optional field needs to be displayed in the initial UI. Validate coordinate ranges, URLs and difficulty values where appropriate. Only the owner can create, edit or delete hikes.

### hike_participants

Links hikes to attendees. Suggested columns:

```
hike_id         UUID NOT NULL
user_id         UUID NOT NULL
created_at      TIMESTAMPTZ
```

Use a composite primary key or unique constraint on:

```
(hike_id, user_id)
```

This prevents duplicate attendance records. Deleting a hike should remove its participant relationships. Deleting a member should not accidentally delete an entire hike.

### hike_photos

Stores metadata for uploaded photographs. Suggested columns:

```
id              UUID PRIMARY KEY
hike_id         UUID NOT NULL
user_id         UUID NOT NULL
storage_path    TEXT NOT NULL UNIQUE
caption         TEXT NULL
created_at      TIMESTAMPTZ
```

The actual image files must be stored in Supabase Storage, not as binary data in PostgreSQL. Only authorised members may upload photographs. Members may only delete their own photographs unless an explicit owner moderation permission is implemented. When a photo is deleted, handle the corresponding storage object safely. Avoid orphaned storage files and database records where practical.

### hike_comments

Stores comments associated with hikes. Suggested columns:

```
id              UUID PRIMARY KEY
hike_id         UUID NOT NULL
user_id         UUID NOT NULL
content         TEXT NOT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

Validate comment length and reject empty or whitespace-only comments. Members may create comments and manage their own comments. Do not allow members to modify another person's comments.

### hike_ratings

Stores each member's rating for each hike. Suggested columns:

```
id              UUID PRIMARY KEY
hike_id         UUID NOT NULL
user_id         UUID NOT NULL
score           INTEGER NOT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

Requirements:

- Ratings must be integers from 1 to 5.
- Each member may have only one rating per hike.
- Enforce uniqueness on (hike_id, user_id).
- Allow members to update their own rating.
- Calculate average ratings and rating counts from the stored records.

Use a database query or view to calculate aggregate ratings. Do not store a permanently duplicated average value unless there is a demonstrated performance reason to do so.

### invitations

Stores membership invitations. Suggested columns:

```
id              UUID PRIMARY KEY
email           TEXT NOT NULL
invited_by      UUID NOT NULL
status          TEXT NOT NULL
created_at      TIMESTAMPTZ
expires_at      TIMESTAMPTZ NULL
accepted_at     TIMESTAMPTZ NULL
```

Define appropriate invitation states. The implementation may need additional fields or a separate invitation-token mechanism, depending on the Supabase Auth invitation flow chosen. Do not expose sensitive invitation tokens through normal member-facing queries. Use appropriate uniqueness and lifecycle rules to prevent invitations being accidentally duplicated or reused.

## 9. Database relationships and deletion behaviour

Implement explicit foreign keys and sensible deletion behaviour. Consider the following requirements:

- Deleting a hike removes its participants, comments and ratings.
- Deleting a hike must also trigger appropriate cleanup of associated photos and storage objects.
- Deleting a member must not delete hikes created by the owner.
- Removing a member's access must prevent future reads and writes to private application data.
- Existing contributions should not be silently reassigned to another user.
- Account deletion should not leave uncontrolled orphaned records.

Be particularly careful when database cascades interact with Supabase Storage, because deleting a database row does not automatically delete its associated file. Where external storage cleanup is required, implement an explicit, reliable cleanup procedure.

## 10. Row Level Security and authorisation

Enable Row Level Security on all tables exposed through the Supabase API. Create policies that enforce the following rules.

| Operation | Owner | Member |
| --- | --- | --- |
| View hikes | Yes | Yes |
| Create hikes | Yes | No |
| Edit hikes | Yes | No |
| Delete hikes | Yes | No |
| View participants | Yes | Yes |
| Manage participant lists | Yes | No |
| View photos | Yes | Yes |
| Upload photos | Yes | Yes |
| Delete own photos | Yes | Yes |
| Delete another member's photos | Yes, if moderation is implemented | No |
| View comments | Yes | Yes |
| Create comments | Yes | Yes |
| Edit own comments | Yes | Yes |
| Edit another member's comments | Yes | No |
| View ratings | Yes | Yes |
| Create or update own rating | Yes | Yes |
| Modify another member's rating | No, unless explicitly implementing trusted moderation | No |
| Manage invitations | Yes | No |
| Manage roles | Trusted administrative operation only | No |

These permissions must be enforced independently of the UI.

### Important implementation details

- Verify the authenticated user for every protected operation.
- Use the trusted role source for owner checks.
- Do not trust a submitted user_id when creating contributions; derive the contributor identity from the authenticated session wherever possible.
- Prevent unauthorised modification of system-managed fields.
- Ensure members cannot insert arbitrary rows into privileged tables.
- Ensure members cannot create or modify another member's profile or role.
- Restrict invitation management to the owner.
- Ensure revoked members cannot continue using existing sessions to access private content.
- Test both positive and negative permission cases.

Be careful with PostgreSQL RLS helper functions. If a function uses elevated privileges, constrain its behaviour and execution permissions appropriately. Do not disable RLS as a workaround for query errors.

## 11. Photo storage and uploads

Use Supabase Storage with a private bucket for hiking photographs. Do not make the entire photo bucket publicly accessible. Store each image using a predictable, non-sensitive structure, for example:

<hike-id>/<photo-id>.<extension>

Do not trust client-provided filenames as storage paths. Generate safe object names and validate accepted image formats.

### Upload requirements

- Allow multiple images to be selected and uploaded.
- Provide progress feedback.
- Handle failures gracefully.
- Allow failed uploads to be retried.
- Avoid duplicate records during retries.
- Enforce reasonable per-file size limits.
- Validate file types.
- Handle partial upload failures.
- Ensure the user is authorised to upload to the target hike.

Allow members to upload photos to any hike they can access.

### Image optimisation

Keep storage costs low. Where appropriate, resize large photographs before upload and generate smaller display versions. Do not unnecessarily retain multiple full-resolution copies. Consider generating:

- A thumbnail for hike cards.
- A gallery-sized version for browsing.
- An original image only if retaining the original is a deliberate requirement.

Choose the simplest implementation that provides a good balance between quality, upload speed and storage use. Do not add a paid image-processing service for the initial version.

### Accessing photographs

Use authenticated access or appropriately short-lived signed URLs. Do not expose permanent public URLs for private photographs. Ensure gallery access works correctly with session refreshes and expired signed URLs. Test upload and retrieval behaviour in the local Supabase environment.

## 12. Main application pages

Implement the following pages.

### Public authentication pages

- /login
- Authentication callback route.
- Invitation acceptance route, if required by the selected invitation flow.

These pages should not expose private application data to unauthenticated visitors.

### Member pages

- /hikes — chronological hike feed.
- /hikes/[id] — hike detail, photographs, ratings and comments.
- /members — group member directory.
- /members/[id] — private member profile, if implemented.
- /profile — edit personal profile.

Use appropriate server-side authentication checks and database policies.

### Owner pages

- Owner dashboard at the configurable private administration URL.
- Owner-only hike creation and editing interfaces.
- Owner-only membership and invitation management.

Use a route structure that integrates sensibly with Next.js App Router conventions. Do not put the secret route value into public environment variables or client-side code.

## 13. Hike functionality

The owner must be able to create, edit and delete hikes. A hike should support:

- Title.
- Date.
- Description.
- Location name.
- Latitude and longitude.
- Trail URL.
- Optional distance.
- Optional difficulty.
- Optional cover photograph.
- Participants.

Use validation schemas for all submitted data. The participant selector should support selecting multiple members efficiently. Updating a participant list must correctly insert and remove the relevant relationship records. Avoid replacing the entire participant list unless that operation is handled atomically or otherwise protected against partial failure. Hike deletion should require confirmation in the UI and should clean up associated records and files.

## 14. Comments and ratings

Implement comments and ratings directly against the Supabase database. Comments should be displayed in chronological order. Ratings should support:

- Creating a rating.
- Viewing the current user's rating.
- Updating the current user's rating.
- Viewing the average rating.
- Viewing the number of ratings.

Prevent duplicate ratings using the database constraint, not just a client-side check. Use sensible loading and error states. Avoid building a real-time notification system or live chat unless it becomes a genuine requirement. A simple refresh or revalidation strategy is sufficient for the initial version.

## 15. Maps and trail links

Do not introduce a paid mapping API in the initial version. Store latitude and longitude when available. Provide an external map link that opens the location in a suitable mapping application. Provide the saved trail URL as an external link. Validate URLs and use safe link handling. If an embedded map is later introduced, prefer a low-cost or open-source option, and assess its usage restrictions before deployment.

## 16. Application security

This is a private, low-risk application, so security should be proportionate rather than unnecessarily complicated. However, it contains private accounts, personal photographs and member information, so basic access control is essential. Implement:

- Server-side authentication checks.
- Database Row Level Security.
- Invite-only membership.
- Owner-only administrative actions.
- Private photo storage.
- Input validation.
- Safe rendering of user-generated content.
- Appropriate authentication rate limits.
- Safe environment-variable handling.
- Clear sign-out and account-revocation behaviour.

Do not build custom cryptography or custom authentication protocols. Use the authentication provider's established mechanisms. Do not log authentication tokens, invitation secrets or other credentials. Do not add unnecessary security middleware or complex infrastructure when existing framework and provider features are sufficient.

## 17. UI implementation

Follow the separate design brief for the visual design and user experience. Use Tailwind CSS and shadcn/ui to implement the interface. Use Lucide icons where appropriate. Keep the interface mobile-first. The most important interactions are:

- Logging in.
- Browsing hikes.
- Uploading photographs.
- Rating hikes.
- Adding comments.
- Creating hikes as the owner.
- Inviting members.

Build reusable components where there is genuine reuse, including:

- Hike cards.
- Rating controls.
- Photo gallery.
- Photo uploader.
- Comment list and form.
- Participant selector.
- Member avatars.
- Loading states.
- Empty states.
- Error messages.

Avoid creating an excessively abstract component architecture. Prioritise clear, maintainable code.

## 18. Testing

Implement meaningful tests for the parts of the application where failures would matter most. At a minimum, verify the following.

### Authentication

- An invited user can authenticate.
- An uninvited user cannot gain membership.
- Magic-link callbacks work locally and in production.
- Sessions persist and refresh correctly.
- Revoked members lose access.

### Authorisation

- Ordinary members cannot create, edit or delete hikes.
- Ordinary members cannot manage invitations.
- Ordinary members cannot promote themselves to owner.
- Members cannot edit another member's comments.
- Members cannot modify another member's rating.
- Unauthenticated users cannot read private hikes or photographs.

### Hikes

- The owner can create and edit hikes.
- Participants can be assigned and changed.
- Invalid input is rejected.
- Hike deletion handles associated records correctly.

### Photos

- Members can upload multiple photographs.
- Upload failures can be retried.
- Members can view authorised photographs.
- Unauthorised users cannot retrieve private images.
- Deletion does not leave uncontrolled orphaned storage files.

### Ratings and comments

- Each member can have only one rating per hike.
- Ratings can be updated.
- Average ratings and counts are correct.
- Empty comments are rejected.
- Members cannot edit another member's contributions.

Use automated tests for database permissions and core business logic wherever practical. Do not rely solely on manually testing the UI.

## 19. Deployment

Deploy the application to Vercel and use a hosted Supabase project for production. Keep the production environment separate from the local development environment. Document:

- Required environment variables.
- Supabase project setup.
- Authentication redirect configuration.
- Invitation configuration.
- Database migration deployment.
- Storage bucket and policy setup.
- Vercel deployment.
- Owner account provisioning.
- Private administration route configuration.

Ensure the build succeeds in a clean environment. Use production configuration only for production deployments. Do not automatically reset or reseed the production database during deployment. Before deploying schema changes, consider their compatibility with the currently deployed application. The application should work on its default Vercel deployment URL; a custom domain is optional.

## 20. Cost management

The project should aim for the lowest practical ongoing cost. Prefer free tiers where they are suitable. Avoid unnecessary recurring subscriptions. Pay particular attention to:

- Image storage.
- Image bandwidth and downloads.
- Authentication email delivery.
- Database usage.
- Hosting plan eligibility.
- Any third-party APIs.

Keep the application functional without paid map services, analytics platforms or external image-processing services. Do not introduce analytics or tracking unless explicitly requested. Document the free-tier limitations and identify which resource is most likely to require an upgrade as the application grows. Do not assume that free tiers are unlimited or that their terms will remain unchanged.

## 21. Documentation

Create a useful README.md covering:

- Project overview.
- Technology stack.
- Prerequisites.
- Installation.
- Local development setup.
- Supabase CLI usage.
- Environment variables.
- Database migrations.
- Seed data.
- Authentication setup.
- Invitation flow.
- Storage configuration.
- Testing.
- Production deployment.
- Owner account setup.
- Troubleshooting common issues.

Someone familiar with JavaScript and TypeScript should be able to clone the repository and get the application running locally by following the README.

## 22. Implementation workflow

Do not attempt to implement the entire application in one unreviewed step. Work incrementally.

### Phase 1: Foundation

- Initialise Next.js and TypeScript.
- Configure Tailwind CSS and shadcn/ui.
- Configure Supabase clients.
- Establish the local development environment.
- Create migrations and seed data.
- Document setup.

### Phase 2: Authentication and permissions

- Implement email magic-link login.
- Configure persistent sessions.
- Implement invite-only membership.
- Establish trusted owner permissions.
- Implement the private owner route.
- Test Row Level Security.

### Phase 3: Hike management

- Implement hike listing and detail pages.
- Implement owner-only hike creation and editing.
- Implement participant management.
- Add location and trail links.

### Phase 4: Community features

- Implement photo uploads and galleries.
- Implement comments.
- Implement ratings.
- Implement member profiles.

### Phase 5: Polish and deployment

- Refine mobile layouts.
- Add loading, empty and error states.
- Test permissions and uploads.
- Optimise images.
- Deploy to Vercel.
- Document production setup.

At the end of each phase:

1. Explain what has been implemented.
2. List important architectural decisions.
3. Identify anything that remains incomplete.
4. Run the relevant tests.
5. Confirm that the local development workflow still works.

Do not silently skip requirements. If a requirement is ambiguous, explain the ambiguity and recommend the simplest suitable implementation before introducing significant complexity.

## 23. Final acceptance criteria

The application is ready for its first usable release when:

- The application runs locally using the documented development workflow.
- Database schema changes are reproducible through migrations.
- Users can authenticate using email magic links.
- Membership is invitation-only.
- The owner can access the private administration area after authentication.
- Ordinary members cannot access owner-only functionality.
- Sessions persist and refresh without unnecessary repeated logins.
- The owner can create, edit and delete hikes.
- The owner can assign participants.
- Members can upload and view photographs.
- Members can comment on hikes.
- Members can rate hikes and update their own ratings.
- Hike ratings and counts are calculated correctly.
- Private data and photographs are protected by server-side and database-level permissions.
- The application works well on mobile devices.
- The application can be deployed to Vercel with a hosted Supabase backend.
- The README explains how to run, test and deploy the project.

Begin by reviewing the specification and proposing the project structure, database migrations and local development setup. Do not start by building every UI page. Establish the architecture, authentication and permissions correctly before layering on the features.

## My recommendations before you start building

There are three decisions in these briefs that I think are particularly important.

1. Use the local Supabase stack from day one

You don't need to develop against your live database. The Supabase CLI can run a local PostgreSQL database and associated services, including Auth and Storage, using Docker. Your development workflow can look like this:

```
Your computer
│
├── Next.js application
│   └── localhost:3000
│
└── Local Supabase
    ├── PostgreSQL database
    ├── Authentication
    ├── Storage
    └── Local API
```

When you deploy the application, the same code connects to your hosted Supabase project instead. The key is to keep your database migrations and configuration in Git, rather than relying on manual changes in the Supabase dashboard. One detail worth knowing: local authentication emails are normally captured through the local development tooling rather than delivered as production emails. You can test the magic-link flow without sending real emails to yourself or your friends. You will still need to configure real email delivery for production.

2. Don't make the root URL the only protection

Your idea of having a unique URL that only you know is reasonable as a way to keep the administration area out of ordinary navigation. However, I'd implement two separate protections:

- Route protection: The owner dashboard has a unique, configurable URL.
- Role protection: The server and database verify that the authenticated user is the owner.

This means that even if a friend discovers the URL, they cannot manage your hikes or invite other people. It also avoids the risk of making the secret URL responsible for granting privileges.

3. Don't try to create permanent sessions

Your desired experience is achievable without inventing a custom authentication system. Use Supabase's supported session persistence and refresh mechanisms, configure sensible session limits and avoid unnecessary logouts. The browser will generally keep the session available across visits, provided its cookies or storage aren't cleared and the session remains valid. That gets you much closer to the convenience of Facebook or Instagram without compromising the underlying authentication model.
