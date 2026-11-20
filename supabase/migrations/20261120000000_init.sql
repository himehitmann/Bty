create table public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint user_workspaces_state_shape check (
    jsonb_typeof(state) = 'object'
    and state ?& array['products', 'routines', 'palette', 'preferences', 'completed']
    and jsonb_typeof(state -> 'products') = 'array'
    and jsonb_typeof(state -> 'routines') = 'array'
    and jsonb_typeof(state -> 'palette') = 'array'
    and jsonb_typeof(state -> 'preferences') = 'object'
    and jsonb_typeof(state -> 'completed') = 'array'
  ),
  constraint user_workspaces_state_size check (octet_length(state::text) <= 524288)
);

create function public.touch_user_workspace() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

create trigger user_workspaces_touch
  before update on public.user_workspaces
  for each row execute function public.touch_user_workspace();

alter table public.user_workspaces enable row level security;
revoke all on public.user_workspaces from anon, authenticated;
grant select, insert, update on public.user_workspaces to authenticated;

create policy "Members can read their workspace" on public.user_workspaces
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Members can create their workspace" on public.user_workspaces
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Members can update their workspace" on public.user_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('palette-photos', 'palette-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Members can upload their palette photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'palette-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members can read their palette photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'palette-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members can delete their palette photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'palette-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
