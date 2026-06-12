# 01 · Visión y dominio del negocio

> **Fuentes:** PRD Portal de Gestión Interno v1.13, PRD Modelo de Datos v1.7, PRD Portal de
> Familias v1.11, PRD Vista del Representante v1.10 (junio 2026). Los documentos originales
> convertidos viven en [`fuentes/`](fuentes/). Este doc consolida los conceptos transversales;
> cada portal tiene su spec propia (docs 02, 04 y 05) y el modelo de datos la suya (doc 03).

## Qué es JUK y qué resuelve el sistema

**JUK (Jóvenes en UK)** es una agencia argentina especializada en viajes de estudio a países de
habla inglesa, principalmente Reino Unido. Coordina entre **40 y 80 alumnos por año**, en
salidas grupales y también de manera individual.

El sistema se compone de **tres portales** sobre una misma base de datos:

| Portal | Usuarios | Estado | Spec |
|---|---|---|---|
| **Portal de Gestión Interno** | Equipo JUK (4 admins) | En construcción (este repo) | [02](02-portal-interno.md) |
| **Portal de Familias** | Padres/tutores y alumnos (read-only + NPS) | No construido | [04](04-portal-familias.md) |
| **Vista del Representante** | Group leaders externos | No construida | [05](05-vista-representante.md) |

## Roles del sistema

| Rol | ENUM | Descripción |
|---|---|---|
| **Admin** | `Admin` | Miembro del equipo operador. En v1, siempre el equipo JUK: María (CEO), Felix (Sales), Delfina (Marketing), Tomas (Operations). Acceso completo según `sub_rol_admin`. ★ |
| **SuperAdmin** | `SuperAdmin` | Reservado para v2 (multi-tenant). **No se asigna a ningún usuario en v1.** No genera lógica nueva. |
| **Representante** | — | Group leader externo asignado a un viaje. Vista diferenciada (doc 05). |
| **Familia / Alumno** | — | Solo lectura del estado de trámites y pagos de su alumno (doc 04). |

> **Nota de arquitectura — renombre del ENUM:** `Admin_JUK` fue renombrado a `Admin` para
> preparar multi-tenant v2 (operadores externos a JUK). El cambio no afecta lógica ni permisos.
> El super-admin de v1 es **María (CEO)** (cerrado por Felix).

## Conceptos clave de negocio

### Tipos de representante (atributo del VIAJE, no del colegio)

Cada viaje tiene un representante (group leader). El tipo determina el **flujo de pago**:

| Tipo | Descripción | Flujo de pago |
|---|---|---|
| **Representante Independiente** | Persona física que trae alumnos a JUK de forma individual. | Vía agencia externa. **Último pago presencial con JUK** (paso B2 activo; históricamente, para evitar la comisión ~6% de la agencia — racionalidad comercial, fuera del PRD desde v1.8). |
| **Instituto** | Institución de inglés u organismo que agrupa alumnos y opera como representante. | Vía agencia. **Último pago presencial con JUK** (igual que Independiente). |
| **Colegio cliente** | Institución educativa argentina (ej: NEA). El grupo viaja organizado por el colegio. No tiene módulo propio: es un tipo de representante. | Vía agencia **SIN excepción presencial**: TODOS los pagos —incluido el último— van por la agencia. **B2 = N/A.** |
| **JUK (directo)** | El alumno llega sin intermediario externo; JUK opera como representante de facto. | **Directo JUK**: sin agencia, comisión de agencia = N/A, fee = N/A, **B2 = N/A**. Sin credenciales de portal de representante (no hay persona externa). |

### Colegio destino vs. colegio cliente

- **Colegio destino**: institución educativa en UK (u otro país anglófono) donde los alumnos
  estudian. Tiene Application Form, Parental Consent, Confirmation Letter, VISA/Immigration
  Letter (template), cursos y alojamientos. Se gestiona en el **Módulo 3**.
- **Colegio cliente**: institución argentina (ej: NEA). Actúa como representante de tipo
  'Colegio cliente'. **No tiene módulo propio** — su lógica son atributos del viaje (M4);
  en el catálogo de colegios solo existe como entrada de directorio (tipo "cliente") para el
  dropdown de origen del viaje.
- El proceso documental (Application Form, Parental Consent, Immigration Letter, Accommodation
  Letter) ocurre **SIEMPRE en el colegio destino**, sea cual sea el tipo de representante.
- La agencia de excursiones NO cobra comisión de JUK; su costo va al precio del programa.

### Tipo de viaje: Grupal vs. Individual

`tipo_viaje` (ENUM: `Grupal` | `Individual`) condiciona campos y comportamiento:

| Aspecto | Grupal | Individual |
|---|---|---|
| Group leaders | ≥ 1 (campo requerido) | **0, fijo** (campo oculto) |
| Capacidad máxima | GL × 12, editable solo hacia abajo | **1, fija** |
| Estado inicial | Inscripción abierta | **Confirmado** (nace confirmado) |
| Regla de 5 alumnos | Auto-confirma al llegar a 5 | No aplica |
| Pasajes (M7 P1) | JUK cotiza y emite | El alumno gestiona los suyos; JUK registra datos del vuelo |
| Police checks (M7 P5) | Por cada GL | **N/A automático** (sin GL) |
| Psicofísico (M6 D2) | Requerido (hay adulto acompañante) | **N/A automático** |
| Dashboard "Viajes del próximo año" | Aparece, con indicador de riesgo | **No aparece** |
| Badge en listados | — | Badge visual "Individual" |

### Modelo de comisiones — tres capas (solo referencia interna en v1)

1. **Comisión del colegio destino (%)** — se registra en el colegio (M3). Visible solo Admin.
2. **Comisión de la agencia externa (%)** — se registra en el viaje (M4). Aplica a flujo
   'Vía agencia'; N/A automático para 'JUK (directo)'. Visible solo Admin.
3. **Fee del representante** — monto fijo o % que el representante suma al precio base.
   Se registra en el viaje. Aplica a Independiente e Instituto. Visible solo Admin.

> **Cerrado (Felix/María):** v1 NO calcula precios ni presupuestos. Las comisiones son
> referencia interna. Queda **abierto** si en el futuro el portal calcula el precio final
> (María: "en algunos casos las comisiones sí son el precio final, en otros no").

### Reglas de pasaporte (cerradas — ex CRIT-02)

- **UK:** el pasaporte debe ser válido durante toda la estadía → vencimiento **≥ fecha de fin
  del viaje**. UK **NO** exige los 6 meses adicionales típicos de otros países.
- **Otros países:** alertar si el pasaporte vence dentro de los **6 meses posteriores a la
  fecha de fin** del viaje. Configurable por país.
- **Criterio de alerta del dashboard (conservador):** pasaporte vencido o que vence dentro de
  los 6 meses posteriores a la fecha de **inicio** del viaje → alerta crítica. (La validación
  legal sigue siendo ≥ fin del viaje para UK; la alerta es más estricta a propósito.)

### Principio operativo "3 meses antes"

JUK busca tener todos los trámites resueltos **3 meses antes del viaje**. Varios umbrales de
alerta están alineados a ese principio (C3 Accommodation Letter, D2 psicofísico, documentos
faltantes en el panel de alertas críticas).

### Representante vs. group leader físico

El **representante** registrado es el contacto responsable del viaje. El/los **group leaders
físicos** que acompañan al grupo pueden ser la misma persona o distintas. Hasta hoy siempre
coincidieron, pero la arquitectura debe soportar que difieran. En v1: el campo "Representante
(GL principal)" registra al responsable; si el GL físico difiere, se documenta en notas
internas del viaje.

### Email del sistema

Las comunicaciones salen desde `info@jovenesenuk.com` (instructivos, credenciales, alertas de
mora, datos de vuelo, resumen semanal). **Pregunta abierta:** ¿los recordatorios automáticos
salen de `info@` o de `noreply@`? Pendiente de decisión técnica.

## Mapa de versiones de los PRDs

| Documento | Versión | Hito principal de las últimas revisiones |
|---|---|---|
| Portal de Gestión Interno | **v1.13** | M6 reestructurado (Paso 0 + A/B/C/D), viajes Individuales, config documental por colegio, NPS, indicadores dashboard, roadmap v2 contratos |
| Modelo de Datos | **v1.7** | Modelo objetivo alineado a los PRDs nuevos |
| Portal de Familias | **v1.11** | Vista de trámites A/B/C/D, NPS 3 dimensiones |
| Vista del Representante | **v1.10** | Calendar del viaje, mapa de alumnos, panel de estados |

## Decisiones que estos PRDs CIERRAN (ex-gates)

| Ex-gate | Resolución |
|---|---|
| **CRIT-01** (flujo de pago NEA) | Colegio cliente paga TODO vía agencia, sin excepción presencial → **B2 = N/A**. Independiente/Instituto: vía agencia + último pago presencial (B2). JUK directo: todo directo, B2 = N/A. |
| **CRIT-02** (pasaporte ¿6 meses?) | UK: vencimiento ≥ fecha fin del viaje, **sin** 6 meses extra. Otros países: 6 meses post-fin, configurable. Alerta conservadora del dashboard: 6 meses post-inicio. |
| **CRIT-03** (psicofísico ¿de quién?) | **Del alumno** (D2 del M6), aplica a viajes Grupales con GL; N/A para Individuales. Los police checks de los GLs son otra cosa: M7 Paso 5. |

El detalle de gates vigente vive en [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md) (raíz de `juk-portal/`).
