-- Habit Tracker backend: invites (referrals) and AI coach usage.
-- Paste all of this into Supabase → SQL Editor → New query → Run. Safe to run again.
--
-- Users are anonymous: the app signs in with Supabase anonymous auth, so there
-- are no emails or passwords. Habits and logs never leave the phone; this only
-- stores an invite code, invite progress, AI reply counts and AI reports.

create extension if not exists pgcrypto with schema extensions;

-- One row per app install (anonymous user).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ref_code text unique not null,
  device_hash text,
  referred_by uuid references public.profiles (id) on delete set null,
  referred_at timestamptz,
  qualified_at timestamptz,
  paid_at timestamptz,
  reward_until timestamptz,
  reward_year int,
  reward_days_year int not null default 0,
  created_at timestamptz not null default now()
);
-- A phone can be an invited friend only once.
create unique index if not exists profiles_referred_device on public.profiles (device_hash) where referred_by is not null;

-- Days an invited friend opened the app (server date, India time).
create table if not exists public.active_days (
  user_id uuid references public.profiles (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

-- AI coach replies per period ('m-2026-10', 'd-2026-10-11', 'w-2026-41').
create table if not exists public.ai_usage (
  user_id uuid references public.profiles (id) on delete cascade,
  period text not null,
  replies int not null default 0,
  primary key (user_id, period)
);

-- AI replies a user flagged as wrong or offensive (Google Play AI policy).
create table if not exists public.ai_reports (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  reply text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.active_days enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_reports enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
-- Everything else goes through the functions below (security definer).

-- Rewards: 14 days per friend who used the app on 3 days, +20 at the 5th
-- friend (so 5 friends = 90 days), +30 when a friend pays. Max 365 days a year.
create or replace function public.grant_reward(p_user uuid, p_days int)
returns void language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from now() at time zone 'Asia/Kolkata');
  given int;
  add_days int;
begin
  select case when reward_year = y then reward_days_year else 0 end into given from profiles where id = p_user;
  add_days := least(p_days, greatest(0, 365 - coalesce(given, 0)));
  if add_days <= 0 then return; end if;
  update profiles
     set reward_until = greatest(coalesce(reward_until, now()), now()) + make_interval(days => add_days),
         reward_year = y,
         reward_days_year = coalesce(given, 0) + add_days
   where id = p_user;
end $$;
revoke execute on function public.grant_reward(uuid, int) from public, anon, authenticated;

create or replace function public.new_ref_code()
returns text language plpgsql set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where ref_code = code);
  end loop;
  return code;
end $$;

-- Called on app start: makes sure this install has a profile and an invite code.
create or replace function public.ensure_profile(p_device text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  me profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into me from profiles where id = auth.uid();
  if not found then
    insert into profiles (id, ref_code, device_hash)
    values (auth.uid(), new_ref_code(), case when p_device is null or p_device = '' then null else encode(digest(p_device, 'sha256'), 'hex') end)
    returning * into me;
  end if;
  return json_build_object('code', me.ref_code, 'referred', me.referred_by is not null, 'reward_until', me.reward_until);
end $$;

-- A new install says who invited it (code from the Play Store link).
create or replace function public.claim_referral(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  inviter profiles;
begin
  select * into me from profiles where id = auth.uid();
  if not found then return 'no_profile'; end if;
  if me.referred_by is not null then return 'already'; end if;
  if me.created_at < now() - interval '3 days' then return 'late'; end if;
  select * into inviter from profiles where ref_code = upper(trim(p_code));
  if not found then return 'invalid'; end if;
  if inviter.id = me.id then return 'self'; end if;
  if me.device_hash is not null and exists (select 1 from profiles where device_hash = me.device_hash and referred_by is not null) then
    return 'device';
  end if;
  update profiles set referred_by = inviter.id, referred_at = now() where id = me.id;
  return 'ok';
end $$;

-- Once a day: records that this install was used today. An invited friend
-- qualifies on their 3rd day, which rewards the inviter.
create or replace function public.mark_active()
returns void language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  days int;
  friends int;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.referred_by is null or me.qualified_at is not null then return; end if;
  insert into active_days (user_id, day) values (me.id, (now() at time zone 'Asia/Kolkata')::date) on conflict do nothing;
  select count(*) into days from active_days where user_id = me.id;
  if days >= 3 then
    update profiles set qualified_at = now() where id = me.id;
    perform grant_reward(me.referred_by, 14);
    select count(*) into friends from profiles where referred_by = me.referred_by and qualified_at is not null;
    if friends = 5 then perform grant_reward(me.referred_by, 20); end if;
  end if;
end $$;

-- An invited friend bought Pro: their inviter gets a month.
create or replace function public.report_paid()
returns void language plpgsql security definer set search_path = public as $$
declare
  me profiles;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.referred_by is null or me.paid_at is not null then return; end if;
  update profiles set paid_at = now() where id = me.id;
  perform grant_reward(me.referred_by, 30);
end $$;

-- Invite progress for the Profile screen.
create or replace function public.my_referrals()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'code', p.ref_code,
    'joined', (select count(*) from profiles f where f.referred_by = p.id),
    'qualified', (select count(*) from profiles f where f.referred_by = p.id and f.qualified_at is not null),
    'reward_until', p.reward_until
  )
  from profiles p where p.id = auth.uid();
$$;

-- Flag an AI reply (Play policy: users must be able to report AI content).
create or replace function public.report_ai(p_reply text, p_reason text)
returns void language sql security definer set search_path = public as $$
  insert into ai_reports (user_id, reply, reason) values (auth.uid(), left(p_reply, 4000), left(p_reason, 200));
$$;

-- Used only by the coach Edge Function (service role) to count replies.
create or replace function public.ai_bump(p_user uuid, p_period text)
returns int language sql security definer set search_path = public as $$
  insert into ai_usage (user_id, period, replies) values (p_user, p_period, 1)
  on conflict (user_id, period) do update set replies = ai_usage.replies + 1
  returning replies;
$$;
revoke execute on function public.ai_bump(uuid, text) from public, anon, authenticated;

grant execute on function public.ensure_profile(text) to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.mark_active() to authenticated;
grant execute on function public.report_paid() to authenticated;
grant execute on function public.my_referrals() to authenticated;
grant execute on function public.report_ai(text, text) to authenticated;


create table if not exists public.device_trials (
  device_hash text primary key,
  started_at timestamptz not null
);
alter table public.device_trials enable row level security;

-- Returns this phone's earliest trial start (the app's local start counts too).
create or replace function public.trial_start(p_device text, p_local timestamptz)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare
  h text;
  started timestamptz;
begin
  if auth.uid() is null or p_device is null or p_device = '' then return p_local; end if;
  h := encode(digest(p_device, 'sha256'), 'hex');
  insert into device_trials (device_hash, started_at)
  values (h, least(coalesce(p_local, now()), now()))
  on conflict (device_hash) do update set started_at = least(device_trials.started_at, excluded.started_at)
  returning started_at into started;
  return started;
end $$;
grant execute on function public.trial_start(text, timestamptz) to authenticated;
