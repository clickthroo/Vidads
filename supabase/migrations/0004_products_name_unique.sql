-- The original seed insert used "on conflict do nothing" but products.name
-- never had a unique constraint to conflict against, so re-running the seed
-- would silently insert duplicates. Add the constraint so it's actually safe.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_name_key'
  ) then
    alter table products add constraint products_name_key unique (name);
  end if;
end
$$;
