-- The owner may replace the document. The database controls ownership and versions.
revoke all on public.user_workspaces from public, anon, authenticated;
grant select (user_id, state, updated_at), insert (user_id, state), update (state)
  on public.user_workspaces to authenticated;

-- These collections are optional in workspaces created before lists and saved looks.
alter table public.user_workspaces add constraint user_workspaces_optional_array_limits check (
  case
    when not (state ? 'lists') then true
    when jsonb_typeof(state -> 'lists') = 'array' then jsonb_array_length(state -> 'lists') <= 33
    else false
  end
  and case
    when not (state ? 'looks') then true
    when jsonb_typeof(state -> 'looks') = 'array' then jsonb_array_length(state -> 'looks') <= 30
    else false
  end
) not valid;
