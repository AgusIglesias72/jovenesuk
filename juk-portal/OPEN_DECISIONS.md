# Decisiones pendientes — JUK Portal

Lista accionable de lo que falta cerrar con el equipo **antes** de codear ciertos módulos.

> **Última actualización: 11/06/2026**, contra los PRDs v1.13 / v1.7 / v1.11 / v1.10.
> Las specs internas consolidadas viven en `docs/prd/` (empezar por `docs/prd/00-indice.md`).

---

## ✅ Resueltos por los PRDs de junio 2026 (ex-gates)

Los 3 CRITs históricos quedaron **cerrados**. La regla vigente está en las specs:

| Ex-gate | Resolución | Spec |
|---|---|---|
| **CRIT-01** Flujo de pago Colegio cliente (NEA) | Vía agencia **sin** excepción presencial: TODOS los pagos por agencia → **B2 = N/A**. Independiente/Instituto: vía agencia + último pago presencial (B2 activo). JUK (directo): directo, B2 = N/A. | `docs/prd/01` y `02` (M4/M6-B) |
| **CRIT-02** Pasaporte UK | Validación legal: vencimiento **≥ fecha fin del viaje** (sin 6 meses extra). Otros países: 6 meses post-fin, configurable. Alerta conservadora del dashboard: 6 meses post-**inicio**. | `docs/prd/01` |
| **CRIT-03** Psicofísico | **Del alumno** (M6, paso D2). Aplica a viajes Grupales con GL; N/A para Individuales. Police checks de GLs = M7 Paso 5 (tabla propia, argentina.gob.ar, 30 días antes). | `docs/prd/02` (M6-D2, M7-P5) |

También cerrados: **MIN-02** (Confirmation Letter y VISA Letter son campos de control de la
config documental del colegio, no un paso 11), **MIN-03** (el hardcode Wimbledon se reemplaza
por `colegio_documento_config`), **MIN-05** (acceso post-viaje del representante: **permanente,
solo lectura, revocable** — PRD Representante v1.10), **TEC-08** (métricas históricas: sí, sin
hard-delete), **TEC-09** (`requiere_test_nivel` ya agregado; queda superseded por la config
documental), **TEC-10** (FK de `group_leaders_viaje` agregada en la migración 0002).

---

## 🚨 Críticos — contradicciones ENTRE los PRDs nuevos (resolver antes de codear esa área)

### CRIT-04 · ¿El representante APRUEBA excursiones o solo SOLICITA cambios?

- **PRD Interno v1.13 (M7 Paso 2 / US-38):** "El representante puede aprobar o rechazar
  excursiones desde su vista del viaje."
- **PRD Representante v1.10:** el representante "no puede aprobar actividades, solo solicitar"
  (solicitudes de cambio con SLA de 7 días).

**Bloquea:** el modelo de `ACTIVIDAD_VIAJE`/`SOLICITUD_CAMBIO` y la UI del Paso 2 del M7.
**Mientras tanto:** codear excursiones con estados `Propuesta/Aprobada/Confirmada/Cancelada` y
auditoría de quién aprobó (admin en nombre del representante ya está cerrado); dejar el
mecanismo de aprobación del representante detrás de la decisión.
**Pregunta para el equipo:** ¿la aprobación de excursiones la hace el representante desde su
portal (US-38) o el flujo es solicitud→aprobación de JUK (PRD Representante)? ¿O ambas?

### CRIT-05 · Moneda del plan de cuotas: ¿USD, GBP o multi-moneda?

- **PRD Modelo de Datos v1.7:** `CUOTA_PAGO.monto` en **USD**.
- **PRD Portal de Familias v1.11:** resumen de pagos en **USD**.
- **Convención del repo (CLAUDE.md):** GBP para montos del viaje, ARS para conceptos locales.
- Absorbe al viejo TEC-01 (multi-moneda con cotización), que sigue sin respuesta de Felix.

**Bloquea:** schema de cuotas (B1/B2), resumen de pagos, alertas de mora con montos.
**Pregunta para Felix:** ¿en qué moneda se ACUERDA el plan de pagos hoy (USD nominal / ARS al
día / GBP)? ¿Hace falta registrar cotización? La respuesta define `moneda` + `monto` +
`cotizacion_aplicada`.

---

## 🔶 Menores — clarificar, no bloquean

### MIN-01 · Versión del Parental Consent: ¿edad al inicio del viaje o al descargar?

Sigue la inconsistencia: Interno v1.13 (A3/US-28) calcula la versión por **edad al inicio del
viaje**; Familias mantiene "versión al momento de la descarga". Además el M3 tiene **un solo
archivo** de Parental Consent pero A3 habla de **dos versiones** (<16 / 16-17) — ¿el colegio
sube dos archivos o uno? **Recomendación:** versión por edad al inicio + dos archivos cuando el
colegio tenga ambas versiones. Confirmar con María.

