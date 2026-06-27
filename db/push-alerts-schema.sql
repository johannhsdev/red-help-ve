-- Web Push subscriptions for seismic alerts.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  alarm_threshold numeric not null default 4 check (alarm_threshold >= 4),
  enabled boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.earthquake_alert_events (
  event_id text primary key,
  magnitude numeric not null,
  place text not null,
  event_time timestamptz not null,
  sent_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.earthquake_alert_events enable row level security;

drop policy if exists "Service role manages push subscriptions" on public.push_subscriptions;
create policy "Service role manages push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages earthquake alert events" on public.earthquake_alert_events;
create policy "Service role manages earthquake alert events"
  on public.earthquake_alert_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
