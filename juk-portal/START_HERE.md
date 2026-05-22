# START HERE — JUK Portal

Si estás abriendo este zip por primera vez, leé esto primero. Te lleva del descomprimido al primer deploy.

## 0 · Qué tenés en las manos

Un scaffold de Next.js 16 con:

- **Stack:** Next 16 + TypeScript estricto + Drizzle ORM + Better-Auth + Resend + Trigger.dev + Cloudflare R2 + Sentry
- **Hosting target:** Vercel `gru1` (São Paulo) + Neon `aws-sa-east-1`
- **Estado:** ~95% de Fase 1 lista (login, reset password, shell, design system aplicado)
- **Schemas Drizzle:** las 12 entidades principales del Modelo de Datos del Agente 4
- **Templates de email:** welcome / reset / password-changed funcionando con React Email

## 1 · Antes de codear: leé los docs en este orden

```
1. docs/architecture.md       ← decisiones técnicas y por qué de cada elección
2. docs/data-model.md         ← cómo se relacionan las entidades
3. docs/phases.md             ← plan de implementación en 10 fases
4. OPEN_DECISIONS.md          ← decisiones de negocio pendientes (CRÍTICO)
5. CLAUDE.md                  ← convenciones para Claude Code
6. docs/PRD-MODULO-8-STACK.md ← sección lista para sumar al PRD principal
```

20 minutos de lectura te ahorran horas de revertir cambios.

## 2 · Resolvé los temas críticos ANTES de codear módulos sensibles

Leé `OPEN_DECISIONS.md`. Hay 3 temas que tenés que cerrar con María antes de tocar código relacionado a:

- **Pagos** (no codees el Paso 2 / Paso 10 hasta resolver flujo NEA)
- **Validación de pasaporte UK** (no codees la regla hasta confirmar si exige 6 meses adicionales)
- **Paso 9 — Psicofísico** (no codees el paso hasta saber si es del alumno o del GL)

Lo que SÍ podés codear sin riesgo:
- Login + reset password (ya está hecho, validá que funcione)
- ABM de Colegios destino
- Dashboard layout
- Shell + navegación

## 3 · Setup técnico (≈45 min)

### 3.1 Local

```bash
# Asumiendo que descomprimiste en juk-portal/
cd juk-portal
nvm use         # usa .nvmrc → Node 22 LTS
npm install
cp .env.example .env.local
# Dejá vacías las vars que aún no tenés — el dev server arranca igual,
# solo fallan las features de auth/email/etc. al usarlas.
```

### 3.2 Crear cuentas y obtener credenciales

En este orden (3-5 min cada uno):

