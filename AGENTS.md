# AGENTS.md — Platas Casa

App familiar de gastos/ingresos. Este archivo es el contexto canónico para agentes IA. Léelo al inicio de cada sesión.

## Stack
- **Frontend/backend**: Next.js 14.2.35 (App Router) + TypeScript + Tailwind 3.4 (estilo neobrutalista)
- **DB + auth + storage**: Supabase (proyecto `xvyoujqdxasxaviyiodt`, región sa-east-1)
- **Hosting**: Vercel Hobby (proyecto `platas-casa`, dominio `platas-casa.vercel.app`)
- **Repo**: github.com/JeyCee510/platas-casa
- **IA**: Claude Haiku 4.5 (vision para boletas, OTP voz, parse-voice)

## Comandos
```bash
npm install
npm run dev      # local en :3000
npm run build    # next build
npm run lint     # next lint (regla react/no-unescaped-entities desactivada en .eslintrc.json)
git push         # Vercel auto-deploya main
```

## Env vars (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## Usuarios y roles
- `jclira@gmail.com` — **admin** (Juan Cristóbal). Único que puede cambiar permisos.
- `anacarobv@gmail.com` — **limited** por default (Ana Carolina).
- Roles: `admin` | `full` | `limited` | `readonly`. Definidos en `lib/role.ts` y guardados en `auth.users.raw_app_meta_data.role`.
- Sign-up público está OFF. Solo Juan agrega usuarios manualmente desde Supabase Dashboard.
- Login: **OTP de 6-8 dígitos** (no magic link). Template en Supabase Auth → Email Templates → Magic Link usa `{{ .Token }}`.

## Modelo de datos (Postgres / Supabase)
RLS abierto a `authenticated` (modelo de hogar compartido) excepto donde se indica.

| Tabla | Notas |
|---|---|
| `categories` | Jerarquía 2 niveles (`parent_id` = grupo). 11 grupos · ~70 subcategorías. Ver migración 009. |
| `expenses` | `account_id` (default Pichincha), `category_id`, `bank_commission`, `is_deferred`, `needs_review`, `source` (manual/photo/voice). Trigger `expenses_balance_trg` ajusta `accounts.balance`. |
| `incomes` | `source` enum (`aporte_ac`, `aporte_jc`, `intereses`, `otros`). Trigger `incomes_balance_trg`. |
| `transfers` | `from_account_id` → `to_account_id`. Trigger `transfers_balance_trg`. **No cuenta como gasto.** |
| `accounts` | `type` enum (`bank_account`, `credit_card`). Para tarjeta: `balance > 0` = deuda. |
| `alex_*` | Módulo Platas Alex completo (config singleton, conceptos, préstamos con cuotas, movimientos). |

**Triggers de balance**: insertar/editar/borrar expense/income/transfer ajusta `accounts.balance` automático. NO escribir balance manual desde código (el user puede en `/cuentas` para corregir).

**Storage buckets**:
- `receipts` — fotos de boletas (privado, por user)
- `alex-comprobantes` — comprobantes Alex (privado, hogar compartido)

## Convenciones
- **Idioma**: UI en español, código en inglés. Comentarios en español si ayuda.
- **Estilo**: neobrutalismo. Bordes negros 3px (`border-3 border-ink`), sombras hard 6×6 (`shadow-brut`/`shadow-brutSm`), paleta pastel (`mint`, `sky`, `peach`, `lemon`, `lilac`, `bubble`, `teal`).
- **Mobile-first**: max-width 2xl. Bottom tab bar fija (`BottomNav`). Sticky save buttons.
- **Server components por default**. Marcar `'use client'` solo donde haya estado/eventos.
- **Server actions** en archivos `lib/*.ts` con `'use server'`. Si exporta constantes/tipos junto con funciones, separar a `lib/*-shared.ts` (Next requiere que archivos `'use server'` solo exporten funciones async).
- **Roles**: usar helpers de `lib/role.ts` (`isAdmin`, `hasFullView`, `canEdit`). NO hardcodear emails.
- **Migraciones SQL**: archivos numerados en `supabase/00X_*.sql`. Las migraciones 006-011 se ejecutaron directo en Supabase via Monaco editor — quedan documentadas aquí pero no en archivos. Si una migración nueva es destructiva (delete/drop), avisar al user antes.
- **No mockear DB en código**. Probar contra Supabase real.

