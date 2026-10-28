# Backend setup: invites and the AI coach

About 20 minutes, all in your browser. Nothing here costs money on the free plans.
Do the steps in order and send Claude the two values from step 1.

---

## 1. Create the Supabase project
1. Go to **supabase.com** → sign in with GitHub or Google → **New project**.
2. Name: `habit-tracker` · Database password: click **Generate** and save it in your password manager · Region: **South Asia (Mumbai)** · Plan: **Free** → **Create new project**. Wait about 2 minutes.
3. Open **Project Settings → API Keys** (or **Settings → API**).
4. Copy these two and **send them to Claude in chat** (both are public by design):
   - **Project URL**, like `https://abcdxyz.supabase.co`
   - **Publishable key** (`sb_publishable_…`) or, on older projects, the **anon public** key (`eyJ…`)

> Never send the **secret** / **service_role** key or the database password to anyone.

## 2. Turn on anonymous sign-ins
**Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable → Save.**
(Users never see a login. Each install gets a random anonymous ID.)

## 3. Create the database
1. **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this repo, copy **all** of it, paste, click **Run**.
3. You should see "Success. No rows returned". Running it again later is safe.

## 4. Create the Claude API key (Claude Console)
1. Go to **platform.claude.com** (your Console with the $1,000 credits) → **API Keys** → **Create Key**.
2. Name: `habit-coach-supabase` → **Create** → copy the key (`sk-ant-…`). It's shown only once.
3. **Don't paste it in chat, email or the app.** It only goes into Supabase in the next step.
4. While you're there: **Limits** (or Billing → Spend limits) → set a **monthly limit**, e.g. **$50**. A bug can then never drain the credits.
5. Note the credits' **expiry date** under **Billing** (about April 2027).

## 5. Add the key to Supabase as a secret
**Edge Functions → Secrets → Add new secret**
- Name: `ANTHROPIC_API_KEY`
- Value: the `sk-ant-…` key
- **Save**

## 6. Deploy the coach function
1. **Edge Functions → Deploy a new function → Via Editor**.
2. Function name: `coach` (exactly).
3. Delete the sample code, open `supabase/functions/coach/index.ts` from this repo, copy **all** of it, paste.
4. Click **Deploy function**.
5. In the function's **Details / Settings**, keep **"Enforce JWT verification" ON**.

If the function's logs later show an error about the service key, add one more secret:
**Settings → API Keys → Secret keys** → copy the `sb_secret_…` key → **Edge Functions → Secrets** → name `HT_SERVICE_KEY` → paste → Save.

## 7. Tell Claude "done"
Claude puts the URL and publishable key into `src/config/backend.ts` and makes a build.
Invites and the coach switch on automatically in that build.

---

## Updating an existing project
When `supabase/schema.sql` changes, run it again: **SQL Editor → New query** → paste **all** of it → **Run**. It's safe to run any number of times.

**Build 53 update (cleanup of unused installs):** running it adds a "last opened" date to each install and a nightly job that removes anonymous installs nobody has opened for 90 days (only ones with no invited friends, not invited themselves, and no Pro time left). This keeps the free 500 MB database from filling up with uninstalled phones.
- Check it's scheduled: **Integrations → Cron** (or **Database → Cron Jobs**) should list `cleanup-stale-installs`, daily at 21:30 UTC (3:00 AM India).
- If the run says pg_cron isn't available: **Integrations → Cron → Enable**, then run the file again.
- Nothing is removed for the first 90 days after you run it: existing installs count as opened on that day.

## Checking it works (after the build)
- **Profile → Friends**: the orange "Invite 5 friends" card shows your invite progress.
- **Stats → Your AI coach**: accept the 18+ note, ask "Which habit should I focus on?". A reply should arrive in 2 to 4 seconds.
- **Supabase → Table Editor → profiles**: one row per install.
- **Supabase → Edge Functions → coach → Logs**: one line per question.
- **Claude Console → Usage**: a few cents at most.

## Limits built in
| Plan | AI coach |
|---|---|
| Free | 1 weekly insight per week, no chat |
| Trial | 10 replies per day |
| Monthly / Yearly / invite rewards | 300 replies per month |
| Lifetime | 100 replies per month |

At about $0.0004 per reply, 300 replies cost about $0.12 per user per month.

## Things to update in Play Console when this goes live
- **Data safety**: the app now collects data (see `docs/play-store/data-safety.md`, section "With invites and the AI coach").
- **Privacy policy**: the in-app policy is updated; the website policy is updated with the same text.
