-- =====================================================================
-- Migración 005: Platas Alex
-- Schema completo + datos iniciales migrados desde SQLite local.
-- =====================================================================

-- 1) Tabla de configuración (singleton)
create table if not exists public.alex_config (
  id                       text primary key default 'singleton',
  sueldo_base              numeric(12,2) not null default 526.16,
  fondo_reserva            numeric(12,2) not null default 43.84,
  total_mensual            numeric(12,2) not null default 570.00,
  saldo_prestamo_nuestro   numeric(12,2) not null default 0,
  notas                    text,
  updated_at               timestamptz not null default now()
);

-- 2) Conceptos (catálogo de tipos de pago)
create table if not exists public.alex_concepts (
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
create index if not exists alex_concepts_activo_orden_idx on public.alex_concepts(activo desc, orden);

-- 3) Préstamos
create table if not exists public.alex_loans (
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
  created_at      timestamptz not null default now()
);
create index if not exists alex_loans_activo_idx on public.alex_loans(activo);

-- 4) Movimientos
create table if not exists public.alex_movements (
  id           bigserial primary key,
  concepto_id  bigint not null references public.alex_concepts(id) on delete restrict,
  fecha        date not null,
  anio         int not null,
  mes          int not null,
  monto        numeric(12,2) not null,
  cantidad     numeric(12,2),
  nota         text,
  planeado     boolean not null default false,
  es_extra     boolean not null default false,
  prestamo_id  bigint references public.alex_loans(id) on delete set null,
  comprobante  text,
  created_at   timestamptz not null default now()
);
create index if not exists alex_movs_anio_mes_idx on public.alex_movements(anio, mes);
create index if not exists alex_movs_concepto_idx on public.alex_movements(concepto_id);
create index if not exists alex_movs_prestamo_idx on public.alex_movements(prestamo_id);

-- 5) RLS — solo admins (Juan) ven y editan Alex. Ana NO accede.
alter table public.alex_config    enable row level security;
alter table public.alex_concepts  enable row level security;
alter table public.alex_loans     enable row level security;
alter table public.alex_movements enable row level security;

-- Policy helper: comprueba si auth.users.raw_app_meta_data->>'role' = 'admin'
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (select raw_app_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin',
    false
  );
$$;

-- Policies admin-only para todas las tablas Alex
drop policy if exists "alex_config admin all" on public.alex_config;
create policy "alex_config admin all" on public.alex_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "alex_concepts admin all" on public.alex_concepts;
create policy "alex_concepts admin all" on public.alex_concepts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "alex_loans admin all" on public.alex_loans;
create policy "alex_loans admin all" on public.alex_loans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "alex_movements admin all" on public.alex_movements;
create policy "alex_movements admin all" on public.alex_movements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 6) Bucket de Storage para comprobantes Alex (privado)
insert into storage.buckets (id, name, public)
values ('alex-comprobantes', 'alex-comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "alex-comp admin read"   on storage.objects;
drop policy if exists "alex-comp admin write"  on storage.objects;
drop policy if exists "alex-comp admin delete" on storage.objects;

create policy "alex-comp admin read" on storage.objects for select to authenticated
  using (bucket_id = 'alex-comprobantes' and public.is_admin());
create policy "alex-comp admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'alex-comprobantes' and public.is_admin());
create policy "alex-comp admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'alex-comprobantes' and public.is_admin());

-- 7) Singleton de config con valores actuales del SQLite local
insert into public.alex_config (id, sueldo_base, fondo_reserva, total_mensual, saldo_prestamo_nuestro, notas)
values (
  'singleton', 526.16, 43.84, 570.00, 50.00,
  'Préstamo $200 a Alex en marzo 2026, 4 cuotas de $50 (marzo/abril/mayo/junio). Falta junio.'
)
on conflict (id) do nothing;
-- AlexConcepts
insert into public.alex_concepts (legacy_id, nombre, activo, orden, es_fijo, monto_tipo, es_extra_default, notas) values
('c4dbbb7525d574068b0c192a4', 'Quincena', true, 10, true, 300.0, false, null),
('c085afaace6594da2a571aca7', 'Anticipos', true, 20, false, null, false, null),
('cab0c2603b4924a54bc93df51', 'Préstamo IESS', true, 30, false, null, false, null),
('c4fc6a1276f5d4578a15c44cf', 'Fin de mes', true, 40, false, null, false, null),
('c1053c59b57c34e458f2f6ac7', 'Préstamo nuestro', true, 50, true, 50.0, false, null),
('cd1e2f3e96c4e44a7ab9a9758', 'Otros', true, 60, false, null, false, null),
('ccf13a4b45eb342bd93f6b347', 'Décimos', true, 70, false, null, false, null),
('c88c9f3e600d8484abe3e6e32', 'Planilla IESS (patronal)', false, 75, false, null, true, 'Aporte patronal mensual al IESS — adicional al sueldo'),
('c02e9c2d03deb47f1909fdeb3', 'Vacaciones', false, 80, false, null, false, null),
('c439b25b55ccd4705853a2505', 'Pago 22.06 x día', false, 90, true, 22.06, false, null),
('caf1a26c14f67483aafedf062', 'Noches perros $12', false, 100, true, 12.0, true, null),
('c7386be1eccee4e6db400204b', 'Santi 3.5 x hora', false, 110, true, 3.5, true, null),
('cfb73e4dea72244e9a5432e72', 'Santi 6 x hora', false, 120, true, 6.0, true, null),
('cb0d4e075c40843b281ee81eb', 'Préstamo', false, 130, false, null, false, null),
('cad96d7e5a82547a6943e4be5', 'Falta', false, 140, false, null, false, null);

