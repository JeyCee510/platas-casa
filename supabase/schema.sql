-- =====================================================================
-- Platas Casa — Schema inicial Supabase (modelo de hogar compartido)
-- Pegar TODO esto en el SQL Editor de Supabase y correrlo una sola vez.
-- =====================================================================

-- 1) Categorías -------------------------------------------------------
create table if not exists public.categories (
  id          bigserial primary key,
  slug        text unique not null,
  name        text not null,
  emoji       text,
  color       text not null default 'sky',
  created_at  timestamptz not null default now()
);

-- 2) Gastos -----------------------------------------------------------
-- created_by guarda quién registró el gasto (para auditoría),
-- pero TODOS los miembros del hogar pueden ver/editar todos los gastos.
create table if not exists public.expenses (
  id            bigserial primary key,
  created_by    uuid not null references auth.users(id) on delete set null,
  amount        numeric(12,2) not null check (amount >= 0),
  currency      text not null default 'USD',
  description   text,
  category_id   bigint references public.categories(id) on delete set null,
  spent_at      date not null default current_date,
  source        text not null default 'manual', -- 'manual' | 'photo'
  receipt_url   text,
  raw_ocr       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists expenses_date_idx     on public.expenses(spent_at desc);
create index if not exists expenses_category_idx on public.expenses(category_id);
create index if not exists expenses_creator_idx  on public.expenses(created_by);

-- 3) Storage bucket para boletas (privado, compartido entre miembros)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 4) RLS — modelo "hogar": cualquier usuario AUTENTICADO ve y edita todo
-- (la restricción de quién puede entrar al hogar se hace en Supabase Auth:
--  ver el README sección "Cerrar el hogar a solo ustedes dos").
alter table public.expenses   enable row level security;
alter table public.categories enable row level security;

-- Categorías: lectura para todos los autenticados
drop policy if exists "categories read" on public.categories;
create policy "categories read"
  on public.categories for select to authenticated using (true);

-- Expenses: cualquier miembro del hogar ve TODO
drop policy if exists "expenses select all" on public.expenses;
drop policy if exists "expenses select own" on public.expenses;
create policy "expenses select all"
  on public.expenses for select to authenticated using (true);

-- Insertar: cualquier autenticado, pero queda registrado quién lo hizo
drop policy if exists "expenses insert any" on public.expenses;
drop policy if exists "expenses insert own" on public.expenses;
create policy "expenses insert any"
  on public.expenses for insert to authenticated
  with check (auth.uid() = created_by);

-- Editar: cualquier miembro puede corregir cualquier gasto (es plata común)
drop policy if exists "expenses update any" on public.expenses;
drop policy if exists "expenses update own" on public.expenses;
create policy "expenses update any"
  on public.expenses for update to authenticated
  using (true) with check (true);

-- Borrar: cualquier miembro puede borrar
drop policy if exists "expenses delete any" on public.expenses;
drop policy if exists "expenses delete own" on public.expenses;
create policy "expenses delete any"
  on public.expenses for delete to authenticated using (true);

-- Storage: receipts también compartidos entre miembros del hogar
drop policy if exists "receipts read all"   on storage.objects;
drop policy if exists "receipts read own"   on storage.objects;
drop policy if exists "receipts insert any" on storage.objects;
drop policy if exists "receipts insert own" on storage.objects;
drop policy if exists "receipts delete any" on storage.objects;
drop policy if exists "receipts delete own" on storage.objects;

create policy "receipts read all"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts');

create policy "receipts insert any"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts');

create policy "receipts delete any"
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipts');

-- 5) Seed de categorías ------------------------------------------------
insert into public.categories (slug, name, emoji, color) values
  ('supermercado', 'Supermercado', '🛒', 'mint'),
  ('servicios',    'Servicios',    '💡', 'lemon'),
  ('transporte',   'Transporte',   '🚗', 'sky'),
  ('salud',        'Salud',        '⚕️', 'peach'),
  ('educacion',    'Educación',    '📚', 'lilac'),
  ('casa',         'Casa',         '🏠', 'bubble'),
  ('restaurante',  'Restaurante',  '🍽️', 'teal'),
  ('ocio',         'Ocio',         '🎉', 'mint'),
  ('otros',        'Otros',        '📦', 'sky')
on conflict (slug) do nothing;

-- 6) Vista de resumen mensual ------------------------------------------
create or replace view public.expenses_monthly as
select
  date_trunc('month', spent_at)::date as month,
  category_id,
  sum(amount)::numeric(12,2) as total,
  count(*)::int as n
from public.expenses
group by 1,2;

grant select on public.expenses_monthly to authenticated;
