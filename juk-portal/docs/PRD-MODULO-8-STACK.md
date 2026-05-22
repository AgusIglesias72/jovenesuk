# Módulo 8 — Stack Técnico e Infraestructura

## 8.1 Objetivo del módulo

Definir el conjunto de tecnologías, servicios y decisiones arquitectónicas que sostienen el Portal de Gestión Interno. El stack está pensado para un equipo de desarrollo de una persona con asistencia de Claude Code, escala operativa baja (4 admins + 40-80 alumnos/año), datos sensibles que requieren control de privacidad, y crecimiento gradual hacia portales adicionales (representante, familia) y eventualmente una app nativa.

## 8.2 Decisión de stack — resumen ejecutivo

| Capa | Tecnología | Plan / Región |
|---|---|---|
| Framework full-stack | Next.js 16 (App Router) | n/a |
| Lenguaje | TypeScript estricto | n/a |
| UI | React 19 + Tailwind CSS + JUK Design System | n/a |
| ORM | Drizzle ORM | n/a |
| Base de datos | PostgreSQL en Neon | `aws-sa-east-1` (São Paulo) |
| Auth | Better-Auth | n/a |
| Background jobs | Trigger.dev v4 | Free tier |
| Email transaccional | Resend + React Email | Free tier inicial |
| Storage de archivos | Cloudflare R2 | Free tier |
| Hosting | Vercel | `gru1` (São Paulo), Hobby tier |
| Observabilidad | Sentry | Developer (free) |
| Repositorio | GitHub privado | n/a |
| Desarrollo | Claude Code | n/a |

**Costo proyectado primeros 6 meses:** USD 0–40/mes. A 12 meses, techo realista de USD 60–80/mes.

## 8.3 Justificación de decisiones clave

### 8.3.1 Next.js 16 como framework full-stack

Next.js 16 sirve simultáneamente como frontend (React 19 con App Router), backend (Server Actions y Route Handlers) y plataforma de deploy (Vercel-native). Para el volumen de tráfico del Portal (4 admins de uso diario, 60 familias de consulta ocasional), separar frontend y backend es complejidad innecesaria.

**Features de Next.js 16 que aprovechamos:**
- Turbopack default en `next build` (builds 2-5x más rápidos)
- React Compiler estable (auto-memoización)
- `proxy.ts` reemplaza `middleware.ts` (más explícito)
- Server Components + Server Actions estables para reducir boilerplate
- Cache Components y PPR para los portales públicos futuros

### 8.3.2 Single Next.js app con route groups

En lugar de monorepo (Turborepo + apps separadas), usamos una única aplicación con `route groups` del App Router para separar los 3 portales:

```
src/app/
├── (admin)/           ← portal interno JUK (este PRD v1.1)
├── (representante)/   ← futuro
├── (familia)/         ← futuro
├── (auth)/            ← login, password-reset
└── api/
    ├── v1/            ← API REST versionada (para futura app nativa)
    └── webhooks/      ← Google Form, Trigger callbacks
```

**Justificación:**
- Un solo desarrollador; el monorepo aporta valor con varios paquetes / equipos
- Los 3 portales comparten ~90% del modelo de datos
- Cada `(grupo)` tiene su propio layout, middleware de roles y diseño
- Migración a Turborepo posible en cualquier momento sin reestructurar el código

### 8.3.3 Drizzle ORM sobre Prisma

**Trade-off aceptado:** se eligió Drizzle a pesar de la curva de aprendizaje inicial (~2-3 días) por las siguientes ventajas en este proyecto:

- Schema en TypeScript puro, no DSL externo → mejor DX con Claude Code
- Mejor performance en queries con múltiples JOINs (alumnos × pasos × cuotas)
- Sin paso de generación de cliente
- Mejor edge runtime support (Vercel Edge + Neon)
- Migraciones como archivos SQL legibles

### 8.3.4 PostgreSQL en Neon, región São Paulo

**Por qué Neon:**
- Postgres puro (no BaaS opinionado) → sin lock-in
- **Database branching** — cada PR genera una rama de la DB con copia copy-on-write de producción. Esto permite probar cambios de schema y features contra datos realistas sin riesgo
- Pricing previsible (free → USD 19/mes en crecimiento)
- Integración nativa con Vercel para preview deployments

**Región `sa-east-1` (São Paulo):**
- Latencia Argentina ↔ São Paulo ≈ 30-50ms vs ≈ 130ms a US East
- Co-localizado con Vercel `gru1`
- Disponibilidad confirmada GA desde febrero 2025

### 8.3.5 Better-Auth sobre Clerk

