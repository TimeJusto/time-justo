-- ============================================================================
-- Time Justo — contas e dados na nuvem (plano Premium)
-- Aplicado via Enter Cloud. Este arquivo documenta a estrutura executada.
--
-- Regras de acesso:
--   * Perfis: o usuário lê apenas o próprio perfil. Ningém do app altera
--     role, plan, premium_until, trial_days_used ou trial_last_day — esses
--     campos só mudam pelo servidor/trigger.
--   * Dados (players, app_settings, matches):
--       - leitura: apenas as próprias linhas (permite baixar a cópia ao
--         perder o Premium);
--       - escrita (insert/update/delete): próprias linhas E is_cloud_user().
--   * isCloudUser = role 'admin' OU (plan 'premium' E premium_until no futuro).
--     O teste grátis NÃO dá direito à nuvem.
--   * Exclusão de conta: função de backend "delete-account" remove o usuário
--     em auth.users; as FKs ON DELETE CASCADE apagam perfil e dados.
-- ============================================================================

-- 1) PERFIS -----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'free' check (plan in ('free','premium')),
  premium_until timestamptz,
  trial_days_used integer not null default 0,
  trial_last_day date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

grant select on public.profiles to authenticated;

-- 2) isCloudUser ------------------------------------------------------------
create or replace function public.is_cloud_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.plan = 'premium' and p.premium_until is not null and p.premium_until > now())
      )
  );
$$;

revoke all on function public.is_cloud_user() from public;
grant execute on function public.is_cloud_user() to authenticated;

-- 3) Trigger de criação do perfil -------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when lower(coalesce(new.email, '')) = 'timejusto.app@gmail.com' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) JOGADORES -------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position text not null,
  stars integer not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_user_id_idx on public.players (user_id);
alter table public.players enable row level security;

create policy players_select_own on public.players
  for select to authenticated using (auth.uid() = user_id);

create policy players_insert_cloud on public.players
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy players_update_cloud on public.players
  for update to authenticated
  using (auth.uid() = user_id and public.is_cloud_user())
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy players_delete_cloud on public.players
  for delete to authenticated
  using (auth.uid() = user_id and public.is_cloud_user());

grant select, insert, update, delete on public.players to authenticated;

-- 5) CONFIGURAÇÕES ----------------------------------------------------------
create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  current_draw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy app_settings_select_own on public.app_settings
  for select to authenticated using (auth.uid() = user_id);

create policy app_settings_insert_cloud on public.app_settings
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy app_settings_update_cloud on public.app_settings
  for update to authenticated
  using (auth.uid() = user_id and public.is_cloud_user())
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy app_settings_delete_cloud on public.app_settings
  for delete to authenticated
  using (auth.uid() = user_id and public.is_cloud_user());

grant select, insert, update, delete on public.app_settings to authenticated;

-- 6) HISTÓRICO --------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  baba_number integer not null,
  date text not null,
  history_window integer not null default 1,
  teams jsonb not null default '[]'::jsonb,
  repetition_score integer not null default 0,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_user_id_idx on public.matches (user_id);
alter table public.matches enable row level security;

create policy matches_select_own on public.matches
  for select to authenticated using (auth.uid() = user_id);

create policy matches_insert_cloud on public.matches
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy matches_update_cloud on public.matches
  for update to authenticated
  using (auth.uid() = user_id and public.is_cloud_user())
  with check (auth.uid() = user_id and public.is_cloud_user());

create policy matches_delete_cloud on public.matches
  for delete to authenticated
  using (auth.uid() = user_id and public.is_cloud_user());

grant select, insert, update, delete on public.matches to authenticated;

-- 7) ADMIN ------------------------------------------------------------------
-- Executado nesta etapa. Afeta 0 linhas até a conta existir; quando ela for
-- criada, o trigger acima já a cria com role = 'admin'.
update public.profiles
   set role = 'admin'
 where lower(email) = 'timejusto.app@gmail.com';