1. **GitHub** — repo privado nuevo: `juk-portal` (o el nombre que prefieras)
2. **Neon** ([neon.tech](https://neon.tech)) — crear proyecto en región `aws-sa-east-1` (São Paulo). Copiar:
   - `DATABASE_URL` (pooled connection)
   - `DATABASE_URL_UNPOOLED` (direct connection — para migraciones)
3. **Vercel** ([vercel.com](https://vercel.com)) — conectar el repo de GitHub. Settings → Functions → Region: `gru1`
4. **Resend** ([resend.com](https://resend.com)) — crear API key. Verificar dominio `jovenesenuk.com` (necesitás acceso DNS de la web pública)
5. **Cloudflare R2** ([dash.cloudflare.com](https://dash.cloudflare.com)) → R2 → crear bucket `juk-documents`. Crear API token con permisos `Object Read & Write`
6. **Trigger.dev** ([trigger.dev](https://trigger.dev)) — crear proyecto, copiar `TRIGGER_PROJECT_ID` y `TRIGGER_SECRET_KEY`
7. **Sentry** ([sentry.io](https://sentry.io)) — crear proyecto Next.js, copiar DSN

### 3.3 Generar secrets locales

```bash
# Secret de Better-Auth (32 bytes random):
openssl rand -base64 32
# Pegar en BETTER_AUTH_SECRET en .env.local

# Secret del webhook de Google Form:
openssl rand -base64 24
# Pegar en GOOGLE_FORM_WEBHOOK_SECRET
```

### 3.4 Configurar Vercel env vars

Una vez conectado el repo a Vercel, copiar todas las vars de `.env.local` a Vercel:
Settings → Environment Variables. Marcar "Production" y "Preview" para todas excepto `NODE_ENV` (déjala en automático).

## 4 · Primera migración a Neon

```bash
# Genera la migración SQL desde los schemas Drizzle
npm run db:generate

# Aplica directamente (solo para greenfield / primera vez)
npm run db:push
```

Si todo va bien, abrí `npm run db:studio` y vas a ver las 12 tablas vacías.

## 5 · Crear el primer usuario (vos)

Editá `src/lib/db/seed.ts` (lo agregué) con tu email real. Después:

```bash
npm run db:seed
```

Te crea un usuario con rol `super_admin` y password temporal. Te imprime las credenciales en la consola.

## 6 · Primer dev server

```bash
npm run dev
# abrí http://localhost:3000 → te redirige a /login
# logueate con el usuario del seed
# llegás al dashboard con datos mock
```

Si todo se ve como JUK (sidebar navy, Fraunces en los números, layout limpio), el design system está aplicado correctamente.

## 7 · Primer deploy preview

```bash
git add .
git commit -m "feat: initial scaffold"
git push origin main
```

Vercel detecta el push y lanza el primer deploy. La primera vez tarda 3-5 min (build de Next 16 desde cero). Después con Turbopack es mucho más rápido.

## 8 · Trabajar con Claude Code

```bash
# Asumiendo Claude Code instalado:
claude

# Le decís qué hacer. Ejemplos:
> Leé CLAUDE.md y docs/architecture.md, después ayudame a implementar el ABM de Colegios siguiendo los archetypes de docs/04-screen-archetypes.md del design system
```

Claude Code va a leer tu repo, respetar las convenciones del `CLAUDE.md`, y trabajar con los componentes UI del design system.

## 9 · Orden sugerido de implementación (próximas semanas)

Sacado de `docs/phases.md`, te dejo las prioridades:

**Esta semana (Fase 0-1 completar):**
- [ ] Setup de todos los servicios (paso 3)
- [ ] Crear usuario super_admin (paso 5)
- [ ] Verificar que login → dashboard funciona en producción
- [ ] Configurar dominio `portal.jovenesenuk.com` apuntando a Vercel

**Próxima semana (Fase 2):**
- [ ] ABM de Colegios destino (puede arrancarse sin esperar resolución de OPEN_DECISIONS)
- [ ] Crear los 4 usuarios reales del equipo (María, Felix, Delfina, Tomas) desde el seed

**Mientras tanto, en paralelo:**
- [ ] Coordinar reunión con María/Felix/Tomas para cerrar los 3 críticos de OPEN_DECISIONS.md
- [ ] Actualizar Modelo de Datos a v1.2 con las resoluciones
- [ ] Si decidieron cambios significativos, ajustar schemas Drizzle ANTES de cargar datos reales

## 10 · Si algo no compila / no anda

- **`npm install` falla:** verificá que estés en Node 22 (`node --version`). Si no, `nvm install 22 && nvm use 22`.
- **`db:push` falla:** la `DATABASE_URL_UNPOOLED` debe ser la "direct connection" de Neon, no la pooled. Si te confundiste, dejá ambas iguales por ahora — funciona pero con menos performance.
- **Login no manda email:** revisar que `RESEND_API_KEY` esté seteado y que el dominio `jovenesenuk.com` esté verificado en Resend. Mientras tanto, los emails se logean en consola y podés copiar el link de reset manualmente.
- **Sentry rompe el build:** comentá las llamadas a Sentry en `next.config.ts` por ahora. No es bloqueante para v1.

## 11 · Costo proyectado

Primeros 6 meses: **USD 0–40/mes**. Si superás el free tier de Resend (~3k emails) o llegás a 0.5GB de DB en Neon, sumás unos USD 20-40 más. Año 2 con todo escalado: **techo de USD 80/mes**.

---

**Cualquier cosa que no compile, no te frenes intentando descifrarlo solo. Volvé al chat de Claude.ai y me pasás el error — el contexto del proyecto está cargado y te puedo ayudar a desbloquear.**

Mucha suerte. Te quedó un proyecto sólido. Dale.
