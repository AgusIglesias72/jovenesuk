# Forms implementation — captación de leads y newsletter

> Estado: **frontend listo, backend pendiente.** Este documento es el spec para
> que el agente de backend complete la persistencia y las notificaciones.
> Los formularios ya validan y muestran estados de éxito/error, pero **hoy NO
> guardan nada ni avisan a nadie** (las server actions devuelven `ok` tras
> validar, con `TODO(backend)` en los puntos a completar).

## 1. Qué hay construido (frontend)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Schema + opciones (Zod) | `src/lib/domain/leads.ts` | Validación compartida y listas de opciones. **Dominio puro**, reutilizable en el backend. |
| Server actions | `src/app/(public)/leads/actions.ts` | `subscribeNewsletter` y `submitLead`. Validan y devuelven `FormResult`. Acá van los `TODO(backend)`. |
| Newsletter (Hero) | `src/app/(public)/NewsletterForm.tsx` | Input de email "atrapador" en el Hero. |
| Form de consulta | `src/app/(public)/LeadForm.tsx` | Form completo de calificación de lead. Se usa en la landing (`LeadSection`) y en `/contacto`. |
| Sección destacada | `LeadSection` en `src/app/(public)/sections.tsx` | Envuelve `LeadForm` en la home. |
| Analytics | `src/app/(public)/Analytics.tsx` | `track("generate_lead")` / `track("newsletter_signup")` ya se disparan al enviar (si hay GA configurado). |

El contrato de respuesta de ambas actions es:

```ts
type FormResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

No cambiar esta forma: el frontend depende de ella (`useActionState`).

## 2. Modelo de datos a crear (Drizzle)

Seguir las convenciones del repo: schema en `src/lib/db/schema/`, queries en
`src/lib/db/queries/`, generar migración con `/juk-migracion`.

### Tabla `suscriptores` (newsletter)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | |
| `email` | text, **unique** | idempotente: re-suscribir el mismo email no duplica |
| `estado` | enum `activo`/`baja` | para des-suscripción futura |
| `origen` | text | ej. `hero`, por si hay más entradas |
| `creadoEl` | timestamp | |

### Tabla `consultas` (leads)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | |
| `nombre`, `apellido` | text | |
| `email` | text | |
| `telefono` | text | |
| `paraQuien` | enum | `para_mi` / `para_mi_hijo` / `colegio` |
| `institucion` | text nullable | solo si `paraQuien = colegio` |
| `modalidad` | enum | `grupal` / `individual` / `colegios` / `study_work` / `no_se` |
| `destino` | enum nullable | ver `DESTINO` en `leads.ts` |
| `cuando` | enum | `proximos_3_meses` / `este_ano` / `proximo_ano` / `solo_averiguando` |
| `mensaje` | text nullable | |
| `estado` | enum `nueva`/`contactada`/`descartada` | para seguimiento en el admin |
| `creadoEl` | timestamp | |

> Los valores de los enums están en `src/lib/domain/leads.ts` (`PARA_QUIEN`,
> `MODALIDAD`, `CUANDO`, `DESTINO`). Reusarlos para mantener una sola fuente de
> verdad (importar el `value` de cada opción).

## 3. Qué completar en las server actions

En `src/app/(public)/leads/actions.ts`, donde están los `TODO(backend)`:

**`subscribeNewsletter`** (después de validar OK y descartar honeypot):
1. `INSERT ... ON CONFLICT (email) DO NOTHING` en `suscriptores` (vía query en `src/lib/db/queries/`).
2. (Opcional) agregar el contacto a una audiencia de Resend.
3. Devolver el `{ ok: true, message }` que ya está.

**`submitLead`** (después de validar OK y descartar honeypot):
1. Insertar la consulta en `consultas`.
2. Enviar email de aviso al equipo de JUK (Resend ya está en el stack: `RESEND_API_KEY`, `EMAIL_FROM_*`). Idealmente disparar un job de **Trigger.dev** (`src/trigger/`) para no bloquear la respuesta. Plantilla con React Email en `src/emails/` (seguir el patrón existente).
3. (Opcional) email de confirmación al lead.
4. Devolver el `{ ok: true, message }` que ya está.

Manejo de errores: si la DB/Resend fallan, devolver
`{ ok: false, error: "No pudimos procesar tu consulta, probá de nuevo o escribinos por WhatsApp." }`
y loguear con `Sentry.captureException` (Sentry ya está scaffoldeado).

## 4. Anti-spam (ya preparado en el front)

Ambos forms incluyen un **honeypot** (campo `website` oculto). Las actions ya
lo chequean: si viene relleno, responden `ok` sin persistir. Si se quiere
reforzar, sumar rate-limiting por IP (Upstash/Vercel KV) o un captcha
invisible (Turnstile de Cloudflare). No es bloqueante para v1.

## 5. Privacidad / datos personales (coordinar con negocio)

- Se capturan **datos personales** (incluye potencialmente de menores: el form
  contempla "para mi hijo/a"). Aplica la Ley argentina 25.326.
- El `LeadForm` ya pide **consentimiento explícito** (checkbox `acepta`, obligatorio).
- Pendiente de negocio: **página de Política de Privacidad** y linkearla desde el
  checkbox del form y el footer. Definir **retención** de los datos.
- El admin debería poder ver/exportar y **borrar** consultas (derecho de supresión).

## 6. Integración con el admin

Las `consultas` deberían aparecer en el back-office (nuevo módulo "Consultas" o
"Leads") con su `estado` para seguimiento. Usar `/juk-modulo` para andamiarlo.
Esto conecta con el flujo comercial existente (hoy entra por el webhook de
Google Form — ver `api/webhooks`; este form es una segunda entrada de leads,
conviene unificar el modelo si tiene sentido).

## 7. Checklist de cierre

- [ ] Schemas Drizzle + migración (`/juk-migracion`).
- [ ] Queries de insert (idempotente para suscriptores).
- [ ] Completar los dos `TODO(backend)` en `leads/actions.ts`.
- [ ] Email de aviso (Resend + Trigger.dev) con plantilla.
- [ ] Manejo de error + `Sentry.captureException`.
- [ ] Módulo de Consultas en el admin.
- [ ] Página de privacidad + retención (negocio).
- [ ] Test E2E: enviar el form → fila en DB + email recibido.
