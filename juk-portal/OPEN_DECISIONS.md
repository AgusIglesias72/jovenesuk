# Decisiones — JUK Portal

Registro de lo que hay que decidir (y de lo que ya se decidió) sobre reglas de negocio y
técnicas del portal. Es la única fuente: las specs de `docs/prd/` y el código **citan** estos
códigos (MIN-xx, TEC-xx, CRIT-xx), no copian la decisión.

> **Última actualización: 11/09/2026** (cierre del programa de adecuación de septiembre), contra
> los PRDs v1.13 / v1.7 / v1.11 / v1.10 y el código de `main` hasta `0b73eaf`.
> Specs: [`docs/prd/00-indice.md`](docs/prd/00-indice.md) · gap vigente:
> [`docs/prd/06-deltas-implementacion.md`](docs/prd/06-deltas-implementacion.md) · el porqué
> técnico: [`docs/architecture.md`](docs/architecture.md).

## Cómo se usa

1. **Antes de codear un área sensible:** `/juk-gate <área>`. Una decisión **abierta** bloquea
   solo si tu cambio toca justo ese comportamiento. Las ⭐ se codean, pero acotadas y fáciles de
   revertir.
2. **Te surgió una duda de producto mientras codeabas:** agregala acá como abierta, con contexto,
   opciones y **qué hace hoy el código** (con el archivo). No la resuelvas inventando una regla.
3. **Se cerró una decisión:** pasala a "Resueltas" con fecha, quién decidió y el archivo que la
   implementa, actualizá la spec de `docs/prd/` que corresponda y sumá la línea en `CHANGELOG.md`
   (*Sin publicar*); si cambia qué está construido, también `docs/estado-actual.md`. La regla
   completa es la **Regla de sincronía** del `CLAUDE.md` de la raíz del workspace.
4. **Contradicción nueva entre PRDs:** sumala acá y marcala con `> ⚠️` en la spec.
5. **⭐** = decidida por Agustín, falta validarla con María/Felix. Si el equipo decide distinto,
   el cambio está acotado al punto que se indica.

Prefijos: **CRIT** = bloqueaba un módulo (hoy no queda ninguno abierto) · **MIN** = regla de
producto · **TEC** = decisión técnica del dev.

---

## 🔶 Abiertas — producto

Ninguna bloquea lo que ya está construido. Cada una dice qué hace hoy el código, que es la
asunción de trabajo mientras no se decida.

### MIN-01 · Parental Consent: ¿versión por edad al inicio del viaje o al descargar?

- **Contexto:** el Interno v1.13 (US-28) la define por **edad al inicio del viaje**; Familias y el
  Modelo (RV-11), por **edad al momento de la descarga**. Además el colegio tiene un solo archivo
  de PC y A3 distingue dos versiones (<16 y 16–17).
- **Opciones:** (a) edad al inicio + el colegio sube las dos versiones; (b) edad al descargar,
  guardando en el log la versión descargada.
- **Hoy:** `versionParentalConsent` (`src/lib/domain/pasos/inicializacion.ts`) calcula por edad al
  inicio y la guarda en `metadata.version` de A3; el tablero la muestra. El colegio no tiene carga
  de archivos (gap en 06 §B·M3).

### MIN-04 · Diario de viaje con varios GLs: ¿quién publica?

- **Contexto:** una entrada por día por viaje, editable 24 h (Representante v1.10). Con 2+ GLs no
  está definido si publica solo el principal ni cómo se firma.
- **Opciones:** (a) solo el GL principal (`group_leaders_viaje.es_principal`); (b) cualquier GL
  del viaje, firmado con su nombre.
- **Hoy:** el diario no existe. Impacta recién en la Vista del Representante.

### MIN-08 · Acceso post-viaje de las familias: ¿cuánto dura?

- **Contexto:** el PRD no lo decide (recomendación interna: 2 años + descarga en ZIP). El del
  representante ya es permanente (MIN-05).
