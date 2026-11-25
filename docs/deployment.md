# Deployment and release workflow

## Hosting decision

Host the pilot frontend on Cloudflare Pages and use Supabase for Auth, Postgres and its authenticated Data API. The Pages build has no staff data. Task reads are filtered in Postgres by row level security. The two write functions recheck account access, centralise validation and record the change in the same transaction.

Start with one Free Supabase project named `lightning-pe-pilot` and use invented staff and task data. Singapore is an available specific region. Confirm the school's data-location, backup, recovery and identity requirements before selecting a live environment. Free projects can pause after inactivity. Production should have a written restore procedure and a successful restore drill. See [Supabase pricing](https://supabase.com/pricing), [available regions](https://supabase.com/docs/guides/platform/regions) and [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

The current private Codex Sites prototype and the pilot are separate deployments. The tagged prototype uses browser-local sample data. The pilot provides staff sign-in, task creation, administrator assignment, task status updates and an administrator-only database audit trail. School identity, MFA, staff administration, assignment changes, supporters, fixtures, trips, results, requests, reminders and live migration still require backend work. This pilot shell does not include the student demo.

## Local development

1. Use Node 22 or newer with the dependencies in the lockfile. Run `npm ci`.
2. Start the [local Supabase stack](https://supabase.com/docs/guides/local-development/cli/getting-started) with the Supabase CLI and Docker using `supabase start`. The project configuration disables self-signup. Its migrations start with an empty database.
3. In local Supabase Studio, create three confirmed **invented** Auth users representing an administrator and two staff members. Insert a matching profile for each user using the SQL editor. Replace each example UUID with the actual test user's ID.

   ```sql
   insert into public.staff_profiles (id, display_name, role)
   values
     ('10000000-0000-4000-8000-000000000001', 'Pilot Administrator', 'admin'),
     ('10000000-0000-4000-8000-000000000002', 'Pilot Staff A', 'staff'),
     ('10000000-0000-4000-8000-000000000003', 'Pilot Staff B', 'staff');
   ```

4. Export `PILOT_SUPABASE_URL` and `PILOT_SUPABASE_PUBLISHABLE_KEY` using the local URL and public publishable key from the CLI. Run `npm run build:pilot` and `npm run dev:pilot`. The pilot runs on `http://localhost:4174` by default. The original demo still runs with `npm run dev` on port 4173. Two blank pilot variables create an unconfigured build for CI.
5. As the administrator, assign test work to Staff A. Sign in as Staff A to check its appearance, save a waiting update and mark it done. Sign in as Staff B and verify their task list excludes Staff A's task. Confirm `public.staff_task_events` records the changes. Use a separate account session for each persona when checking access.

## First hosted pilot

1. In the Supabase dashboard, create the pilot project and disable new account signups and anonymous sign-ins. A school-approved account should own any live production project. The Supabase connection in Codex can be scoped to the pilot project, while reviewed migrations remain the record of schema changes.
2. Apply the reviewed pilot migration using the [Supabase CLI environment workflow](https://supabase.com/docs/guides/deployment/managing-environments) against the pilot project ref. Provision invented test accounts and their staff profiles through the dashboard as in local development.
3. In Cloudflare Workers & Pages, create a **Pages** project connected to the selected GitHub repository. For the first preview, disable automatic production deployments and allow preview builds for `feature/backend-pilot`. Set the build command to `npm run build:pilot` and the output directory to `build/pilot`. Set the Node version to 22 or newer and add the two build variables to the preview environment using the **pilot** project URL and publishable key. Use the Cloudflare Access policy for restricted previews if the pilot needs a second access gate. See [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) and [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).
4. Verify sign-in and complete the access checks above on the hosted URL. Record the deployment URL, reviewed commit and database project ref in the pull request. Use invented records throughout this stage.

Runbook configuration accepts only the project URL and publishable key in the browser bundle. Database passwords, secret keys, Auth admin credentials, school records and exports belong in the provider's approved secure storage. The public repository contains source code and invented fixtures.

## Changes, releases and recovery

- `main` begins at the known-good prototype. `prototype-v0.1.0` records its exact commit. Feature work uses a separate branch and a pull request documenting changes, verification and database impact.
- GitHub CI checks syntax, runs prototype workflows and PostgreSQL access tests, and builds the pilot. Keep `main` behind a pull-request rule and require the `verify` check when protection is enabled. The production deployment should be a conscious promotion of a tested commit.
- Branch previews use only the pilot database. A future production build uses its own database project, configuration, credentials and release path. Branch previews have no access to production data.
- Use additive migrations first, then release compatible code. Back up the database and test restoration before destructive production changes. A Cloudflare rollback restores the frontend deployment. Database changes require their own reviewed forward fix or tested recovery. See [Cloudflare rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
