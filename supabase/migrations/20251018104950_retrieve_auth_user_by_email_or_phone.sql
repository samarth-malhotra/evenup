-- Run in Supabase SQL editor (as a DB superuser)
create or replace function public.get_auth_user_by_email_or_phone(
  p_email text,
  p_phone text
)
returns table(id uuid, email text, phone text, raw_user jsonb)
language sql
security definer
as $$
  select u.id, u.email, u.phone, to_jsonb(u.*) as raw_user
  from auth.users u
  where (p_email is not null and u.email = p_email)
     or (p_phone is not null and u.phone = p_phone)
  limit 1;
$$;
-- revoke execute from anon/public if necessary:
revoke execute on function public.get_auth_user_by_email_or_phone(text,text) from public, anon, authenticated;
grant execute on function public.get_auth_user_by_email_or_phone(text,text) to service_role; -- optional, service_role has inherent privileges

