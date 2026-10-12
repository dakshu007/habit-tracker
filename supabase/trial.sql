-- Per phone: reinstalling the app or clearing its data can't restart the
-- free trial or the AI coach's reply allowance. Plus: a Google Drive restore
-- brings back invite rewards.
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run again.
-- (Also included at the end of schema.sql.)

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

-- AI coach replies counted per phone, so clearing the app's data or
-- reinstalling doesn't reset the allowance. Used only by the coach Edge Function.
create table if not exists public.ai_device_usage (
  device_hash text not null,
  period text not null,
  replies int not null default 0,
  primary key (device_hash, period)
);
alter table public.ai_device_usage enable row level security;

create or replace function public.ai_bump_device(p_device_hash text, p_period text)
returns int language sql security definer set search_path = public as $$
  insert into ai_device_usage (device_hash, period, replies) values (p_device_hash, p_period, 1)
  on conflict (device_hash, period) do update set replies = ai_device_usage.replies + 1
  returning replies;
$$;
revoke execute on function public.ai_bump_device(text, text) from public, anon, authenticated;

-- Restoring a Google Drive backup on a new or reset phone brings back the old
-- install's invite code, invited friends and earned Pro time. The app keeps a
-- random restore key (also inside its Drive backup); only its hash is stored.
alter table public.profiles add column if not exists restore_hash text;
create unique index if not exists profiles_restore_hash on public.profiles (restore_hash) where restore_hash is not null;

create or replace function public.set_restore_key(p_key text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  h text;
begin
  if auth.uid() is null or p_key is null or length(p_key) < 20 then return; end if;
  h := encode(digest(p_key, 'sha256'), 'hex');
  update profiles set restore_hash = h where id = auth.uid() and not exists (select 1 from profiles where restore_hash = h and id <> auth.uid());
end $$;

create or replace function public.adopt_profile(p_key text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  me profiles;
  old profiles;
  h text;
  ref uuid;
begin
  if auth.uid() is null or p_key is null or length(p_key) < 20 then return 'invalid'; end if;
  h := encode(digest(p_key, 'sha256'), 'hex');
  select * into old from profiles where restore_hash = h;
  if not found then return 'unknown'; end if;
  if old.id = auth.uid() then return 'same'; end if;
  select * into me from profiles where id = auth.uid();
  if not found then return 'no_profile'; end if;
  -- Who invited this person (the old install's inviter wins), never itself.
  ref := coalesce(nullif(old.referred_by, me.id), nullif(me.referred_by, old.id));
  -- Friends invited by the old install now count for this one.
  update profiles set referred_by = me.id where referred_by = old.id and id <> me.id;
  insert into active_days (user_id, day) select me.id, day from active_days where user_id = old.id on conflict do nothing;
  delete from profiles where id = old.id;
  -- A phone can be an invited friend only once.
  if ref is not null and me.device_hash is not null
     and exists (select 1 from profiles where device_hash = me.device_hash and referred_by is not null and id <> me.id) then
    ref := nullif(me.referred_by, old.id);
  end if;
  update profiles set
    ref_code = old.ref_code,
    referred_by = ref,
    referred_at = case when ref is null then null else coalesce(old.referred_at, me.referred_at) end,
    qualified_at = coalesce(old.qualified_at, me.qualified_at),
    paid_at = coalesce(old.paid_at, me.paid_at),
    reward_until = greatest(old.reward_until, me.reward_until),
    reward_year = coalesce(old.reward_year, me.reward_year),
    reward_days_year = greatest(old.reward_days_year, me.reward_days_year),
    created_at = least(old.created_at, me.created_at),
    restore_hash = h
  where id = me.id;
  return 'ok';
end $$;
grant execute on function public.set_restore_key(text) to authenticated;
grant execute on function public.adopt_profile(text) to authenticated;