- **Hoy:** la cuenta de familia sigue activa hasta que se da de baja al último alumno activo del
  grupo familiar (`desactivarCuentaFamiliaSiCorresponde`, `src/lib/db/queries/familias.ts`: si
  queda un hermano sin baja, la cuenta no se desactiva). No hay cierre por fecha ni descarga
  masiva.

### MIN-10 · Precio por alumno / cálculo del precio final

- **Contexto:** abierta en el PRD (M4). Falta también el "precio por semana" de los Individuales.
- **Hoy:** v1 no calcula precios. El viaje guarda comisión de agencia y fee del representante como
  referencia interna, visibles solo para admins (`src/lib/db/schema/viajes.ts`).

### MIN-16 · Privacidad de los datos de leads (web pública)

- **Contexto:** el formulario de consulta guarda datos personales, incluso de menores ("para mi
  hijo/a"). Aplica la Ley 25.326.
- **Opciones:** (a) página de Política de Privacidad linkeada desde el checkbox y el footer +
  retención definida (con purga automática) + acción de borrar una consulta o un suscriptor a
  pedido; (b) solo la página y borrado manual a pedido.
- **Hoy (16/09/2026): parcialmente resuelta por la opción (a).** Ya está publicada y versionada la
  página `/privacidad` (`src/app/(public)/privacidad/`, texto en
  `src/lib/domain/privacidad/politica.ts`), el checkbox del formulario la linkea con el texto de
  `TEXTO_CONSENTIMIENTO`, y los plazos de retención están definidos y testeados en
  `src/lib/domain/privacidad/retencion.ts` (90 días una inscripción procesada, 730 sin procesar, 90
  una invitación vencida sin usar).
- **Cerrada para las inscripciones (17/09/2026):** la purga por retención existe
  (`src/lib/jobs/purgar-inscripciones.ts`, `npm run job:purga`) y el borrado a pedido también
  (super_admin, con motivo y auditoría). Las dos dejan el talón de la fila para no falsear las
  estadísticas de campañas viejas.
- **Lo que sigue abierto:** el mismo borrado a pedido sobre `consultas` y `suscriptores`, que siguen
  sin pantalla ni acción (`/consultas` solo cambia el estado); que la purga corra **sola** (hoy es a
  mano: Trigger.dev no está desplegado); y la retención de la ficha del **alumno** ya procesado y de
  sus documentos, que no tienen plazo (TEC-02). La política publicada dice exactamente eso, para no
  prometer lo que el código no hace. Falta además la revisión legal del texto
  (ver `docs/estado-actual.md` §7).

### MIN-17 · ¿Un paso "Opcional" cuenta para el filtro "paso pendiente"?

- **Contexto:** MIN-13 dice que un paso Opcional está activo pero no cuenta para la completitud
  ni para las alertas de obligatorios. No dice nada del filtro de `/alumnos` (US-17).
- **Opciones:** (a) incluirlos; (b) excluir los que tienen `metadata.opcional`; (c) incluirlos
  con una marca "opcional" en la fila.
- **Hoy:** (a). El filtro trae todo paso con estado distinto de `completado` y `na`
  (`src/lib/db/queries/alumnos.ts`).

### MIN-18 · Al desbloquear un paso del M6, ¿se limpia el motivo del bloqueo?

- **Contexto:** bloquear exige un motivo (`transicionRequiereNota`, `src/lib/domain/pasos/estados.ts`).
- **Opciones:** (a) conservarlo; (b) limpiarlo al salir de Bloqueado (el historial ya queda en
  auditoría, que guarda la nota); (c) conservarlo con una marca "resuelto".
- **Hoy:** (a). `transicionarPasoAlumnoAction` (`src/app/(admin)/alumnos/[id]/pasos-actions.ts`)
  solo toca `notas` cuando llega una nota nueva.

### MIN-19 · Transfers depende de Pasajes: ¿"al menos Confirmado" o Completado?

- **Contexto:** el Interno (M7 Paso 3) y RV-10 dicen "Pasajes al menos en Confirmado", que es un
  **sub-estado** de Pasajes Grupal (TEC-11.c), no un estado del paso.
- **Opciones:** (a) exigir Pasajes Completado; (b) aceptar el sub-estado `confirmado` o `emitido`
  (Grupal) y `datos_recibidos` (Individual) aunque el paso no esté Completado.
- **Hoy:** (a), más estricto. `dependenciaPendiente` (`src/lib/domain/pasos-viaje/estados.ts`)
  exige `completado`, y se aplica igual en el selector, en la action y al marcar cobertura por
  alumno. Pasar a (b) es cambiar esa función para que reciba la metadata de Pasajes.

### MIN-20 · Excursiones guardadas como "pagada" en la primera versión del M7

- **Contexto:** la primera versión guardaba `reservada` y `pagada`; el PRD define Propuesta /
  Aprobada por representante / Confirmada / Cancelada.
- **Opciones:** (a) aceptar la pérdida (el pago de excursiones no es parte del PRD); (b) agregar
  un flag `pagada` por excursión y traducir el legacy a `confirmada` + `pagada: true`.
- **Hoy:** `EXCURSION_ESTADO_LEGACY` (`src/lib/domain/pasos-viaje/metadata.ts`) traduce las dos a
  `confirmada` al leer y al guardar, sin migración SQL para que sea revertible mientras CRIT-04
  siga ⭐. El dato "ya se pagó" se pierde en el primer guardado.

### MIN-21 · Problema con el ETA: ¿aviso urgente al equipo?

- **Contexto:** Familias US-1.6.5 pide "alerta crítica inmediata (urgente)" en el panel interno, y
  US-1.7.4/5 suma mail/WhatsApp y un aviso extra con viaje a <30 días.
- **Opciones:** (a) alcanza con el dashboard; (b) mail inmediato al equipo (como el reporte de
  dato incorrecto); (c) mail + WhatsApp (no hay infraestructura de WhatsApp).
- **Hoy:** `reportarEtaFamiliaAction` (`src/app/familias/_actions.ts`) deja C1 Bloqueado con el tipo
  de problema y el comentario, y lo audita. El dashboard lo muestra como alerta **crítica** la
  próxima vez que alguien lo abre (`alertasPasosBloqueados`). No sale ningún aviso.

### MIN-22 · Preguntas frecuentes del Portal de Familias no editables

- **Contexto:** Familias US-10.2 pide FAQs actualizables por JUK desde el panel interno y un
  buscador.
- **Opciones:** (a) seguir en código hasta que haya volumen de cambios; (b) una clave en
  `configuracion` con editor en `/configuracion` (mismo patrón que los mails); (c) un gestor de
  contenido general para FAQ, orientación ante rechazo de ETA, medios de pago y guía del destino,
  que otras US también piden.
- **Hoy:** (a). El contenido vive en `src/app/familias/[dni]/ayuda/faq.ts`: cambiar una respuesta
  es un deploy. No hay buscador.

### MIN-23 · Calendario de salidas grupales del sitio público mantenido a mano

- **Contexto:** el sitio anuncia la próxima salida grupal (dos por año, febrero y julio).
- **Opciones:** (a) seguir a mano; (b) un flag "publicado en la web" en `viajes` y derivarlo de
  ahí; (c) una clave editable en `configuracion`.
- **Hoy:** (a). `SALIDAS_GRUPALES` (`src/lib/domain/salidas/proxima-salida.ts`) llega hasta
  **julio 2028**. Cuando se agota, el banner desaparece en vez de mostrar una fecha vencida.
  Alguien tiene que extenderlo antes de agosto 2028.

### MIN-24 · Reactivar un alumno, ¿reactiva su cuenta de familia?

- **Contexto:** la baja desactiva la cuenta de familia si no quedan hermanos activos (US-19b).
- **Opciones:** (a) reactivar la cuenta junto con el alumno; (b) dejarla desactivada y mostrar un
  aviso en la ficha para reenviar el acceso.
- **Hoy:** `reactivarAlumno` (`src/lib/db/queries/alumnos.ts`) solo vuelve el alumno a Activo; la
  cuenta de familia queda desactivada.

### MIN-25 · Autoreporte del ETA: ¿la familia puede aprobarlo o volverlo atrás?

- **Contexto:** Familias US-1.5 define el ETA como autoreporte que JUK puede corregir, sin decir si
  "Aprobado" requiere revisión.
- **Opciones:** (a) mantener; (b) el "aprobado" de la familia deja C1 En progreso hasta que un
  admin lo confirme; (c) impedir que la familia retroceda un C1 Aprobado.
- **Hoy:** `reportarEtaFamiliaAction` (`src/app/familias/_actions.ts`) acepta cualquier
  sub-estado. La familia puede marcar Aprobado (C1 pasa a Completado sin revisión) y puede volver
  un Aprobado a Pendiente. Además, cuando lo marca Aprobado no setea `fechaCompletado` (la action
  del admin, `actualizarSubEstadoPasoAction`, sí): queda un paso Completado sin fecha, otro dato a
  favor de (b).

### MIN-26 · ¿El admin puede fijar a mano el estado de C1 y A3?

- **Contexto:** el estado de C1 (ETA) y A3 (Parental Consent) se deriva de su sub-estado
  (`estadoPasoDesdeEta`, `estadoPasoDesdePc` en `src/lib/domain/pasos/sub-estados.ts`).
- **Opciones:** (a) cerrar el hueco en el server: que `puedeTransicionarPasoAlumno` trate C1 y A3
  como B1/B2 y solo se muevan por sub-estado; (b) permitirlo y resincronizar el sub-estado;
  (c) mantener.
- **Hoy:** (c). En la UI ya se comportan como derivados: `tablero-m6.tsx`
  (`src/app/(admin)/alumnos/[id]/`) oculta el selector general en C1/A3 y muestra solo el del
  trámite. Pero `transicionarPasoAlumnoAction` (`pasos-actions.ts`, misma carpeta) no los rechaza,
  porque `puedeTransicionarPasoAlumno` (`src/lib/domain/pasos/estados.ts`) excluye Paso 0 y B1/B2
  pero no C1 ni A3: un llamado directo a la action puede fijar el estado y dejarlo desalineado del
  sub-estado.

### MIN-27 · Reinscribir en un viaje una asignación cancelada: ¿qué pasa con las cuotas?

- **Contexto:** RV-16 manda reactivar el mismo registro. El PRD dice que la reasignación resetea
  los pasos, pero no habla del plan de cuotas.
- **Opciones:** (a) conservar el plan y sus pagos (plata ya registrada) con aviso para revisar;
  (b) borrar el plan y empezar de cero; (c) preguntarle al admin al reinscribir.
- **Hoy:** `asignarConTablero` (`src/lib/db/queries/asignar-alumno.ts`) reactiva la fila, borra y
  regenera los pasos, y no toca `cuotas`: el alumno vuelve con el plan anterior.

---

## ⭐ Decididas el 11/06/2026, pendientes de validar con el equipo

Siguen en la tabla de Resueltas (abajo), con dónde vive cada una en el código:

- **CRIT-04 · Excursiones:** aprueba el representante. Código: el estado
  `aprobada_representante` en `EXCURSION_ESTADOS` (`src/lib/domain/pasos-viaje/metadata.ts`).
  Como la Vista del Representante no existe, hoy el admin carga ese estado.
- **CRIT-05 · Moneda de cuotas:** multi-moneda, default USD. Código: enum `moneda_cuota` y
  `cotizacion_aplicada` (`src/lib/db/schema/cuotas.ts`), símbolos y validación en
  `src/lib/domain/cuotas/schema.ts`.

---

## ⚙️ Abiertas — técnicas

### TEC-03 · Soft-delete unificado

Convención: estado ENUM en las tablas propias. Hoy conviven `alumnos.estado = 'baja'`,
`colegios.estado = 'inactivo'`, `asignaciones.estado = 'cancelada'`, `prospectos.estado = 'perdido'`
y `users.is_active` (booleano, porque la tabla es de Better-Auth). El Modelo v1.7 usa `activo` en
las cuentas: se mapea, no se copia.

### TEC-05 · Reglas del canal de mensajes

Comentarios de 280 caracteres sin moderación previa (Familias v1.11). Falta definir límites de
mensajes directos y cómo audita JUK. Sin construir: depende del diario y la mensajería.

### TEC-07 · Importer de planillas

Definir con Tomas/María antes del go-live. Hoy solo existe el importador CSV de prospectos
(`src/lib/domain/prospectos/csv.ts`); no hay importación de alumnos ni de viajes.

### TEC-11 · Desfasajes del Modelo v1.7 vs. el PRD Interno v1.13

Manda el Interno; hay que avisar a producto para que corrija el Modelo:
(a) glosario de Directo_JUK desactualizado · (b) son 11 pasos, no 10 · (c) el "Confirmado" de
RV-10 es un sub-estado de Pasajes (ver MIN-19) · (d) falta el estado **Vencido** de A1 (el código
ya lo tiene) · (e) el alumno tiene los 6 estados del Interno · (f) POLICE_CHECK es por **GL
físico**, no por representante (el código ya lo modela así) · (g) estados del police check: el PRD
une `pendiente|en_tramite|aprobado|rechazado|vencido`; el código tiene todos menos `rechazado` ·
(h) la cuota necesita **canal** (el código ya lo tiene) · (i) RV-14 quedó superada (acceso
permanente del representante) · (j) la alerta de pasaporte es CRÍTICA y general · (k)
`En_negociacion` en el colegio, opcional · (l) el "En trámite" del ETA es `en_tramite` en el
código · (m) `config_visa_immigration` no inicializa C2 (es campo de control).

### TEC-12 · El DNI con puntos no se normaliza

El DNI es el slug de `/alumnos/[dni]` y la clave de idempotencia del webhook. Ni el schema del
webhook (`src/app/api/webhooks/google-form/route.ts`) ni el del dominio
(`src/lib/domain/alumnos/schema.ts`) lo normalizan; solo lo hace el formulario del back-office, en
el cliente (`soloDigitos` en `src/app/(admin)/alumnos/alumno-form.tsx`). Un `45.102.338` que llega
por el Google Form (o por cualquier alta que no pase por ese form) se guarda con puntos, rompe el
slug y no deduplica contra `45102338`. Opciones: normalizar con
`soloDigitos` (`src/lib/utils/dni.ts`) en el schema de dominio y migrar los datos existentes, o
rechazar el valor con puntos.

### TEC-13 · Unicidad de la última cuota solo en la query

RV-22 pide un unique parcial "una sola última cuota por asignación". Hoy `es_ultima_cuota` es un
integer 0/1 sin constraint (`src/lib/db/schema/cuotas.ts`) y la unicidad la sostiene la query que
arma el plan. Opción: pasarlo a booleano y agregar `UNIQUE (asignacion_id) WHERE es_ultima_cuota`
en una migración.

### TEC-14 · Un recordatorio que falla no se reintenta

`scanRecordatorios` (`src/lib/jobs/scan-recordatorios.ts`) registra la ocurrencia en
`notificaciones_enviadas` **antes** de enviar (es el candado de dedup). Si Resend falla, la fila
queda como `failed` pero ya existe: la corrida siguiente no la reintenta y la clave del día
("7d") no vuelve a coincidir. Opciones: reintentar con backoff dentro de la misma task, o dejar
que una fila `failed` se reintente en la próxima corrida.

Misma causa, otro efecto: la corrida manual `run-reminder-scan` con `enviarEmails: false` (el
"dry-run" de `src/trigger/reminders.ts`) también inserta la fila antes de mirar el flag. Un ensayo
en producción consume el candado y los recordatorios de ese día **ya no salen**. Mientras no se
resuelva, ese modo no se usa contra la base de producción.

### TEC-15 · Transición por fecha en dos saltos

`transicionAutomaticaPorFecha` (`src/lib/domain/viajes/transiciones.ts`) devuelve un solo salto
por corrida: un viaje Confirmado con fecha de fin ya pasada pasa a En curso hoy y a Finalizado
mañana. Opción: aplicar transiciones hasta estabilizar en la misma corrida
(`src/lib/jobs/transiciones-viajes.ts`).

### TEC-16 · Tabla `alertas`: materializar o borrar

La tabla existe (`src/lib/db/schema/alertas.ts`) pero nada la lee ni la escribe: las alertas se
calculan en cada request con reglas puras. Materializarla habilita "descartar por la sesión" e
historial (US-DX-01); si no, conviene sacarla del schema para que no confunda.

---

## ✅ Resueltas

### Por los PRDs de junio 2026 (ex-gates históricos)

| Ex-gate | Resolución | Spec |
|---|---|---|
| **CRIT-01** Flujo de pago Colegio cliente (NEA) | Vía agencia **sin** excepción presencial → **B2 = N/A**. Independiente/Instituto: vía agencia + B2 presencial. JUK (directo): directo, B2 = N/A. Código: `src/lib/domain/viajes/flujo-pago.ts`. | `docs/prd/01` y `02` |
| **CRIT-02** Pasaporte UK | Vencimiento **≥ fecha fin del viaje** (sin 6 meses extra). Otros países: 6 meses post-fin. Alerta conservadora del dashboard: 6 meses post-inicio, CRÍTICA. Código: `src/lib/domain/asignaciones/validate-passport.ts`. | `docs/prd/01` |
| **CRIT-03** Psicofísico | **Del alumno** (D2), viajes Grupales con GL; N/A en Individuales. Police checks de GLs = M7 Paso 5. Código: `pasosIniciales` en `src/lib/domain/pasos/inicializacion.ts`. | `docs/prd/02` |

También: **MIN-02** (Confirmation/VISA Letter = campos de control, no paso 11), **MIN-03** (la
config documental reemplaza el hardcode de Wimbledon), **MIN-05** (acceso post-viaje del
representante: permanente, read-only, revocable), **TEC-01** (absorbido por CRIT-05),
**TEC-08/09/10** (métricas históricas sí; `requiere_test_nivel` superado; FK agregada).

### Por decisión del 11/06/2026 (Agustín) — ⭐ = validar con María/Felix

| Ítem | Decisión | Dónde vive |
|---|---|---|
| **CRIT-04** Excursiones ⭐ | **El representante aprueba/rechaza desde su vista** (Interno US-38); el admin puede aprobar en su nombre con nota (la nota todavía no está implementada: `excursionItemSchema` no tiene ese campo). Las solicitudes de cambio (SLA 7 días) son un mecanismo adicional, no reemplazan la aprobación. | `src/lib/domain/pasos-viaje/metadata.ts` |
| **CRIT-05** Moneda de cuotas ⭐ | **Multi-moneda**: `moneda` (`USD\|GBP\|ARS`) + `monto` + cotización opcional. **Default USD**. Confirmar con Felix cómo se acuerdan los planes. | `src/lib/db/schema/cuotas.ts`, `src/lib/domain/cuotas/schema.ts` |
| **MIN-07** Identidad de la cuenta de familias | **Email del Tutor 1** como identidad (Better-Auth) + **DNI del alumno como selector**; N alumnos por grupo familiar con una cuenta. | `src/lib/db/queries/familias.ts`, `src/lib/domain/familias/vinculo.ts`, `src/app/familias/page.tsx` |
| **MIN-11** Defaults de la config documental | **Por documento (Modelo v1.7)**: App Form Requerido · Test de Nivel N/A · Parental Consent N/A · Confirmation Letter Requerido · VISA/Immigration Requerido. | `src/lib/domain/colegios/documentos.ts` |
| **MIN-12** Dropdown de asignación | **Inscripción abierta + Confirmado.** El "con vacantes" no se aplica como filtro: un viaje lleno aparece marcado "completo" y asignarlo pide confirmación (US-11: advierte, no bloquea). | `viajesAsignables` en `src/lib/db/queries/asignaciones.ts`, `src/app/(admin)/alumnos/[id]/asignar-viaje.ts`, `src/lib/actions/asignaciones.ts` |
| **MIN-13** Semántica de "Opcional" | **Paso activo pero NO cuenta** para % de completitud ni alertas de obligatorios. | `cuentaParaCompletitud` en `src/lib/domain/pasos/estados.ts` |
| **MIN-06** "Paso obligatorio" | Paso activo con config **Requerido** (o sin config: B1, C2, D1). Excluye Opcional y N/A. | ídem |
| **MIN-14** Regla de C1/ETA | **`tipo_entrada_requerida` (ETA\|VISA\|Ninguna) en el colegio destino**, con default por país. | `src/lib/db/schema/colegios.ts`, `src/lib/domain/colegios/documentos.ts` |
| **MIN-15** Facturación del alumno | **Se conserva**; visible solo para admins. Pedir a producto que limpie el changelog del Interno. | `alumnos.facturacion`, sección plegable en `alumno-form.tsx` |

### MIN-09 · Remitente de los mails (12/06/2026, operativo)

Automáticos (recordatorios, reset, avisos) desde `noreply@`; comunicaciones con respuesta
esperada (credenciales, cancelaciones) desde `info@`; outreach comercial desde el subdominio de
marketing. Los remitentes se editan en `/configuracion` (solo super_admin), con envío de prueba.
Código: `src/lib/domain/configuracion/index.ts`, `remitenteDe` en `src/lib/email/index.ts`.

### Técnicas resueltas en código

| Ítem | Resolución | Dónde vive |
|---|---|---|
| **TEC-02** Storage de documentos | R2 privado: nunca hay URL pública, todo se sirve por `/api/uploads/<key>` con sesión y dueño verificado; tipo validado por magic bytes; máximo 10 MB; sin R2 en producción falla explícito (cuenta como producción `NODE_ENV=production` **o** cualquier deploy de Vercel, previews incluidos). Ver [ADR-011](docs/architecture.md#adr-011--documentos-privados-vía-apiuploads-sept-2026). **Queda sin definir:** retención y borrado de documentos (hoy no se borran; `documentos` no tiene FK). | `src/lib/storage/index.ts`, `src/app/api/uploads/[...key]/route.ts`, `src/lib/domain/documentos/index.ts` |
| **TEC-04** Tabla `configuracion` | Key-value con valor JSON validado en dominio; una clave ausente usa los defaults del código. Hoy existe la clave `mails`. Casos del PRD sin clave todavía: resumen semanal, umbrales por país, orientación ante rechazo de ETA. | `src/lib/db/schema/configuracion.ts` (migración 0014), `src/lib/db/queries/configuracion.ts` |
| **TEC-06** Registro de notificaciones enviadas | `notificaciones_enviadas` con unique `(tipo, entidad_id, clave)` como candado de dedup; lo usa el scan diario de recordatorios. Reintentos: TEC-14. | `src/lib/db/schema/notificaciones.ts` (migración 0012), `src/lib/jobs/scan-recordatorios.ts`, `src/trigger/reminders.ts` |
| Lockout de login (US-01) | Aproximación aceptada: rate limit de Better-Auth en base, 5 intentos cada 15 minutos en producción sobre `/sign-in/email`. Cuenta **intentos**, no solo fallidos (la librería no expone un hook de login fallido). | `src/lib/auth/index.ts` |
| Contraseñas temporales por mail (US-03, US-19b) | Reemplazadas por un **link para crear la contraseña** (08/09/2026). Ver [ADR-017](docs/architecture.md#adr-017--accesos-por-link-no-contraseñas-temporales-sept-2026). | `src/lib/auth/index.ts`, `src/app/(admin)/usuarios/actions.ts`, `src/app/(admin)/alumnos/actions.ts` |
| Captcha en los formularios públicos | **Sin captcha** (08/09/2026): honeypot + rate limit propio por IP y por email. Ver [ADR-012](docs/architecture.md#adr-012--rate-limit-propio-para-formularios-públicos-sept-2026). | `src/lib/domain/anti-abuso.ts` |
| Design Lab `/design` y playground `/tests` | **Retirados** (08/09/2026). Ver [ADR-015](docs/architecture.md#adr-015--retiro-del-design-lab-y-del-playground-tests-sept-2026). | tag `design-lab-final` |