-- AlexPrestamos
insert into public.alex_loans (legacy_id, monto, cuotas, cuota_size, fecha_prestamo, descripcion, saldo_actual, cuotas_cobradas, activo) values
('pf009994aeba7450094825251', 200.0, 4, 50.0, '2026-03-01', 'Préstamo $200 a Alex en marzo 2026, 4 cuotas de $50 (marzo/abril/mayo/junio).', 50.0, 3, true);

-- AlexMovimientos
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4dbbb7525d574068b0c192a4'), '2026-01-15', 2026, 1, 300.0, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cab0c2603b4924a54bc93df51'), '2026-01-30', 2026, 1, 34.66, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4fc6a1276f5d4578a15c44cf'), '2026-01-30', 2026, 1, 235.34, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4dbbb7525d574068b0c192a4'), '2026-02-15', 2026, 2, 300.0, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cab0c2603b4924a54bc93df51'), '2026-02-28', 2026, 2, 34.39, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cd1e2f3e96c4e44a7ab9a9758'), '2026-02-28', 2026, 2, 20.0, null, 'según hoja', false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4fc6a1276f5d4578a15c44cf'), '2026-02-28', 2026, 2, 215.61, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c085afaace6594da2a571aca7'), '2026-03-10', 2026, 3, 20.0, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4dbbb7525d574068b0c192a4'), '2026-03-15', 2026, 3, 300.0, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cab0c2603b4924a54bc93df51'), '2026-03-30', 2026, 3, 33.51, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4fc6a1276f5d4578a15c44cf'), '2026-03-30', 2026, 3, 166.49, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c1053c59b57c34e458f2f6ac7'), '2026-03-30', 2026, 3, 50.0, null, 'Cuota 1/4 (marzo) — préstamo $200 marzo 2026', false, false, (select id from public.alex_loans where legacy_id = 'pf009994aeba7450094825251'), null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4dbbb7525d574068b0c192a4'), '2026-04-15', 2026, 4, 300.0, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cab0c2603b4924a54bc93df51'), '2026-04-30', 2026, 4, 33.54, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c1053c59b57c34e458f2f6ac7'), '2026-04-30', 2026, 4, 50.0, null, 'Cuota 2/4 (abril) — préstamo $200 marzo 2026', false, false, (select id from public.alex_loans where legacy_id = 'pf009994aeba7450094825251'), null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c4fc6a1276f5d4578a15c44cf'), '2026-04-30', 2026, 4, 186.46, null, null, false, false, null, null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cab0c2603b4924a54bc93df51'), '2026-05-05', 2026, 5, 33.27, null, 'planilla de préstamo IESS', false, false, null, 'uploads/alex/cmosvakbt0000vz7sefujoiaq.pdf');
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'cd1e2f3e96c4e44a7ab9a9758'), '2026-05-05', 2026, 5, 47.27, null, 'planilla IESS normal', false, true, null, 'uploads/alex/cmosvbhw40001vz7shawo617i.pdf');
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c1053c59b57c34e458f2f6ac7'), '2026-05-30', 2026, 5, 50.0, null, 'Cuota 3/4 (mayo) — préstamo $200 marzo 2026', false, false, (select id from public.alex_loans where legacy_id = 'pf009994aeba7450094825251'), null);
insert into public.alex_movements (concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante) values ((select id from public.alex_concepts where legacy_id = 'c1053c59b57c34e458f2f6ac7'), '2026-06-30', 2026, 6, 50.0, null, 'Cuota 4/4 (planeada — junio) — préstamo $200 marzo 2026', true, false, (select id from public.alex_loans where legacy_id = 'pf009994aeba7450094825251'), null);
select 'concepts: '||(select count(*) from public.alex_concepts)||', loans: '||(select count(*) from public.alex_loans)||', movs: '||(select count(*) from public.alex_movements) as resultado;
