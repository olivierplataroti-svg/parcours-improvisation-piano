-- Allow Vocabulaire without changing existing records or owner-only policies.
alter table public.piano_snapshots drop constraint piano_snapshots_app_id_check;
alter table public.piano_snapshots add constraint piano_snapshots_app_id_check check (app_id in ('blues','jazz','bases','ear','vocab'));
