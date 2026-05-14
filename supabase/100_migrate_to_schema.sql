-- =====================================================================
-- Platas Casa — Migración consolidada al schema `platas_casa`
-- =====================================================================
-- Este script recrea TODO el esquema de Platas Casa dentro de un schema
-- dedicado llamado `platas_casa`, para poder convivir con otras apps en
-- el mismo proyecto Supabase compartido.
--
-- IDEMPOTENTE: usa `create ... if not exists` y `create or replace`.
-- Se puede correr varias veces sin errores.
--
-- ORDEN:
--   1. Schema + grants
--   2. Enums
--   3. Tablas (categories, accounts, expenses, incomes, transfers, alex_*)
--   4. Índices
--   5. FKs cruzadas (alex_movements.expense_id, alex_loans.expense_id)
--   6. RLS + policies
--   7. Funciones de trigger (balance) + triggers
--   8. RPCs (set_user_role, list_users_with_roles) — prefijo pc_ para
--      evitar colisiones con otros tenants del proyecto compartido.
--
-- FUERA DE ALCANCE (manejar por separado):
--   - Triggers sobre `auth.users` (whitelist email, assign_default_role)
--   - Inserts de datos (categorías, cuentas, conceptos Alex)
--   - Buckets de Storage (`receipts`, `alex-comprobantes`) y sus policies
-- =====================================================================


-- =====================================================================
-- 1. SCHEMA + GRANTS
-- =====================================================================
create schema if not exists platas_casa;

grant usage on schema platas_casa to authenticated;
grant all on all tables    in schema platas_casa to authenticated;
grant all on all sequences in schema platas_casa to authenticated;
grant all on all functions in schema platas_casa to authenticated;

-- Privilegios por defecto para objetos futuros en este schema
alter default privileges in schema platas_casa
  grant all on tables to authenticated;
alter default privileges in schema platas_casa
  grant all on sequences to authenticated;
alter default privileges in schema platas_casa
  grant all on functions to authenticated;


-- =====================================================================
-- 2. ENUMS
-- =====================================================================
do $$ begin
  create type platas_casa.account_type as enum ('credit_card', 'bank_account');
exception when duplicate_object then null; end $$;

do $$ begin
  create type platas_casa.income_source as enum ('aporte_ac', 'aporte_jc', 'intereses', 'otros');
exception when duplicate_object then null; end $$;


-- =====================================================================
-- 3. TABLAS
-- =====================================================================

-- ---------- 3.1 Categorías (jerarquía 2 niveles) ----------
create table if not exists platas_casa.categories (
  id          bigserial primary key,
  slug        text unique not null,
  name        text not null,
  emoji       text,
  color       text not null default 'sky',
  parent_id   bigint references platas_casa.categories(id) on delete cascade,
  ord         int not null default 100,
  created_at  timestamptz not null default now()
);

