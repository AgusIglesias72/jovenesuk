# Decisiones pendientes — JUK Portal

Lista accionable de lo que tenés que cerrar con el equipo (mayormente María) **antes** de codear ciertos módulos. Cada item indica qué bloquea y qué hacer mientras tanto.

> Última actualización: mayo 2026. Basado en el análisis de los PRDs v1.3 y el Modelo de Datos v1.1.

---

## 🚨 Críticos — requieren resolución antes de codear

Los 3 puntos que cambian la lógica de negocio del sistema.

### CRIT-01 · Flujo de pagos para Colegio Cliente (NEA)

**El problema:**
- **PRD principal v1.3 (Resumen Ejecutivo):** "Colegio cliente: TODOS los pagos van directamente a JUK (sin agencia externa). El Paso 10 es N/A para estos alumnos."
- **Comentario in-line de María sobre la misma tabla:** "M: colegio todos los pagos en la agencia externa."
- **Tomi comentó en el Modelo de Datos sobre RV-05:** "Tengo dudas con esto si se entiende bien."

Esto es literalmente lo opuesto. Producto modeló "Directo_JUK"; María quizá quiso decir lo contrario.

**Qué bloquea:**
- ❌ Schema de `VIAJE.flujo_pago` y el ENUM correspondiente
- ❌ Módulo de Pagos completo (Paso 2 del M6)
- ❌ Lógica del Paso 10 (Último pago presencial)
- ❌ Cálculo de comisiones (RV-05)

**Qué hacer:**
1. Reunirte con María 15 min con esta pregunta concreta:
   > Para un viaje de NEA (Colegio cliente), ¿las cuotas las paga la familia: (a) directamente a JUK, o (b) a la agencia externa y la agencia le pasa a JUK?

2. Si la respuesta es (a) — el PRD está bien, RV-05 está bien.
3. Si la respuesta es (b) — hay que invertir RV-05, el Paso 10 sigue aplicando para NEA, y ajustar el ENUM `viajeOrigen`.

**Mientras tanto podés codear:** todo lo que NO sea pagos.

---

### CRIT-02 · Validación de pasaporte UK — ¿con 6 meses adicionales o no?

**El problema:**
- **PRD principal §5.6 + RV-01 del Modelo:** "UK NO exige los 6 meses adicionales. Validación: `fecha_vencimiento_pasaporte >= fecha_fin_viaje`."
- **Comentario in-line de María en §2.4 del M2:** "se considera antes de 6 meses posterior a la fecha de inicio del viaje"

Producto puso lo correcto según la web del UK gov (UK efectivamente no exige 6 meses), pero María dice que sí. Posiblemente está confundiendo con la regla genérica de otros países o quiere ser conservadora.

**Qué bloquea:**
- ❌ Función `lib/domain/alumnos/validate-passport.ts`
- ❌ Alertas críticas de pasaporte
- ❌ Validación al asignar alumno a viaje (US-16)

**Qué hacer:**
1. Confirmar con María si quiere la regla estricta UK (sin 6 meses) o conservadora (con 6 meses).
2. Si elige conservadora, documentar como "Política JUK más estricta que el requisito legal" y aplicar RV-02 (la de otros países) también a UK.

**Mientras tanto podés codear:** dejar la validación con un flag `STRICT_UK_RULE = true` que después se cambia con una línea.

---

### CRIT-03 · Paso 9 (Psicofísico) — ¿es del alumno o del Group Leader?

**El problema:**
- **PRD principal §6.11 + Modelo de Datos RV-07:** Paso 9 se activa cuando el viaje tiene Colegio Cliente con flag `requiere_psicofisico`. Es un paso del alumno (vive en `pasos_alumno`).
- **Comentario in-line de María en §6.11:** "M: aplica a todas las salidas con un adulto que acompaña"

