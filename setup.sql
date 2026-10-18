-- PoolBook database setup. Paste into Supabase > SQL Editor > Run.
create table profiles(id uuid primary key references auth.users on delete cascade, email text, active boolean not null default false, created_at timestamptz default now());

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email) values(new.id,new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function is_active() returns boolean language sql security definer stable set search_path=public as $$
select coalesce((select active from profiles where id=auth.uid()),false) $$;

create table customers(
 id bigint generated always as identity primary key,
 owner uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null, phone text, addr text, gate text, day text, rate numeric,
 san text, surf text, gal int, equip text, dog boolean default false, notes text, last date);

create table visits(
 id bigint generated always as identity primary key,
 owner uuid not null default auth.uid() references auth.users on delete cascade,
 customer_id bigint not null references customers on delete cascade,
 d date not null default current_date, fc numeric, ph numeric, ta numeric, chem text, note text);

alter table profiles enable row level security;
alter table customers enable row level security;
alter table visits enable row level security;

create policy "own profile" on profiles for select using (id=auth.uid());
create policy "own customers" on customers for all using (owner=auth.uid() and is_active()) with check (owner=auth.uid() and is_active());
create policy "own visits" on visits for all using (owner=auth.uid() and is_active()) with check (owner=auth.uid() and is_active());
