-- ============================================================================
-- Time Justo — área administrativa e bonificações
-- Aplicado via Enter Cloud. Este arquivo documenta o que foi executado.
--
-- Regras:
--   * Toda escrita administrativa passa por função RPC SECURITY DEFINER que
--     confere se quem chama é admin (public.is_admin()).
--   * premium_grants registra cada ação (dias, motivo, admin, data) e é
--     visível SOMENTE para admins (policy de SELECT com is_admin()).
--   * Admin é sempre Premium, sem limites e sem validade (via is_cloud_user()).
-- ============================================================================

-- 1) BONIFICAÇÕES -----------------------------------------------------------
create table if not exists public.premium_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dias integer,
  motivo text,
  admin_email text,
  created_at timestamptz not null default now()
);

create index if not exists premium_grants_user_id_idx
  on public.premium_grants (user_id);

alter table public.premium_grants enable row level security;

create policy premium_grants_select_admin on public.premium_grants
  for select to authenticated using (public.is_admin());

grant select on public.premium_grants to authenticated;

-- 2) QUEM É ADMIN -----------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3) PESQUISAR USUÁRIOS -----------------------------------------------------
create or replace function public.admin_list_users(p_search text default null)
returns table (
  id uuid, email text, role text, plan text, premium_until timestamptz,
  trial_days_used integer, trial_last_day date, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.email, p.role, p.plan, p.premium_until,
           p.trial_days_used, p.trial_last_day, p.created_at
    from public.profiles p
    where coalesce(p_search, '') = ''
       or p.email ilike '%' || p_search || '%'
    order by p.created_at desc
    limit 50;
end;
$$;

-- 4) BONIFICAÇÃO MANUAL (dias) ---------------------------------------------
-- Soma os dias à validade atual ou, se não houver, a partir de hoje.
create or replace function public.admin_grant_premium_days(
  p_user_id uuid, p_days integer, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_mail text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_days is null or p_days <= 0 then
    raise exception 'invalid days';
  end if;

  select email into admin_mail from public.profiles where id = auth.uid();

  update public.profiles
     set plan = 'premium',
         premium_until = greatest(coalesce(premium_until, now()), now())
                         + make_interval(days => p_days)
   where id = p_user_id;

  insert into public.premium_grants (user_id, dias, motivo, admin_email)
  values (p_user_id, p_days, nullif(p_reason, ''), admin_mail);
end;
$$;

-- 5) PREMIUM CORTESIA SEM VALIDADE -----------------------------------------
create or replace function public.admin_grant_lifetime(
  p_user_id uuid, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_mail text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select email into admin_mail from public.profiles where id = auth.uid();

  update public.profiles
     set plan = 'premium',
         premium_until = timestamptz '2099-12-31 00:00:00-03'
   where id = p_user_id;

  insert into public.premium_grants (user_id, dias, motivo, admin_email)
  values (p_user_id, null,
          coalesce(nullif(p_reason, ''), 'Premium cortesia sem validade'),
          admin_mail);
end;
$$;

-- 6) VOLTAR PARA GRÁTIS -----------------------------------------------------
create or replace function public.admin_set_free(
  p_user_id uuid, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_mail text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select email into admin_mail from public.profiles where id = auth.uid();

  update public.profiles
     set plan = 'free', premium_until = null
   where id = p_user_id;

  insert into public.premium_grants (user_id, dias, motivo, admin_email)
  values (p_user_id, 0, coalesce(nullif(p_reason, ''), 'Voltar para Grátis'),
          admin_mail);
end;
$$;

-- 7) ZERAR TESTE GRÁTIS ----------------------------------------------------
create or replace function public.admin_reset_trial(
  p_user_id uuid, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_mail text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select email into admin_mail from public.profiles where id = auth.uid();

  update public.profiles
     set trial_days_used = 0, trial_last_day = null
   where id = p_user_id;

  insert into public.premium_grants (user_id, dias, motivo, admin_email)
  values (p_user_id, 0, coalesce(nullif(p_reason, ''), 'Zerar teste'),
          admin_mail);
end;
$$;

-- 8) TORNAR / REMOVER ADMIN ------------------------------------------------
-- Nunca permite remover o último admin.
create or replace function public.admin_set_admin(
  p_user_id uuid, p_make_admin boolean, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_mail text;
  admins integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if not p_make_admin then
    select count(*) into admins from public.profiles where role = 'admin';
    if admins <= 1 then
      raise exception 'last_admin';
    end if;
  end if;

  select email into admin_mail from public.profiles where id = auth.uid();

  update public.profiles
     set role = case when p_make_admin then 'admin' else 'user' end
   where id = p_user_id;

  insert into public.premium_grants (user_id, dias, motivo, admin_email)
  values (
    p_user_id, 0,
    coalesce(nullif(p_reason, ''),
      case when p_make_admin then 'Tornar admin' else 'Remover admin' end),
    admin_mail
  );
end;
$$;

-- 9) PERMISSÕES DAS FUNÇÕES ------------------------------------------------
revoke all on function public.admin_list_users(text) from public;
revoke all on function public.admin_grant_premium_days(uuid, integer, text) from public;
revoke all on function public.admin_grant_lifetime(uuid, text) from public;
revoke all on function public.admin_set_free(uuid, text) from public;
revoke all on function public.admin_reset_trial(uuid, text) from public;
revoke all on function public.admin_set_admin(uuid, boolean, text) from public;

grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.admin_grant_premium_days(uuid, integer, text) to authenticated;
grant execute on function public.admin_grant_lifetime(uuid, text) to authenticated;
grant execute on function public.admin_set_free(uuid, text) to authenticated;
grant execute on function public.admin_reset_trial(uuid, text) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean, text) to authenticated;

-- 10) CONTA ADMINISTRADORA -------------------------------------------------
-- Executado nesta etapa (idempotente).
update public.profiles
   set role = 'admin'
 where lower(email) = 'timejusto.app@gmail.com';
