-- Initial schema for Vidads: products, scripts, videos

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'script_status') then
    create type script_status as enum ('draft', 'approved', 'rendering', 'ready', 'failed');
  end if;
end
$$;

create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  angle text not null,
  hook_text text not null,
  full_script text not null,
  status script_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references scripts(id) on delete cascade,
  video_url text not null,
  provider text not null,
  created_at timestamptz not null default now()
);

insert into products (name, description)
values ('freecash', 'GPT rewards app, users earn cash for completing offers/surveys')
on conflict do nothing;