### MIN-04 · Diario: ¿quién publica cuando hay varios GLs?

v1.10 acota: 1 entrada/día por viaje, editable 24h. Falta definir: con 2+ GLs, ¿publica solo el
principal (`es_principal`) o cualquiera? ¿La entrada se firma con el nombre del GL?

### MIN-06 · ¿Qué pasos son "obligatorios" para las alertas de viaje próximo?

El panel de alertas usa "paso obligatorio en Pendiente" (<7 días) y "documentos faltantes"
(<3 meses), pero ningún PRD define el subconjunto "obligatorio". **Recomendación:** obligatorio
= todo paso activo no-N/A excepto los marcados Opcional por la config del colegio. Confirmar.

### MIN-07 · Identidad de la cuenta del Portal de Familias: ¿email del Tutor 1 o DNI del alumno?

Contradicción directa entre PRDs: el **Interno v1.13 (US-19b)** dice "usuario = email del
Tutor 1"; el **Modelo v1.7** y **Familias v1.11** dicen "usuario = DNI del alumno". Además
Better-Auth está armado sobre email, y "1 alumno = 1 cuenta" convive con la regla de soportar
N alumnos por grupo familiar (11.7). **Recomendación:** email del Tutor 1 como identidad de
auth + DNI del alumno como selector/username secundario. Confirmar con el equipo antes de
construir credenciales (US-19b) o el portal.

### MIN-08 · Acceso post-viaje de FAMILIAS: ¿cuánto dura?

El PRD Familias lo deja sin decidir (recomendado interno: 2 años + descarga ZIP). El del
representante ya quedó permanente. Definir retención por tipo de cuenta.

### MIN-09 · Email emisor de recordatorios: ¿info@ o noreply@?

Pregunta abierta oficial del PRD Interno (M6). Decisión técnica nuestra → proponer:
transaccionales/recordatorios desde `noreply@`, comunicaciones con respuesta esperada desde
`info@`. Confirmar con el equipo y cerrar.

### MIN-11 · Defaults de la config documental por colegio

El Interno v1.13 (US-05b) dice que **todo documento defaultea a "Opcional"**; el Modelo v1.7
da defaults por documento (App Form: Requerido, Test de Nivel: NA, Parental Consent: NA,
Confirmation Letter: Requerido, VISA/Immigration: Requerido) — ninguno coincide.
**Recomendación:** los defaults por documento del Modelo (reflejan la operación real) y
documentar la corrección en el PRD Interno. Confirmar.

### MIN-12 · ¿A qué viajes se puede asignar un alumno desde su perfil?

El Interno v1.13 se contradice solo: US-16 dice "dropdown **solo** con viajes en Inscripción
abierta", pero US-11 permite altas/bajas en Inscripción abierta **y Confirmado**, y los viajes
Individuales **nacen en Confirmado** (US-10b) — con la regla de US-16 serían inasignables.
**Recomendación:** el dropdown incluye viajes en Inscripción abierta y Confirmado con vacantes.

### MIN-13 · Semántica de "Opcional" en la config documental

Para un documento configurado **Opcional**: el Interno v1.13 activa el paso (solo "N/A" lo
desactiva); Familias v1.11 (§1.5) lo trata como N/A/oculto ("activo solo con Requerido").
Cambia qué ve la familia y qué cuenta para la completitud del viaje. **Recomendación:**
Opcional = paso activo pero excluido del cálculo de completitud y de las alertas de
"obligatorios" (conecta con MIN-06). Confirmar.

### MIN-14 · ¿Quién determina si C1 (ETA) aplica: el país del viaje o el colegio?

Interno v1.13 (US-31): "el campo país destino **del viaje** determina si C1 está activo".
Modelo v1.7 (RV-C1): lo determina `COLEGIO_DESTINO.tipo_entrada_requerida` (ETA|VISA|Ninguna).
Mismo resultado en la práctica (el colegio está en un país), distinto dueño de la regla.
**Recomendación:** `tipo_entrada_requerida` en el colegio, con default derivado de su país —
más configurable y compatible con ambos textos. Confirmar y unificar los PRDs.

### MIN-15 · Datos de facturación del alumno: ¿se eliminaron o no?

El changelog del Interno dice "ELIMINADO en v1.2 (per Felix)", pero el propio Interno v1.13
(US-15: "datos de facturación visibles solo para admins") y el Modelo v1.7 (campos
`cuil_cuit`/`razon_social`/`condicion_fiscal` + RV-20) los conservan. El schema actual los
tiene. **Recomendación:** conservarlos (visibles solo Admin); pedir a producto que limpie el
changelog o las US.

### MIN-10 · Precio por alumno / cálculo del precio final