Esto sugiere que el psicofísico es del **GL adulto que acompaña**, no del alumno. Si fuese así:
- No es M6 (paso del alumno) sino M7 (paso del viaje).
- Aplica a TODOS los viajes (todos tienen al menos 1 GL), no solo a Colegio cliente.
- El schema `pasos-alumno.ts` no debería tener el tipo `certificado_psicofisico`.

**Qué bloquea:**
- ❌ Tablero de 10 pasos del M6 (US-34 + RV-06, RV-07)
- ❌ Lógica de inicialización del Paso 9 como N/A
- ❌ Estructura del M7 (si hay que sumar un 6to paso del viaje)

**Qué hacer:**
1. Preguntar a María: "El certificado psicofísico, ¿lo presenta el alumno o lo presenta el adulto que acompaña? ¿En qué viajes aplica exactamente?"
2. Si es del GL → mover de `pasos_alumno.ts` a `pasos_viaje.ts`, sumar como paso 6 del M7. Los 10 pasos del M6 pasan a ser 9.
3. Si es del alumno y de TODAS las salidas con GL → mantener en M6 pero cambiar la regla de activación: ya no depende del Colegio Cliente, depende de que el viaje tenga `cantidad_group_leaders >= 1`. Lo que en la práctica significa siempre.

**Mientras tanto podés codear:** los pasos 1-8 del M6 sin tocar el 9.

---

## 🔶 Menores — requieren clarificación pero no bloquean código inmediato

5 temas para resolver por mail/Slack con el equipo de producto, no necesitan reunión.

### MIN-01 · Versión del Parental Consent — ¿al descargar o al inicio del viaje?

- **PRD principal §6.7:** "Versiones según la edad del alumno **al inicio del viaje**."
- **Portal Familias §1.6 + Modelo RV-11:** "La versión se determina **al momento de la descarga**, no se recalcula retroactivamente."

Inconsistencia clara. **Correcto:** el del Portal Familias (al descargar). Documento firmado tiene validez al momento de su suscripción.

**Acción:** confirmar con María que aplicamos la regla del Portal Familias y corregir el PRD principal.

---

### MIN-02 · Confirmation Letter + VISA Letter — ¿qué son y dónde van?

María dejó un comentario en M3 del PRD principal:
> "M: falta Confirmation Letter y VISA/Immigration Letter"

No queda claro:
- ¿Son uno o dos documentos?
- ¿La Immigration Letter del Paso 3 es lo mismo que VISA Letter?
- Si es un documento adicional, ¿es un paso 11° del M6?

**Acción:** preguntar a María para mapear estos documentos a los pasos existentes o crear un nuevo paso 11°.

---

### MIN-03 · Wimbledon edge case — Parental Consent doble + Test de Nivel

Vi confirmaciones de María en §6.6 y §6.7:
> "M: solo pasa en Wimbledon School of English"
> "M: solo en el caso de Wimbledon school of English"

El Modelo de Datos tiene columnas hardcoded para esto (`url_parental_consent_menor16`, `url_parental_consent_16_17`, `requiere_test_nivel`).

**Acción:** mantener `requiere_test_nivel BOOLEAN` (ya está), pero refactorizar las dos URLs del Parental Consent a:
```typescript
url_parental_consent_principal VARCHAR(500)  // siempre
url_parental_consent_alterno VARCHAR(500)    // NULL si no aplica
edad_corte_consent INT                        // 16 para Wimbledon, NULL para otros
```

Es un cambio de schema chico pero importante para no quedar atados a la realidad de Wimbledon.

---

### MIN-04 · "La representante" singular vs múltiples GLs

El Portal Familias habla siempre de "la representante" en femenino singular (US-7.3, US-7.4). Pero el sistema soporta múltiples GLs por viaje.

Preguntas pendientes:
- Si hay 2 GLs, ¿cualquiera puede publicar en el Diario?
- ¿Las entradas se firman con el nombre del GL?
- ¿Las familias ven al "principal" únicamente?

