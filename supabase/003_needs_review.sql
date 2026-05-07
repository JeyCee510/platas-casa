-- Migración 003: columna needs_review en expenses
-- Para marcar gastos cuyo origen (voz/foto) tiene baja confianza y requieren revisión humana.

alter table public.expenses
  add column if not exists needs_review boolean not null default false;

create index if not exists expenses_review_idx on public.expenses(needs_review)
  where needs_review = true;