Abierta en el PRD (M4): si v1 registra precio por alumno y/o calcula el precio final con las 3
capas de comisión (María: "a veces las comisiones son el precio final, a veces no"). También
falta el campo "precio por semana" para Individuales que el PRD da por cerrado pero no incluyó.
**No bloquea** mientras las comisiones sigan siendo referencia interna.

---

## ⚙️ Técnicos — los decide el dev, documentar al resolver

- **TEC-02 · Storage R2:** los PRDs siguen sin formalizar firma de URLs, retención ni límites
  (solo "PDF/DOCX máx. 10 MB" en M3). El scaffold asume R2 — documentar al construir uploads.
- **TEC-03 · Soft-delete unificado:** sigue vigente (estado ENUM, no `activo BOOLEAN`).
  El Modelo v1.7 todavía usa `activo` en cuentas — mantener nuestra convención y mapear.
- **TEC-04 · Tabla `configuracion`:** ahora con casos reales: día/horario del resumen semanal,
  umbrales de alerta por país (pasaporte), contenido post-rechazo de ETA. Crearla en el primer
  caso que se implemente.
- **TEC-05 · Reglas del canal de mensajes:** v1.11 ya define comentarios de 280 chars sin
  moderación previa y eliminación por el GL; queda definir límites de mensajes directos y
  acceso de auditoría de JUK.
- **TEC-06 · Tabla `notificacion_enviada`:** imprescindible para los recordatorios escalonados
  (14/7/3/1 y 90/60/30) con dedup `(tipo, entidad_id, fecha)`. Construir junto con Trigger.dev.
- **TEC-07 · Importer de planillas:** sin cambios — definir con Tomas/María antes del go-live.
- **TEC-11 · Desfasajes del Modelo v1.7 vs. el PRD Interno v1.13** (en todos manda el
  Interno, que es más nuevo; avisar a producto para que corrija el Modelo):
  (a) glosario dice `Directo_JUK` = Colegio cliente, contradiciendo RV-05 y el Interno.
  (b) §4.7 dice "10 registros" de pasos pero define 11 (incluye Paso 0); valen 11.
  (c) RV-10 exige estado "Confirmado" en PASO_VIAJE que el ENUM no tiene; es el sub-estado
  "Confirmado" de Pasajes.
  (d) al ENUM de `PASO_INSCRIPCION.estado` le falta **Vencido** (A1 lo requiere).
  (e) ESTUDIANTE con 4 estados (`Pre-inscripto|Activo|Baja|Pausado`) vs. los 6 del Interno
  (`Pre-inscripto|Inscripto|Activo|Viajando|Finalizado|Baja`); valen los 6 (decidir si
  `Pausado` se suma como 7°).
  (f) POLICE_CHECK modelado por **representante** × viaje; el Interno (US-41) lo exige por
  **cada GL físico** del viaje — vale por GL (la impl. actual ya va por ahí).
  (g) estados del police check: Interno `Pendiente|En trámite|Aprobado|Vencido` vs. Modelo
  `Pendiente|Aprobado|Vencido|Rechazado`; implementar la unión (con `en_tramite` y `rechazado`).
  (h) a CUOTA_PAGO le falta el campo **canal** ('Vía agencia'|'Presencial JUK') que B1/B2 del
  Interno requieren.
  (i) RV-14 (desactivación del representante a los 30 días post-viaje) quedó **superseded**
  por el PRD Representante v1.10: acceso permanente, solo lectura, revocable (ex MIN-05).
  (j) RV-17 trata la alerta de pasaporte "6 meses post-inicio" como ALTA y solo fuera de UK;
  el Interno la define CRÍTICA y general (criterio conservador) — vale el Interno.
  (k) estado de colegio `En_negociacion` solo existe en el Modelo; el Interno tiene
  Activo|Inactivo. Adoptarlo como extra es barato; decidir al implementar.
  (l) estado intermedio del ETA: "En trámite" (Interno) = "En_procesamiento" (Modelo y
  Familias). Canónico en el código: `en_tramite`.
  (m) `config_visa_immigration` del Modelo "afecta la inicialización de C2"; según el Interno
  (US-05b y ex MIN-02) Confirmation Letter y VISA/Immigration Letter son **campos de
  control**, no condiciones de N/A — C2 depende solo de B1.

---

## Cómo usar este documento

1. Antes de codear un área sensible: `/juk-gate <área>` (lee este archivo).
2. Cerrada una decisión: mover el ítem a "Resueltos" con la referencia a la spec actualizada.
3. Nueva contradicción/ambigüedad entre PRDs: sumarla acá Y marcarla `> ⚠️ AMBIGUO:` en la
   spec correspondiente de `docs/prd/`.

*Generado del cruce de los 4 PRDs (jun 2026) + specs internas `docs/prd/` + estado del código.*