**Acción:** definir con producto si hay un GL "principal" (campo `es_principal` en el schema `groupLeadersViaje`, ya existe) y si solo ese publica.

---

### MIN-05 · Acceso post-viaje del Representante — 30 días o indefinido?

- **RV-14 del Modelo:** desactivación automática a los 30 días.
- **Observación al final del Módulo 1 del PRD Representante:** "Los representantes debieran seguir teniendo acceso al portal y poder ver sus viajes finalizados y sin viajes pendientes."

Contradicción. Posibles soluciones:
- **(a)** Mantener RV-14 + reactivar manualmente cuando el GL solicita.
- **(b)** Cuenta siempre activa, con acceso de solo lectura a viajes finalizados.

**Acción:** definir con producto. La (b) es más amigable, la (a) es más limpia operativamente.

---

## ⚙️ Técnicos — gaps que no están en el PRD pero hay que resolver

8 temas técnicos que el modelo no cubre. Los podés decidir vos como dev, pero documentalos en `docs/data-model.md` cuando los resuelvas.

### TEC-01 · Manejo de moneda

**Falta en el modelo:** `CUOTA_PAGO.monto_usd` es solo USD. Pero JUK opera en Argentina y los pagos son en ARS, USD blue, o GBP según el caso.

**Sugerencia:**
```typescript
moneda: pgEnum("moneda", ["ARS", "USD", "GBP"])
monto_original: numeric("monto_original", { precision: 12, scale: 2 })  // en moneda original
cotizacion_aplicada: numeric("cotizacion", { precision: 10, scale: 4 }) // opcional
fecha_cotizacion: date("fecha_cotizacion")                              // opcional
```

**Acción:** preguntar a Felix cómo se acuerda hoy el plan de pagos (en USD nominal? en ARS al día? en GBP?) y diseñar acorde.

---

### TEC-02 · Storage de archivos no formalizado en el PRD

El Modelo de Datos define `url_*` como `VARCHAR(500)` pero no documenta:
- Dónde se guardan los archivos (asumido: R2)
- Cómo se firman las URLs
- Política de retención
- Validación de tipo y tamaño en upload

**Acción:** el scaffold ya asume R2. Sumar una sección al PRD del Modelo de Datos: "Almacenamiento de archivos" con esa info.

---

### TEC-03 · Soft-delete inconsistente

Tres patrones distintos para "dar de baja":
- `estado = "Baja"` (Estudiante, Inscripcion)
- `activo = FALSE` (CuentaAdmin, CuentaFamilias)
- `estado = "Inactivo"` (Colegio)

**Sugerencia:** unificar a `estado` ENUM por entidad. Eliminar `activo BOOLEAN`.

**Acción:** decidir vos. Si no querés cambiarlo ahora, dejalo y migrá en la próxima iteración.

---

### TEC-04 · Falta entidad CONFIGURACION

El sistema necesita configurar:
- Día y horario del resumen semanal (PRD §2.4)
- Contenido de orientación post-rechazo de ETA (Portal Familias US-1.7)
- Excepciones de "dos firmas en Parental Consent" (Portal Familias §1.6)

**Sugerencia:** crear tabla `configuracion` key-value:
```typescript
export const configuracion = pgTable("configuracion", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});
```

**Acción:** sumarla cuando aparezca el primer caso real de configuración.

---

### TEC-05 · Canal de mensajes — moderación y límites

`MENSAJE_DIARIO` no define:
- Límite de longitud
- Si JUK puede leer los mensajes (auditoría)
- Si hay archivos adjuntos

**Sugerencia para v1:** texto plano, máx. 2000 chars, JUK con acceso de auditoría (puede leer todo desde el panel de admin), sin attachments. Documentarlo en una sección "Reglas del canal" del PRD del Portal Familias.

---

### TEC-06 · Falta tabla NOTIFICACION_ENVIADA

El sistema manda muchísimos emails y WhatsApps pero no hay tracking. Falla del scheduler → duplicados o vacíos sin enterarse.