## Estructura de carpetas
```
app/
  (app)/              rutas autenticadas (middleware redirige a /login)
    page.tsx          home — vista varía por role
    agregar/          form gasto (manual/foto/voz)
    ingresos/         lista + form ingresos
    lista/            historial gastos con filtros y editar
    cuentas/          edición saldos (admin/full/readonly)
    transferir/       pago tarjetas + transfers banco-banco
    alex/             módulo Platas Alex completo
    reporte/          reporte 6 meses
    config/           gestión permisos (admin only)
  api/
    parse-receipt/    OCR boletas (Claude vision)
    parse-voice/      Voz → JSON (Claude Haiku)
    save-expense/     gasto + opcional vínculo Alex
  auth/callback/      fallback OAuth (no se usa con OTP, queda por si)
  login/              OTP 2-pasos (email → código)
components/ui/        Button, Card, Input, Badge, TopBar, BottomNav
lib/
  supabase/           client/server/middleware
  role.ts             helpers de permisos
  format.ts           USD, fechas
  alex.ts             actions Platas Alex
  incomes.ts          actions ingresos (constantes en incomes-shared.ts)
  transfers.ts        actions transferencias
  userName.ts         helper para mostrar nombre de usuario
supabase/             migraciones SQL históricas
```

## Funcionalidades core
1. **Captura rápida de gastos**: foto (Claude vision OCR) · voz (Web Speech + Haiku) · manual.
2. **Gestión de cuentas**: bancos (Pichincha, Guayaquil) + tarjetas (Diners, Amex). Saldos auto-sincronizados.
3. **Categorías jerárquicas**: 11 grupos × ~6 subs cada uno + recientes (top 6).
4. **Vínculo gasto ↔ Platas Alex** (estricto): TODO movimiento en `/alex` (concepto o préstamo entero) crea automáticamente expense espejo en general (cuenta Pichincha, categoría `alex`, source=`alex`). Cuotas de cobro de préstamo NO crean expense (sólo el préstamo entero al darse). Si en `/agregar` seleccionan categoría Alex/IESS Alex, el form se bloquea y se redirige a `/alex`. Vínculos: `alex_movements.expense_id` y `alex_loans.expense_id` (FK a expenses con on delete set null). Borrar movimiento/préstamo borra el expense espejo.
5. **Pago de tarjeta**: flow dedicado en `/transferir` (no cuenta como gasto, baja saldo banco + baja deuda tarjeta).
6. **Comisión bancaria** por gasto (0.31 / 0.41) — ajusta saldo total que sale.
7. **Compartir Alex como imagen PNG** (mes completo o selección con checkboxes) via `html-to-image`.
8. **Permisos por usuario** vía panel `/config` (admin).
9. **Diferidos**: flag `is_deferred` en gastos.
10. **Verificar**: flag `needs_review` para gastos con baja confianza IA.

## Reglas de comportamiento (Juan)
- Antes de empezar tarea no trivial: leer este archivo + preguntar para clarificar.
- Mostrar plan breve antes de actuar.
- Nunca borrar archivos/datos sin autorización explícita.
- Respuestas concisas. Lo indispensable. Sin postambles largos.
- Migraciones destructivas (DELETE/DROP de datos): pedir confirmación.

## Pendientes conocidos
- **OAuth Google** para login (alternativa al OTP). Habilitar provider en Supabase + botón "Continuar con Google" en `/login`.
- **Reporte mensual con desglose por grupo** en `/reporte` (hoy es 6 meses).
- **OCR de estados de cuenta** Diners/Amex (subir PDF → IA genera gastos individuales auto-categorizados).
- **Vista anual de ingresos**.
- **Export CSV/Excel** de gastos.

## Anti-patrones (no hacer)
- No usar `<img>` sin disable comment (ESLint `@next/next/no-img-element`).
- No persistir state en `localStorage`/`sessionStorage` — Next App Router no lo soporta bien con SSR; usar React state.
- No hacer queries N+1: preferir un solo `select` con joins/subqueries de Supabase.
- No exponer `service_role` key en cliente. Para operaciones admin sobre `auth.users` usar funciones SQL `SECURITY DEFINER` (ej: `set_user_role`, `list_users_with_roles`).
