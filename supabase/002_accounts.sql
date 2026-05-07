-- =====================================================================
-- Platas Casa — Migración 002: tabla `accounts`
-- Tarjetas de crédito (deuda) + cuentas bancarias (saldo disponible).
-- Pegar en SQL Editor de Supabase y correr una sola vez.
-- =====================================================================

-- Tipo de cuenta
do $$ begin
  create type public.account_type as enum ('credit_card', 'bank_account');
exception when duplicate_object then null; end $$;

-- Tabla accounts
create table if not exists public.accounts (
  id              bigserial primary key,
  type            public.account_type not null,
  name            text not null,
  -- Para credit_card: monto pendiente (deuda actual). Positivo = debes.
  -- Para bank_account: saldo disponible. Positivo = tienes.
  balance         numeric(12,2) not null default 0,
  currency        text not null default 'USD',
  -- Solo aplica a credit_card: fecha de vencimiento del próximo pago.
  due_date        date,
  notes           text,
  -- Auditoría: quién y cuándo lo modificó por última vez.
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists accounts_type_idx on public.accounts(type);

-- Trigger para mantener updated_at
create or replace function public.accounts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.accounts_set_updated_at();

-- RLS — compartido entre miembros del hogar (igual que expenses)
alter table public.accounts enable row level security;

drop policy if exists "accounts select all" on public.accounts;
create policy "accounts select all"
  on public.accounts for select to authenticated using (true);

drop policy if exists "accounts insert any" on public.accounts;
create policy "accounts insert any"
  on public.accounts for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "accounts update any" on public.accounts;
create policy "accounts update any"
  on public.accounts for update to authenticated
  using (true) with check (true);

drop policy if exists "accounts delete any" on public.accounts;
create policy "accounts delete any"
  on public.accounts for delete to authenticated using (true);

-- Seed inicial: las 4 cuentas que ya conocemos
-- (Si el insert falla por created_by NULL, simplemente las creas a mano desde la app)
insert into public.accounts (type, name, balance, due_date, currency)
values
  ('credit_card',  'Diners',    0, null, 'USD'),
  ('credit_card',  'Amex',      0, null, 'USD'),
  ('bank_account', 'Pichincha', 0, null, 'USD'),
  ('bank_account', 'Guayaquil', 0, null, 'USD')
on conflict do nothing;