**Sugerencia:**
```typescript
export const notificacionEnviada = pgTable("notificacion_enviada", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(),                    // "recordatorio_paso_14d", "alerta_mora_7d", etc.
  destinatario_email: text("email"),
  destinatario_whatsapp: text("whatsapp"),
  canal: text("canal").notNull(),                  // "email" | "whatsapp"
  enviado_at: timestamp("enviado_at").defaultNow().notNull(),
  resend_message_id: text("resend_message_id"),
  estado: text("estado").default("sent").notNull(), // sent | delivered | bounced | complained
  entidad_tipo: text("entidad_tipo"),
  entidad_id: uuid("entidad_id"),
});
```

Y un unique index para dedup: `(tipo, entidad_id, fecha)`.

**Acción:** sumar en Fase 7 cuando arme el sistema de recordatorios.

---

### TEC-07 · Migración de datos existentes

JUK hoy tiene los 60 alumnos en planillas. Si no hay importer, María se sienta a cargar todo a mano día 1.

**Sugerencia:** Fase 0 o Fase 9 incluir un script `scripts/import-from-sheets.ts` que lea un CSV con shape definido y haga el bulk insert respetando las relaciones.

**Acción:** definir con Tomas/María cuándo y cómo se hace la migración. Idealmente, los datos del año en curso entran al sistema antes del lanzamiento.

---

### TEC-08 · Métricas históricas vs solo año en curso

El PRD principal §2.5 deja como pregunta abierta:
> "¿Se necesitan métricas históricas o sólo el año en curso?"

**Implicación:** si querés métricas históricas (alumnos enviados por año, NPS por temporada, etc.), `INSCRIPCION_VIAJE` y todos los datos relacionados nunca se borran, solo se marcan como históricos.

**Sugerencia:** no implementar hard-delete en ningún lado por ahora. Soft-delete via `estado`. Espacio en Neon no es un problema con 60 alumnos × N años.

---

### TEC-09 · Falta la columna `requiere_test_nivel` en `colegios`

**El problema:** MIN-03 asume que `requiere_test_nivel BOOLEAN` "ya está" en el schema, pero `src/lib/db/schema/colegios.ts` **no la tiene**. La condición de activación del Paso 4 (Test de Nivel) no tiene columna de soporte hoy.

**Acción:** sumar `requiereTestNivel: boolean("requiere_test_nivel").default(false).notNull()` a `colegios` (cambio aditivo) al implementar el ABM de Colegios o el Paso 4. Generar migración.

*(Hallazgo del agente `juk-prd-analyst`, mayo 2026.)*

---

### TEC-10 · `groupLeadersViaje.groupLeaderId` sin foreign key

**El problema:** en `src/lib/db/schema/pasos-viaje.ts`, `groupLeaderId` es un `uuid` suelto, **sin `.references()`** a `group_leaders.id` — a diferencia de `viajeId`, que sí referencia. Rompe la integridad referencial de la relación N:M.

**Acción:** agregar la FK con el `onDelete` apropiado antes de cargar Group Leaders reales. Cambio de schema → migración.

*(Hallazgo del agente `juk-prd-analyst`, mayo 2026.)*

---

## ✨ Nuevos descubrimientos (al leer DOCX completos)

Cosas que aparecieron al leer los PRDs en formato DOCX (no estaban claras en MD):

### NEW-01 · Frecuencia de actualización: "tiempo real o cada 15 min"

Felix respondió: "Lo ideal sería en tiempo real pero si esto implicara un proceso muy complejo podría ser cada 15 mins."

**Decisión técnica:** optimistic updates + revalidate on focus + polling cada 60s en pestañas activas. Suficiente para "tiempo real" sin WebSockets.

---

### NEW-02 · Una entrada por día máximo en el Diario

US-4.1 del Representante: "máximo una entrada por día".

**Acción:** sumar partial unique index `(id_viaje, fecha)` en `ENTRADA_DIARIO`.

---

