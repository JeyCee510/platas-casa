-- Migración 004:
-- 1) Agregar parent_id a categories (jerarquía 2 niveles: grupos + subcategorías)
-- 2) Agregar is_deferred a expenses (flag para compras diferidas a cuotas)
-- 3) Reemplazar las 9 categorías default por la estructura del hogar
-- 4) Agregar rol 'limited' a Ana Carolina (acceso restringido)

alter table public.categories
  add column if not exists parent_id bigint references public.categories(id) on delete cascade;

create index if not exists categories_parent_idx on public.categories(parent_id);

-- Orden visual de categorías (campo "orden" para sortear en UI)
alter table public.categories
  add column if not exists ord int not null default 100;

-- Flag de gasto diferido (compras a cuotas en tarjeta)
alter table public.expenses
  add column if not exists is_deferred boolean not null default false;

create index if not exists expenses_deferred_idx on public.expenses(is_deferred)
  where is_deferred = true;

-- Borrar categorías existentes (no hay gastos aún que apunten a ellas)
delete from public.categories;

-- Reset de la secuencia para empezar limpio
alter sequence public.categories_id_seq restart with 1;

-- ===========================================================
-- GRUPOS (parent_id = null)
-- ===========================================================
insert into public.categories (slug, name, emoji, color, ord, parent_id) values
  ('grp-vivienda', 'Vivienda', '🏘️', 'lilac', 10, null),
  ('grp-casa',     'Casa',     '🏠', 'mint',  20, null),
  ('grp-salud',    'Salud',    '💊', 'peach', 30, null),
  ('grp-auto',     'Auto',     '🚗', 'sky',   40, null),
  ('grp-personal', 'Personal', '👤', 'bubble', 50, null);

-- ===========================================================
-- SUBCATEGORÍAS (parent_id apunta al grupo via slug)
-- ===========================================================
-- Vivienda
insert into public.categories (slug, name, emoji, color, ord, parent_id)
select 'alquiler', 'Alquiler', '🏘️', 'lilac', 11, id from public.categories where slug = 'grp-vivienda';

-- Casa
insert into public.categories (slug, name, emoji, color, ord, parent_id)
select v.slug, v.name, v.emoji, 'mint', v.ord, c.id
from (values
  ('supermaxi',    'Supermaxi',    '🛒', 21),
  ('fruteria',     'Frutería',     '🍎', 22),
  ('panaderia',    'Panadería',    '🥖', 23),
  ('tienda',       'Tienda',       '🏪', 24),
  ('vecino-lucho', 'Vecino Lucho', '🛵', 25),
  ('alex',         'Alex',         '👷', 26),
  ('iess-alex',    'IESS Alex',    '📋', 27),
  ('panales',      'Pañales',      '👶', 28),
  ('arreglos',     'Arreglos',     '🔧', 29),
  ('luz',          'Luz',          '💡', 30),
  ('agua',         'Agua',         '💧', 31),
  ('netlife',      'Netlife',      '🌐', 32),
  ('netflix',      'Netflix',      '🎬', 33),
  ('spotify',      'Spotify',      '🎵', 34),
  ('prime',        'Prime',        '📺', 35),
  ('apple',        'Apple',        '🍏', 36)
) as v(slug, name, emoji, ord)
cross join public.categories c
where c.slug = 'grp-casa';

-- Salud
insert into public.categories (slug, name, emoji, color, ord, parent_id)
select v.slug, v.name, v.emoji, 'peach', v.ord, c.id
from (values
  ('seguro-salud-jc', 'Seguro Salud JC + Emi', '⚕️', 40),
  ('seguro-salud-ac', 'Seguro Salud AC + Santi', '⚕️', 41),
  ('iess-jc',         'IESS JC',                 '📋', 42)
) as v(slug, name, emoji, ord)
cross join public.categories c
where c.slug = 'grp-salud';

-- Auto
insert into public.categories (slug, name, emoji, color, ord, parent_id)
select v.slug, v.name, v.emoji, 'sky', v.ord, c.id
from (values
  ('gasolina',     'Gasolina',     '⛽', 50),
  ('mecanica',     'Mecánica',     '🔧', 51),
  ('seguro-auto',  'Seguro Auto',  '🛡️', 52),
  ('legales-auto', 'Legales Auto', '📜', 53)
) as v(slug, name, emoji, ord)
cross join public.categories c
where c.slug = 'grp-auto';

-- Personal
insert into public.categories (slug, name, emoji, color, ord, parent_id)
select 'legales-personal', 'Legales personales', '📜', 'bubble', 60, id
from public.categories where slug = 'grp-personal';

-- ===========================================================
-- ROL: Ana Carolina con acceso restringido
-- ===========================================================
-- raw_app_meta_data lo controla el admin, no el usuario, así que es seguro
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "limited"}'::jsonb
where email = 'anacarobv@gmail.com';

-- Juan = admin (default si no tiene role explícito)
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'jclira@gmail.com';
