create or replace function public.touch_user_workspace() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' and old.updated_at <= new.updated_at + interval '1 day' then
    new.updated_at := greatest(new.updated_at, old.updated_at + interval '1 microsecond');
  end if;
  return new;
end;
$$;

drop trigger user_workspaces_touch on public.user_workspaces;
create trigger user_workspaces_touch
  before insert or update on public.user_workspaces
  for each row execute function public.touch_user_workspace();

update public.user_workspaces
set updated_at = clock_timestamp()
where not isfinite(updated_at) or updated_at > clock_timestamp() + interval '1 day';

alter table public.user_workspaces add constraint user_workspaces_array_limits check (
  case when jsonb_typeof(state -> 'products') = 'array' then jsonb_array_length(state -> 'products') <= 500 else false end
  and case when jsonb_typeof(state -> 'routines') = 'array' then jsonb_array_length(state -> 'routines') <= 100 else false end
  and case when jsonb_typeof(state -> 'palette') = 'array' then jsonb_array_length(state -> 'palette') <= 200 else false end
  and case when jsonb_typeof(state -> 'completed') = 'array' then jsonb_array_length(state -> 'completed') <= 1000 else false end
) not valid;

alter policy "Members can upload their palette photos" on storage.objects
  with check (
    bucket_id = 'palette-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
