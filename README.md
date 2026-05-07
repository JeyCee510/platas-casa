# Platas Casa 💰

Registro de gastos familiares — simple, automatizable y gratis.
Stack: **Next.js 14** + **Supabase** + **Tailwind** (estilo neobrutalista) + **Claude Vision** para leer fotos de boletas.

Funciona en el celular como PWA: agregar a pantalla de inicio y se siente como app nativa.

---

## 🚀 Deploy en 4 pasos (15–20 min)

### 1. Crear proyecto en Supabase (5 min)

1. Entra a https://supabase.com → **New Project**.
2. Nombre: `platas-casa`. Región: la más cercana a ti. Pon una contraseña fuerte para la DB (no la usarás directo).
3. Espera ~2 min a que se cree.
4. Una vez listo, ve a **SQL Editor** (sidebar izquierda) → **New Query**.
5. Abre el archivo `supabase/schema.sql` de este proyecto, **copia todo y pégalo**, dale **Run**.
6. Ve a **Project Settings → API** y copia:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Ve a **Authentication → Providers** y verifica que **Email** esté habilitado (viene por defecto).
8. Ve a **Authentication → URL Configuration**:
   - **Site URL**: pon `http://localhost:3000` por ahora (lo cambias luego al URL de Vercel).
   - **Redirect URLs**: agrega `http://localhost:3000/auth/callback` y, cuando tengas Vercel, agrega también `https://TU-APP.vercel.app/auth/callback`.

### 2. Conseguir API key de Anthropic (Claude) — 3 min

Esto se usa solo para leer las fotos de boletas. ~$0.003 USD por boleta procesada (con $5 de crédito gratis te alcanza para ~1500 boletas).

1. Entra a https://console.anthropic.com → **Get API Keys**.
2. Crea una key nueva → cópiala. Será `ANTHROPIC_API_KEY`.
3. (Opcional) En **Plans & Billing** carga $5 USD si se acaba el crédito gratuito.

> Si prefieres saltarte el OCR por ahora, deja la variable vacía: el formulario manual seguirá funcionando perfecto.

### 3. Subir el código a GitHub (3 min)

```bash
cd "/Users/carabela/Desktop/Claude Workspace/proyectos/PlatasCasa/App Registro gastos familia"
git init
git add .
git commit -m "first commit"

# Crea repo en https://github.com/new (nómbralo platas-casa, privado)
git branch -M main
git remote add origin https://github.com/TU_USUARIO/platas-casa.git
git push -u origin main
```

### 4. Deploy en Vercel (5 min)

1. Entra a https://vercel.com → **Add New → Project**.
2. Importa el repo `platas-casa` de GitHub.
3. **Framework Preset**: Next.js (lo detecta solo).
4. Expande **Environment Variables** y agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = (lo del paso 1.6)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (lo del paso 1.6)
   - `ANTHROPIC_API_KEY` = (lo del paso 2)
5. **Deploy**. Espera 1–2 min.
6. Vercel te da una URL tipo `https://platas-casa-xxx.vercel.app`. **Cópiala**.
7. Vuelve a Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://platas-casa-xxx.vercel.app`
   - **Redirect URLs**: agrega `https://platas-casa-xxx.vercel.app/auth/callback`
8. ¡Listo! Entra a tu URL de Vercel, mete tu correo, abre el link mágico y a registrar gastos.

---

## 📱 Instalar como app en el celular

- **iPhone (Safari)**: abre la URL → botón de compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome)**: abre la URL → menú ⋮ → **Instalar app** o **Añadir a pantalla principal**.

Listo, queda como app nativa con cámara incluida.

---

## 🧪 Correr local (opcional)

```bash
cp .env.local.example .env.local
# edita .env.local con tus claves

npm install
npm run dev
# abre http://localhost:3000
```

---

## 🗂️ Estructura

```
app/
  (app)/             # rutas protegidas (requiere login)
    page.tsx         # dashboard
    agregar/         # form de gasto + foto
    lista/           # tabla de gastos
    reporte/         # gráficos 6 meses
  api/parse-receipt/ # OCR de boletas con Claude Vision
  auth/callback/     # callback magic link
  login/             # login por email
components/ui/       # Button, Card, Input, Badge, Nav (estilo neobrutal)
lib/
  supabase/          # client + server + middleware
  format.ts          # USD, fechas
supabase/schema.sql  # schema completo (tablas + RLS + seeds)
```

---

## 💸 Costos (todo gratis para uso familiar)

| Servicio | Free tier | Suficiente para |
|---|---|---|
| Vercel Hobby | 100 GB-hr / mes | una familia entera |
| Supabase | 500 MB DB + 1 GB storage | años de gastos |
| Anthropic | $5 crédito inicial | ~1500 boletas |

---

## ✏️ Cambiar categorías

Edita `supabase/schema.sql` y vuelve a correrlo, o desde Supabase → **Table editor → categories** agregas/editas filas.

## 🐛 Problemas comunes

- **"Falta ANTHROPIC_API_KEY"** al subir foto: agrega la env var en Vercel y redeploy.
- **"Email no llega"**: revisa spam. En Supabase → Auth Logs ves los envíos. Para volumen alto, conecta un SMTP propio (Resend gratis).
- **"new row violates row-level security"**: olvidaste correr el `schema.sql` completo.
