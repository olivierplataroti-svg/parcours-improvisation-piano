-- Private snapshots from each installed piano application.
-- The browser only uses a publishable key; authentication and RLS protect rows.
create table public.piano_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check (app_id in ('blues','jazz','bases','ear')),
  device_id uuid not null,
  client_revision bigint not null check (client_revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  record_clocks jsonb not null default '{}'::jsonb check (jsonb_typeof(record_clocks) = 'object'),
  tombstones jsonb not null default '{}'::jsonb check (jsonb_typeof(tombstones) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id, device_id),
  constraint piano_payload_size check (octet_length(payload::text) <= 8388608)
);
alter table public.piano_snapshots enable row level security;
revoke all on public.piano_snapshots from anon, authenticated;
grant select, insert, update on public.piano_snapshots to authenticated;
create policy piano_select_own on public.piano_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy piano_insert_own on public.piano_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy piano_update_own on public.piano_snapshots for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- SECURITY INVOKER preserves the policies above. A late retry cannot replace a
-- more recent snapshot from this installation.
create function public.piano_publish_snapshot(
  p_app text, p_device uuid, p_revision bigint, p_payload jsonb,
  p_record_clocks jsonb default '{}'::jsonb, p_tombstones jsonb default '{}'::jsonb
) returns table (client_revision bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.piano_snapshots as current_snapshot
    (user_id,app_id,device_id,client_revision,payload,record_clocks,tombstones,updated_at)
  values (auth.uid(),p_app,p_device,p_revision,p_payload,p_record_clocks,p_tombstones,now())
  on conflict (user_id,app_id,device_id) do update set
    client_revision=excluded.client_revision,payload=excluded.payload,
    record_clocks=excluded.record_clocks,tombstones=excluded.tombstones,updated_at=now()
  where excluded.client_revision > current_snapshot.client_revision;
  return query select s.client_revision,s.updated_at from public.piano_snapshots s
    where s.user_id=auth.uid() and s.app_id=p_app and s.device_id=p_device;
end;
$$;
revoke all on function public.piano_publish_snapshot(text,uuid,bigint,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.piano_publish_snapshot(text,uuid,bigint,jsonb,jsonb,jsonb) to authenticated;
