-- Run this entire file in: supabase.com → your project → SQL Editor → New Query

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text default 'inactive',
  trial_end timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create table public.analyses (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;

create policy "Users view own profile"    on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Users view own analyses"   on public.analyses for select using (auth.uid() = user_id);
create policy "Service role all profiles" on public.profiles for all to service_role using (true) with check (true);
create policy "Service role all analyses" on public.analyses for all to service_role using (true) with check (true);
