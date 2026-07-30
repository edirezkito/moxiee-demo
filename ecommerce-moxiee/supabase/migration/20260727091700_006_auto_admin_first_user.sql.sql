/*
  # Auto-promote first signup to admin

  On a fresh database (no rows in `profiles` yet), the very first person
  who signs up through the app is automatically given role='admin'.
  Every signup after that gets the normal 'customer' role, same as before.

  This removes the need to manually edit the `profiles` table in the
  Supabase Table Editor just to get store owner access.
*/

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;

  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case when is_first_user then 'admin' else 'customer' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Note: the trigger "on_auth_user_created" created in migration 001 already
-- points to this function by name, so it does not need to be recreated.