### NEW-03 · Reacciones y comentarios al Diario (futuro)

Felix mencionó como pregunta abierta del Representante:
> "Los padres o alumnos pueden reaccionar a las entradas con emojis o incluso comentarios que serán visibilizados una vez aprobados por la representante."

**Acción:** preparar tabla `REACCION_ENTRADA` vacía en el schema. Cero costo ahora, te ahorra una migración después.

---

### NEW-04 · Seguro de viaje — entidad faltante

Portal Familias §4 menciona que el padre carga datos del seguro: aseguradora, póliza, teléfono emergencias 24h, vigencia. **No está en el modelo.**

**Sugerencia:** 4-5 columnas en `ESTUDIANTE`:
```typescript
seguroAseguradora: text("seguro_aseguradora"),
seguroNumeroPoliza: text("seguro_numero_poliza"),
seguroTelefonoEmergencias: text("seguro_telefono_emergencias"),
seguroVigenciaDesde: date("seguro_vigencia_desde"),
seguroVigenciaHasta: date("seguro_vigencia_hasta"),
seguroIncluidoEnJuk: boolean("seguro_incluido_en_juk").default(false),
```

---

### NEW-05 · NPS_RESPUESTA solo para familias con cuenta activa

RV-15 dice que el registro se crea para todos los alumnos cuando el viaje pasa a Finalizado. Pero si la familia nunca recibió credenciales (`CUENTA_FAMILIAS.activo = FALSE`), nunca van a responder. Los porcentajes quedan feos.

**Acción:** refinar RV-15: crear el registro solo si la cuenta está activa.

---

### NEW-06 · WhatsApp operativo del GL — número JUK, no personal

Portal Familias §10: "El número de WhatsApp y email de la representante son gestionados por JUK. Al cambiar de representante, JUK actualiza los datos."

**Implicación:** `REPRESENTANTE` no necesita `whatsapp_personal`. `VIAJE` (o `groupLeadersViaje`) necesita `whatsapp_operativo_gl` que JUK setea por viaje.

---

### NEW-07 · Acceso post-viaje 2 años para familias vs 30 días para representante

Portal Familias §11: 2 años de acceso + notificación a 60 y 30 días + función "descargar todo" en ZIP.

Esto es **intencionalmente** distinto al Representante (30 días). La familia quiere conservar el certificado del curso por años.

**Acción:** documentar como decisión en `docs/data-model.md`. Tabla "Retención por tipo de cuenta":

| Tipo de cuenta | Acceso post-viaje | Política |
|---|---|---|
| CUENTA_ADMIN (Admin JUK) | Indefinido | Manual |
| CUENTA_ADMIN (Representante) | 30 días + reactivable | Auto a `activo=FALSE` |
| CUENTA_FAMILIAS | 2 años + ZIP descarga | Auto archivado |

---

### NEW-08 · Padre debería ver datos de salud en M2 del Portal Familias

US-3.9 del Representante tiene una observación enterrada:
> "El padre/alumno en la información de alumno también debiera de verlo para corroborar que la condición de salud de la persona está bien tomada."

**Acción:** en el Portal Familias Módulo 2 (Resumen de Documentación), pestaña de Salud debería mostrar al padre todos los campos de salud (no solo el campo agregado actual). Sumar a las US del Portal Familias.

---

## Cómo usar este documento

1. **Antes de cada sesión de código:** chequeá si lo que vas a tocar está en algún CRIT/MIN.
2. **Después de la reunión con María:** marcá los CRIT como `[x]` y borralos, o reemplazá el contenido con la resolución.
3. **Cuando resuelvas un TEC:** documentá la decisión en `docs/data-model.md` y borralo de acá.
4. **Cuando aparezca algo nuevo:** sumalo. Este doc vive mientras dure el proyecto.

---

*Documento generado a partir del análisis de los 4 PRDs v1.3 del equipo de producto + el Modelo de Datos v1.1 del Agente 4.*