**Por qué no Clerk:**
- Los datos personales de menores de edad (pasaportes, CUIL, datos de tutores) deben vivir en infraestructura controlada por JUK, no en un tercero
- Roles custom (`admin_juk`, `super_admin`, `representante`, `familia`) más fáciles de modelar y consultar
- Costo: Clerk cobra USD 25/mes pasados los 10k MAU; Better-Auth es gratis siempre
- Sin lock-in en el día que se quiera cambiar de proveedor

**Configuración para JUK:**
- Email + password (sin OAuth en v1)
- Sesiones expiran a las 8h (PRD §1.3)
- Reset password links caducan a las 24h (PRD §1.2 US-04)
- Rate limit de 5 intentos / 60s (PRD §1.2 US-01)
- Admin crea usuarios desde `/usuarios`; nuevos usuarios reciben password temporal por email

### 8.3.6 Trigger.dev v4 para background jobs

Necesario para las múltiples tareas asincrónicas del PRD:

- Recordatorios escalonados (14/7/3/1 días antes de deadlines del M6 paso 1)
- Recálculo diario de alertas y mora (M2)
- Resumen semanal a María (M2)
- Procesamiento de webhooks del Google Form (M5)
- Marcado automático de transiciones de viaje (M4 §4.4)

**Por qué no Vercel Cron:** plan Hobby permite sólo 2 jobs; necesitamos scheduling dinámico (un recordatorio por (alumno × paso × distancia)).

**Por qué no Redis + BullMQ:** infraestructura propia es overhead innecesario para el volumen.

### 8.3.7 Cloudflare R2 para archivos

Almacena: Application Forms, Immigration Letters, Parental Consents, e-tickets, comprobantes, certificados.

**Ventajas vs S3 / Vercel Blob:**
- Egress gratis (descargar el Parental Consent 1000 veces no cuesta nada)
- API compatible S3 (mismo SDK)
- 10GB gratis (suficiente para JUK)
- Custom domain (`files.jovenesenuk.com`)

### 8.3.8 Resend + React Email

Resend cubre todos los casos de emailing transaccional del PRD:

- Bienvenida con password temporal (M1 US-03)
- Reset de password (M1 US-04)
- Recordatorios de pasos (M6 §6.3)
- Alertas de mora a admins (M6 §6.4)
- Resumen semanal a María (M2 §2.5)
- Instructivo de ETA (M6 §6.9 US-32)

React Email permite escribir templates como componentes JSX, con tipado y reuso de partes (header, footer, branding).

**Dominio configurado:** `info@jovenesenuk.com` para envíos generales (con `noreply@jovenesenuk.com` como alternativa a definir según PRD §6.13).

## 8.4 Arquitectura interna del código

### 8.4.1 Separación de capas

```
src/
├── app/                ← Capa web (Next.js routing, UI, server actions)
├── lib/
│   ├── db/             ← Capa de datos (Drizzle schemas + queries tipadas)
│   ├── domain/         ← Lógica de negocio PURA (sin imports de Next/React)
│   ├── auth/           ← Auth helpers
│   ├── email/          ← Cliente Resend + templates React Email
│   └── jobs/           ← Lógica de tasks (consumida por src/trigger/)
├── components/ui/      ← Componentes del Design System JUK
└── trigger/            ← Task definitions de Trigger.dev v4
```

**Regla central:** archivos en `lib/domain/` no importan de `next`, `react`, ni `app/`. Esto garantiza que la misma lógica sirva al portal web hoy y a una API REST consumida por una app nativa mañana.

### 8.4.2 Preparación para app nativa futura

Aunque el portal v1 sea PWA (Progressive Web App), la arquitectura contempla una eventual app nativa:

- **API REST versionada en `api/v1/`**: endpoints expuestos que consumen el mismo `lib/domain/` que las server actions internas
- **Tipos compartidos via Zod**: schemas de validación reutilizables entre web y futuro cliente móvil
- **Auth con tokens**: Better-Auth soporta bearer tokens en headers además de cookies
- **PWA-first**: manifest.json, service worker, install prompt — la PWA cubre el 80% del valor de una app nativa sin requerir desarrollo separado

Stack recomendado cuando se decida hacer la app nativa: **Expo + React Native + TypeScript**, consumiendo `api/v1/`.

## 8.5 Ambientes y deploy

### 8.5.1 Estructura de ambientes

```
DESARROLLO LOCAL              PRODUCCIÓN                    PREVIEW (por PR)
─────────────────             ─────────────                 ───────────────────
localhost:3000        →       portal.jovenesenuk.com   ←    juk-portal-pr-N.vercel.app
Neon branch "dev"     →       Neon branch "main"       ←    Neon branch "preview/pr-N"
```

