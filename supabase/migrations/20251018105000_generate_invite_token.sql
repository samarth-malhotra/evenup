create or replace function generate_invite_token() returns text language plpgsql as $$
declare
  b bytea := gen_random_bytes(32);
begin
  return encode(b, 'base64');
end;
$$;