-- ---------- 3.2 Cuentas (bancos + tarjetas de crédito) ----------
create table if not exists platas_casa.accounts (
  id           bigserial primary key,
  type         platas_casa.account_type not null,
  name         text not null,
  -- credit_card: balance > 0 = deuda actual
  -- bank_account: balance > 0 = saldo disponible
  balance      numeric(12,2) not null default 0,
  currency     text not null default 'USD',
  due_date     date,  -- solo aplica a credit_card
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  updated_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- 3.3 Gastos ----------
-- source: 'manual' | 'photo' | 'voice' | 'alex' | 'transfer'
-- (transfer = espejo visual de pago de tarjeta, no afecta balance porque
--  account_id queda NULL en ese caso particular)
create table if not exists platas_casa.expenses (
  id              bigserial primary key,
  created_by      uuid not null references auth.users(id) on delete set null,
  amount          numeric(12,2) not null check (amount >= 0),
  currency        text not null default 'USD',
  description     text,
  category_id     bigint references platas_casa.categories(id) on delete set null,
  account_id      bigint references platas_casa.accounts(id)   on delete set null,
  bank_commission numeric(12,2) not null default 0,
  spent_at        date not null default current_date,
  source          text not null default 'manual',
  receipt_url     text,
  raw_ocr         jsonb,
  needs_review    boolean not null default false,
  is_deferred     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------- 3.4 Ingresos ----------
create table if not exists platas_casa.incomes (
  id           bigserial primary key,
  created_by   uuid not null references auth.users(id) on delete set null,
  source       platas_casa.income_source not null,
  amount       numeric(12,2) not null check (amount >= 0),
  currency     text not null default 'USD',
  description  text,
  account_id   bigint references platas_casa.accounts(id) on delete set null,
  received_at  date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ---------- 3.5 Transferencias entre cuentas (incluye pago de tarjetas) ----------
-- No cuenta como gasto. Trigger ajusta balances:
--   - from (bank): -amount
--   - to (bank): +amount
--   - to (credit_card): balance -= amount  (deuda baja al pagar tarjeta)
create table if not exists platas_casa.transfers (
  id               bigserial primary key,
  created_by       uuid not null references auth.users(id) on delete set null,
  from_account_id  bigint not null references platas_casa.accounts(id) on delete restrict,
  to_account_id    bigint not null references platas_casa.accounts(id) on delete restrict,
  amount           numeric(12,2) not null check (amount > 0),
  description      text,
  transferred_at   date not null default current_date,
  created_at       timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

-- ---------- 3.6 Platas Alex — Config (singleton) ----------
create table if not exists platas_casa.alex_config (
  id                       text primary key default 'singleton',
  sueldo_base              numeric(12,2) not null default 526.16,
  fondo_reserva            numeric(12,2) not null default 43.84,
  total_mensual            numeric(12,2) not null default 570.00,
  saldo_prestamo_nuestro   numeric(12,2) not null default 0,
  notas                    text,
  updated_at               timestamptz not null default now()
);

-- ---------- 3.7 Platas Alex — Conceptos ----------
create table if not exists platas_casa.alex_concepts (
  id                bigserial primary key,
  legacy_id         text unique,
  nombre            text not null unique,
  activo            boolean not null default true,
  orden             int not null default 0,
  es_fijo           boolean not null default false,
  monto_tipo        numeric(12,2),
  es_extra_default  boolean not null default false,
  notas             text,
  created_at        timestamptz not null default now()
);

-- ---------- 3.8 Platas Alex — Préstamos ----------
-- expense_id: link al gasto espejo en general (set null on delete del gasto)
create table if not exists platas_casa.alex_loans (
  id              bigserial primary key,
  legacy_id       text unique,
  monto           numeric(12,2) not null,
  cuotas          int not null,
  cuota_size      numeric(12,2) not null,
  fecha_prestamo  date not null,
  descripcion     text,
  saldo_actual    numeric(12,2) not null,
  cuotas_cobradas int not null default 0,
  activo          boolean not null default true,
  expense_id      bigint references platas_casa.expenses(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ---------- 3.9 Platas Alex — Movimientos ----------
-- expense_id: link al gasto espejo en general (sólo para no-planeados / no-cuotas)
create table if not exists platas_casa.alex_movements (
  id           bigserial primary key,
  concepto_id  bigint not null references platas_casa.alex_concepts(id) on delete restrict,
  fecha        date not null,
  anio         int not null,
  mes          int not null,
  monto        numeric(12,2) not null,
  cantidad     numeric(12,2),
  nota         text,
  planeado     boolean not null default false,
  es_extra     boolean not null default false,
  prestamo_id  bigint references platas_casa.alex_loans(id) on delete set null,
  comprobante  text,
  expense_id   bigint references platas_casa.expenses(id) on delete set null,
  created_at   timestamptz not null default now()
);


-- =====================================================================
-- 4. ÍNDICES
-- =====================================================================
create index if not exists categories_parent_idx on platas_casa.categories(parent_id);

create index if not exists accounts_type_idx     on platas_casa.accounts(type);

create index if not exists expenses_date_idx     on platas_casa.expenses(spent_at desc);
create index if not exists expenses_category_idx on platas_casa.expenses(category_id);
create index if not exists expenses_account_idx  on platas_casa.expenses(account_id);
create index if not exists expenses_creator_idx  on platas_casa.expenses(created_by);
create index if not exists expenses_review_idx   on platas_casa.expenses(needs_review) where needs_review = true;
create index if not exists expenses_deferred_idx on platas_casa.expenses(is_deferred)  where is_deferred  = true;

create index if not exists incomes_date_idx      on platas_casa.incomes(received_at desc);
create index if not exists incomes_account_idx   on platas_casa.incomes(account_id);
create index if not exists incomes_source_idx    on platas_casa.incomes(source);

create index if not exists transfers_date_idx    on platas_casa.transfers(transferred_at desc);
create index if not exists transfers_from_idx    on platas_casa.transfers(from_account_id);
create index if not exists transfers_to_idx      on platas_casa.transfers(to_account_id);

create index if not exists alex_concepts_activo_orden_idx on platas_casa.alex_concepts(activo desc, orden);
create index if not exists alex_loans_activo_idx          on platas_casa.alex_loans(activo);
create index if not exists alex_movs_anio_mes_idx         on platas_casa.alex_movements(anio, mes);
create index if not exists alex_movs_concepto_idx         on platas_casa.alex_movements(concepto_id);
create index if not exists alex_movs_prestamo_idx         on platas_casa.alex_movements(prestamo_id);
create index if not exists alex_movs_expense_idx          on platas_casa.alex_movements(expense_id);
create index if not exists alex_loans_expense_idx         on platas_casa.alex_loans(expense_id);


-- =====================================================================
-- 5. VISTAS
-- =====================================================================
create or replace view platas_casa.expenses_monthly as
select
  date_trunc('month', spent_at)::date as month,
  category_id,
  sum(amount)::numeric(12,2) as total,
  count(*)::int as n
from platas_casa.expenses
group by 1, 2;

grant select on platas_casa.expenses_monthly to authenticated;


-- =====================================================================
-- 6. RLS — Habilitar y crear políticas
-- =====================================================================
-- Modelo "hogar": cualquier autenticado ve y edita todo en las tablas
-- compartidas (categories/expenses/accounts/incomes/transfers).
-- Las tablas Alex (alex_*) son admin-only via función is_admin().

alter table platas_casa.categories     enable row level security;
alter table platas_casa.accounts       enable row level security;
alter table platas_casa.expenses       enable row level security;
alter table platas_casa.incomes        enable row level security;
alter table platas_casa.transfers      enable row level security;
alter table platas_casa.alex_config    enable row level security;
alter table platas_casa.alex_concepts  enable row level security;
alter table platas_casa.alex_loans     enable row level security;
alter table platas_casa.alex_movements enable row level security;

-- ---------- 6.1 Helper is_admin() ----------
-- Lee auth.users.raw_app_meta_data->>'role'. SECURITY DEFINER porque
-- los usuarios autenticados no leen auth.users directo.
create or replace function platas_casa.is_admin()
returns boolean
language sql
stable
security definer
set search_path = platas_casa, auth, public
as $$
  select coalesce(
    (select raw_app_meta_data->>'role'
       from auth.users
      where id = auth.uid()) = 'admin',
    false
  );
$$;

grant execute on function platas_casa.is_admin() to authenticated;

-- ---------- 6.2 categories ----------
drop policy if exists "categories read all"   on platas_casa.categories;
drop policy if exists "categories write all"  on platas_casa.categories;
create policy "categories read all"
  on platas_casa.categories for select to authenticated using (true);
create policy "categories write all"
  on platas_casa.categories for all to authenticated
  using (true) with check (true);

-- ---------- 6.3 accounts ----------
drop policy if exists "accounts select all" on platas_casa.accounts;
drop policy if exists "accounts insert any" on platas_casa.accounts;
drop policy if exists "accounts update any" on platas_casa.accounts;
drop policy if exists "accounts delete any" on platas_casa.accounts;

create policy "accounts select all"
  on platas_casa.accounts for select to authenticated using (true);
create policy "accounts insert any"
  on platas_casa.accounts for insert to authenticated
  with check (auth.uid() = created_by);
create policy "accounts update any"
  on platas_casa.accounts for update to authenticated
  using (true) with check (true);
create policy "accounts delete any"
  on platas_casa.accounts for delete to authenticated using (true);

-- ---------- 6.4 expenses ----------
drop policy if exists "expenses select all" on platas_casa.expenses;
drop policy if exists "expenses insert any" on platas_casa.expenses;
drop policy if exists "expenses update any" on platas_casa.expenses;
drop policy if exists "expenses delete any" on platas_casa.expenses;

create policy "expenses select all"
  on platas_casa.expenses for select to authenticated using (true);
create policy "expenses insert any"
  on platas_casa.expenses for insert to authenticated
  with check (auth.uid() = created_by);
create policy "expenses update any"
  on platas_casa.expenses for update to authenticated
  using (true) with check (true);
create policy "expenses delete any"
  on platas_casa.expenses for delete to authenticated using (true);

-- ---------- 6.5 incomes ----------
drop policy if exists "incomes select all" on platas_casa.incomes;
drop policy if exists "incomes insert any" on platas_casa.incomes;
drop policy if exists "incomes update any" on platas_casa.incomes;
drop policy if exists "incomes delete any" on platas_casa.incomes;

create policy "incomes select all"
  on platas_casa.incomes for select to authenticated using (true);
create policy "incomes insert any"
  on platas_casa.incomes for insert to authenticated
  with check (auth.uid() = created_by);
create policy "incomes update any"
  on platas_casa.incomes for update to authenticated
  using (true) with check (true);
create policy "incomes delete any"
  on platas_casa.incomes for delete to authenticated using (true);

-- ---------- 6.6 transfers ----------
drop policy if exists "transfers select all" on platas_casa.transfers;
drop policy if exists "transfers insert any" on platas_casa.transfers;
drop policy if exists "transfers update any" on platas_casa.transfers;
drop policy if exists "transfers delete any" on platas_casa.transfers;

create policy "transfers select all"
  on platas_casa.transfers for select to authenticated using (true);
create policy "transfers insert any"
  on platas_casa.transfers for insert to authenticated
  with check (auth.uid() = created_by);
create policy "transfers update any"
  on platas_casa.transfers for update to authenticated
  using (true) with check (true);
create policy "transfers delete any"
  on platas_casa.transfers for delete to authenticated using (true);

-- ---------- 6.7 alex_* (admin-only) ----------
drop policy if exists "alex_config admin all"    on platas_casa.alex_config;
drop policy if exists "alex_concepts admin all"  on platas_casa.alex_concepts;
drop policy if exists "alex_loans admin all"     on platas_casa.alex_loans;
drop policy if exists "alex_movements admin all" on platas_casa.alex_movements;

create policy "alex_config admin all"
  on platas_casa.alex_config for all to authenticated
  using (platas_casa.is_admin()) with check (platas_casa.is_admin());
create policy "alex_concepts admin all"
  on platas_casa.alex_concepts for all to authenticated
  using (platas_casa.is_admin()) with check (platas_casa.is_admin());
create policy "alex_loans admin all"
  on platas_casa.alex_loans for all to authenticated
  using (platas_casa.is_admin()) with check (platas_casa.is_admin());
create policy "alex_movements admin all"
  on platas_casa.alex_movements for all to authenticated
  using (platas_casa.is_admin()) with check (platas_casa.is_admin());


-- =====================================================================
-- 7. TRIGGER FUNCTIONS
-- =====================================================================

-- ---------- 7.1 accounts.updated_at ----------
create or replace function platas_casa.accounts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists accounts_set_updated_at on platas_casa.accounts;
create trigger accounts_set_updated_at
  before update on platas_casa.accounts
  for each row execute function platas_casa.accounts_set_updated_at();


-- ---------- 7.2 Helper: aplicar delta a balance de una cuenta ----------
-- Devuelve void. Si account_id es null, no hace nada (gasto sin cuenta o
-- espejo visual de pago de tarjeta).
-- delta > 0 = aumenta balance ; delta < 0 = disminuye balance.
create or replace function platas_casa._apply_balance_delta(
  p_account_id bigint,
  p_delta      numeric
)
returns void
language plpgsql
as $$
begin
  if p_account_id is null or p_delta = 0 then
    return;
  end if;
  update platas_casa.accounts
     set balance = balance + p_delta
   where id = p_account_id;
end $$;


-- ---------- 7.3 expenses_balance_trg ----------
-- Para bank_account: gasto resta del saldo (amount + bank_commission).
-- Para credit_card: gasto suma a la deuda (amount + bank_commission).
-- En UPDATE: reversa el efecto antiguo y aplica el nuevo.
create or replace function platas_casa.expenses_adjust_balance()
returns trigger
language plpgsql
as $$
declare
  v_old_type platas_casa.account_type;
  v_new_type platas_casa.account_type;
  v_old_delta numeric := 0;
  v_new_delta numeric := 0;
begin
  -- Reversar efecto OLD si existía cuenta
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') and old.account_id is not null then
    select type into v_old_type from platas_casa.accounts where id = old.account_id;
    if v_old_type = 'bank_account' then
      v_old_delta := (old.amount + coalesce(old.bank_commission, 0));    -- antes restó, ahora sumar
    elsif v_old_type = 'credit_card' then
      v_old_delta := -(old.amount + coalesce(old.bank_commission, 0));   -- antes sumó deuda, ahora restar
    end if;
    perform platas_casa._apply_balance_delta(old.account_id, v_old_delta);
  end if;

  -- Aplicar efecto NEW si hay cuenta
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.account_id is not null then
    select type into v_new_type from platas_casa.accounts where id = new.account_id;
    if v_new_type = 'bank_account' then
      v_new_delta := -(new.amount + coalesce(new.bank_commission, 0));   -- gasto baja saldo
    elsif v_new_type = 'credit_card' then
      v_new_delta := (new.amount + coalesce(new.bank_commission, 0));    -- gasto sube deuda
    end if;
    perform platas_casa._apply_balance_delta(new.account_id, v_new_delta);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists expenses_balance_trg on platas_casa.expenses;
create trigger expenses_balance_trg
  after insert or update or delete on platas_casa.expenses
  for each row execute function platas_casa.expenses_adjust_balance();


-- ---------- 7.4 incomes_balance_trg ----------
-- Para bank_account: ingreso suma al saldo.
-- Para credit_card: NO se permite asociar (los ingresos no van a tarjeta).
--   Si igual llega un income con account credit_card, se ignora el ajuste.
create or replace function platas_casa.incomes_adjust_balance()
returns trigger
language plpgsql
as $$
declare
  v_old_type platas_casa.account_type;
  v_new_type platas_casa.account_type;
begin
  -- Reversar OLD
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') and old.account_id is not null then
    select type into v_old_type from platas_casa.accounts where id = old.account_id;
    if v_old_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(old.account_id, -old.amount);
    end if;
  end if;

  -- Aplicar NEW
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.account_id is not null then
    select type into v_new_type from platas_casa.accounts where id = new.account_id;
    if v_new_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(new.account_id, new.amount);
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists incomes_balance_trg on platas_casa.incomes;
create trigger incomes_balance_trg
  after insert or update or delete on platas_casa.incomes
  for each row execute function platas_casa.incomes_adjust_balance();


-- ---------- 7.5 transfers_balance_trg ----------
-- - from (bank_account): -amount   (siempre, no se transfiere desde tarjeta)
-- - to   (bank_account): +amount
-- - to   (credit_card):  -amount   (es un PAGO de tarjeta, deuda baja)
create or replace function platas_casa.transfers_adjust_balance()
returns trigger
language plpgsql
as $$
declare
  v_from_type platas_casa.account_type;
  v_to_type   platas_casa.account_type;
begin
  -- Reversar OLD
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    select type into v_from_type from platas_casa.accounts where id = old.from_account_id;
    select type into v_to_type   from platas_casa.accounts where id = old.to_account_id;

    if v_from_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(old.from_account_id, old.amount);  -- devolver
    elsif v_from_type = 'credit_card' then
      -- caso raro: salida de tarjeta = la deuda había subido, ahora baja
      perform platas_casa._apply_balance_delta(old.from_account_id, -old.amount);
    end if;

    if v_to_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(old.to_account_id, -old.amount);   -- quitar
    elsif v_to_type = 'credit_card' then
      perform platas_casa._apply_balance_delta(old.to_account_id, old.amount);    -- deuda vuelve a subir
    end if;
  end if;

  -- Aplicar NEW
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    select type into v_from_type from platas_casa.accounts where id = new.from_account_id;
    select type into v_to_type   from platas_casa.accounts where id = new.to_account_id;

    if v_from_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(new.from_account_id, -new.amount);
    elsif v_from_type = 'credit_card' then
      -- salida desde tarjeta (raro): deuda sube
      perform platas_casa._apply_balance_delta(new.from_account_id, new.amount);
    end if;

    if v_to_type = 'bank_account' then
      perform platas_casa._apply_balance_delta(new.to_account_id, new.amount);
    elsif v_to_type = 'credit_card' then
      -- PAGO DE TARJETA: deuda baja
      perform platas_casa._apply_balance_delta(new.to_account_id, -new.amount);
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists transfers_balance_trg on platas_casa.transfers;
create trigger transfers_balance_trg
  after insert or update or delete on platas_casa.transfers
  for each row execute function platas_casa.transfers_adjust_balance();


-- =====================================================================
-- 8. RPCs (operan sobre auth.users que es compartida)
-- =====================================================================
-- NOTA DE NOMBRADO:
--   En la app, las llamadas son `supabase.rpc('set_user_role', ...)` y
--   `supabase.rpc('list_users_with_roles')`. En un proyecto Supabase
--   compartido (multi-tenant) podría haber colisión de nombres en el
--   schema `public`.
--
--   DECISIÓN: Crear estas funciones con prefijo `pc_` en `platas_casa`,
--   pero TAMBIÉN exponerlas vía `public` con el nombre original como
--   wrappers (security invoker) para que la app siga funcionando sin
--   tocar el código. Si en el futuro otra app define funciones con esos
--   nombres en `public`, basta con renombrar el wrapper o forzar el
--   prefijo `platas_casa.pc_` en el código de la app (Supabase JS permite
--   `supabase.schema('platas_casa').rpc('pc_set_user_role', ...)`).

-- ---------- 8.1 pc_set_user_role ----------
create or replace function platas_casa.pc_set_user_role(
  target_email text,
  new_role     text
)
returns void
language plpgsql
security definer
set search_path = platas_casa, auth, public
as $$
declare
  v_caller_role text;
begin
  -- Sólo admins de Platas Casa pueden cambiar roles.
  if not platas_casa.is_admin() then
    raise exception 'Solo admins pueden cambiar roles';
  end if;

  if new_role not in ('admin', 'full', 'limited', 'readonly') then
    raise exception 'Rol inválido: %', new_role;
  end if;

  update auth.users
     set raw_app_meta_data =
           coalesce(raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('role', new_role)
   where email = target_email;
end $$;

grant execute on function platas_casa.pc_set_user_role(text, text) to authenticated;

-- ---------- 8.2 pc_list_users_with_roles ----------
create or replace function platas_casa.pc_list_users_with_roles()
returns table (
  email text,
  name  text,
  role  text
)
language plpgsql
security definer
set search_path = platas_casa, auth, public
as $$
begin
  -- Sólo admins ven el roster completo.
  if not platas_casa.is_admin() then
    raise exception 'Solo admins pueden listar usuarios';
  end if;

  return query
  select
    u.email::text as email,
    coalesce(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )::text as name,
    coalesce(u.raw_app_meta_data->>'role', 'admin')::text as role
  from auth.users u
  order by u.email;
end $$;

grant execute on function platas_casa.pc_list_users_with_roles() to authenticated;

-- ---------- 8.3 Wrappers en `public` para compatibilidad con la app ----------
-- Permite que `supabase.rpc('set_user_role', ...)` siga funcionando sin
-- cambiar el frontend. Si otra app del proyecto compartido ya define
-- estos nombres en `public`, comentar este bloque y migrar el código de
-- la app a `supabase.schema('platas_casa').rpc('pc_set_user_role', ...)`.

create or replace function public.set_user_role(
  target_email text,
  new_role     text
)
returns void
language sql
security invoker
as $$
  select platas_casa.pc_set_user_role(target_email, new_role);
$$;

grant execute on function public.set_user_role(text, text) to authenticated;

create or replace function public.list_users_with_roles()
returns table (
  email text,
  name  text,
  role  text
)
language sql
security invoker
as $$
  select * from platas_casa.pc_list_users_with_roles();
$$;

grant execute on function public.list_users_with_roles() to authenticated;


-- =====================================================================
-- FIN — Verificación rápida
-- =====================================================================
-- Si todo corrió sin errores, deberías ver 9 tablas:
--   select table_name from information_schema.tables
--    where table_schema = 'platas_casa' order by table_name;
--
-- Y 3 triggers de balance:
--   select trigger_name, event_object_table from information_schema.triggers
--    where trigger_schema = 'platas_casa' order by 2, 1;
-- =====================================================================