### 8.5.2 Flujo de deploy

1. **Local:** `npm run dev` → arranca Next.js en localhost:3000 conectado a una rama "dev" de Neon
2. **PR a `main`:**
   - Vercel genera automáticamente un preview deployment con URL única
   - Neon crea una rama de DB con datos copy-on-write de producción
   - El PR corre `typecheck`, `lint`, y tests en CI (GitHub Actions)
3. **Merge a `main`:**
   - Vercel deploy a producción
   - Migraciones de DB se aplican manualmente vía workflow bloqueante antes del deploy (seguridad)

### 8.5.3 Versionado y releases

- Tags semánticos `v0.1.0`, `v0.2.0`, etc. al cierre de cada fase
- Changelog en `CHANGELOG.md` mantenido manualmente
- Backups: Neon hace point-in-time recovery automático (24h en plan free, 7 días en plan paid)

## 8.6 Seguridad y privacidad

### 8.6.1 Datos sensibles

El sistema maneja PII (Personally Identifiable Information) de menores de edad:
- Datos de pasaporte (nombre, número, fecha de nacimiento, vencimiento)
- DNI
- Datos de facturación (CUIL/CUIT)
- Información médica (alergias, dietas)
- Datos de contacto (teléfonos, emails) de menores y sus tutores

**Medidas obligatorias:**
- TLS en tránsito (Vercel + Cloudflare lo proveen automáticamente)
- Encriptación en reposo en Neon (incluida en todos los planes)
- Datos de facturación visibles sólo para `admin_juk` / `super_admin` (enforcement en `lib/domain`)
- Audit log de todos los cambios sobre datos sensibles (`auditoria` table)
- No exponer PII en logs (Sentry filtros configurados)

### 8.6.2 Auth

- Sesiones HTTP-only cookies con `SameSite=Lax`
- Cookies prefijadas `juk.` para evitar colisiones con otras apps si compartimos dominio
- Rate limit de login: 5 intentos / 60s
- Password hashing: bcrypt (default de Better-Auth)
- Reset de password requiere acceso al email registrado; link caduca a las 24h

### 8.6.3 Webhooks

El webhook del Google Form (`/api/webhooks/google-form`) requiere un shared secret en headers para evitar inyección de alumnos falsos.

## 8.7 Observabilidad

### 8.7.1 Errores y excepciones

- **Sentry** instrumentado en Next.js (client + server + edge)
- Sample rate 100% en development, 10% en producción
- Filtros para no enviar PII a Sentry

### 8.7.2 Logs

- Logs de aplicación a stdout (capturados por Vercel)
- Logs estructurados (JSON) para producción
- Retención: 1 día en Vercel Hobby (suficiente; los errores serios van a Sentry)

### 8.7.3 Métricas operativas

- Vercel Analytics para Core Web Vitals
- Trigger.dev dashboard para visibilidad de jobs (éxitos, errores, latencias)
- Neon dashboard para queries lentas y uso de DB

## 8.8 Costos estimados

| Servicio | Mes 1-6 | Mes 6-12 | Año 2 (proyección) |
|---|---|---|---|
| Vercel | $0 (Hobby) | $0 | $20 (Pro si tráfico crece) |
| Neon | $0 (Free) | $19 (Launch) | $19 |
| Cloudflare R2 | $0 | $0 | $0 (debajo del free tier) |
| Trigger.dev | $0 (Free) | $0 | $0–10 |
| Resend | $0 (Free) | $0–20 | $20 (Pro) |
| Sentry | $0 (Developer) | $0 | $0–26 |
| GitHub | $0 (privado) | $0 | $0 |
| Dominio | (ya existente) | – | – |
| **Total** | **$0–10/mes** | **$19–40/mes** | **~$60–80/mes** |

## 8.9 Decisiones pendientes — Stack

| Tema | Decisión a tomar | Cuándo |
|---|---|---|
| Dominio del portal | `portal.jovenesenuk.com` vs `juk.jovenesenuk.com` | Fase 0 |
| Política de backups extra | ¿Export semanal a R2 además del PITR de Neon? | Fase 9 |
| Stack de testing | Vitest (unit) + Playwright (E2E) — confirmar | Fase 1 |
| App nativa | Expo + React Native vs Capacitor sobre PWA | Cuando el caso de uso lo demande |
| 2FA | ¿Implementar TOTP en Fase 9 o posterior? | A definir |
| Google Workspace SSO | Cuando los emails @jovenesenuk.com estén creados | Futuro |
