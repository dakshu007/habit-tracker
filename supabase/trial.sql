-- Trial per phone: reinstalling the app can't restart the free trial.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again.
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
