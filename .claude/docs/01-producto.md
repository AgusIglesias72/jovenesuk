# 01 · Producto

## Qué es

**JUK Portal** es el back-office interno de **Jóvenes en UK (JUK)**, una agencia argentina que organiza
viajes de estudio de inglés a UK (y otros destinos). Lo usa el equipo operativo de JUK (4 personas) para
gestionar colegios, viajes, alumnos, group leaders, pagos y el seguimiento de trámites de cada alumno.

No es un producto de cara al cliente: hoy es solo el portal interno (`admin`). Más adelante se suman
dos portales que comparten el mismo modelo de datos: el del **Representante** (group leader) y el de las
**Familias**. Por eso la arquitectura separa la lógica de negocio del framework (ver doc 02).

## Roles

Modelados en la tabla `users` (campo `role`):

| Rol | Quién | Acceso |
|---|---|---|
| `admin_juk` | Equipo interno (Felix, Delfina, Tomás…) | Todo el portal admin |
| `super_admin` | Admin que además gestiona usuarios (María) | Todo + sección Usuarios |
| `representante` | Group leader externo | Futuro portal (tablas ya existen) |
| `familia` | Alumno/tutor | Futuro portal (tablas ya existen) |

Los usuarios desactivados (`isActive = false`) no pueden entrar aunque tengan sesión válida
(se enforza en `requireSession`).

## Módulos

### Construidos y funcionando
- **Auth** — login, reset de password (Better-Auth + Resend).
- **Dashboard** — conteos reales (viajes por estado, alumnos) + viajes próximos. Las alertas son
  placeholder (su generación automática es fase posterior).
- **Colegios** — ABM de colegios destino y cliente.
- **Viajes** — ABM de salidas grupales (código, fechas, origen, destino, capacidad GL×12, estado).
- **Alumnos** — ABM con datos personales, pasaporte, tutores, facturación; baja/reactivación.
- **Group Leaders** — ABM con datos + seguimiento del police check.
- **Usuarios** (solo super_admin) — alta de admins con password temporal, cambio de rol, activar/desactivar.
- **Asignaciones** — detalle del viaje (`/viajes/[id]`) con su roster: asignar/quitar alumnos, control de
  cupo (GL×12) y validación de pasaporte. NO genera cuotas ni pasos todavía (eso es lo gated).

### Pendientes (marcados "Pronto" en la nav o sin entrada)
- **Pagos / cuotas** — bloqueado por CRIT-01 (ver abajo).
- **Seguimiento M6** (10 pasos por alumno) y **M7** (5 pasos por viaje) — incluye trámites como
  Application Form, Immigration Letter, ETA, Parental Consent, etc.
- **Configuración**, **recordatorios automáticos** (Trigger.dev), **alertas** dinámicas.

## Decisiones de negocio abiertas (gating)

Hay 3 decisiones críticas sin cerrar que **bloquean** módulos enteros (detalle en
`juk-portal/OPEN_DECISIONS.md`). El código las respeta: donde tocan, los campos quedan manuales y sin
lógica derivada.

| Gate | Qué bloquea |
|---|---|
| **CRIT-01** — flujo de pago del Colegio Cliente (NEA) | Todo el módulo de Pagos, el campo `viaje.ultimoPagoPresencial`, el trigger de cuotas al asignar |
| **CRIT-02** — validación de pasaporte UK (¿6 meses extra?) | La regla de validación de pasaporte al asignar |
| **CRIT-03** — el psicofísico, ¿del alumno o del group leader? | El Paso 9 del M6 y la estructura del M7 |

Por eso, al **asignar un alumno a un viaje** se crea solo la relación: la generación automática de los
10 pasos del M6 y de las cuotas queda afuera hasta resolver CRIT-01 y CRIT-03.

## Estado (mayo 2026)

Fase 0-1 completas (infra, auth, design system). Fase 2-3 cubiertas por los ABMs de Colegios, Viajes,
Alumnos, Group Leaders y Usuarios. Próximo gran bloque: cerrar los CRIT con el equipo y arrancar
Pagos + el seguimiento de pasos (M6/M7).
