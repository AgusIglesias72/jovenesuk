# Decisiones pendientes — JUK Portal

Lista accionable de lo que falta cerrar con el equipo **antes** de codear ciertos módulos.

> **Última actualización: 11/06/2026** (ronda de decisiones con Agustín), contra los PRDs
> v1.13 / v1.7 / v1.11 / v1.10. Specs internas en `docs/prd/` (empezar por `00-indice.md`).

---

## ✅ Resueltos

### Por los PRDs de junio 2026 (ex-gates históricos)

| Ex-gate | Resolución | Spec |
|---|---|---|
| **CRIT-01** Flujo de pago Colegio cliente (NEA) | Vía agencia **sin** excepción presencial → **B2 = N/A**. Independiente/Instituto: vía agencia + B2 presencial. JUK (directo): directo, B2 = N/A. | `docs/prd/01` y `02` |
| **CRIT-02** Pasaporte UK | Vencimiento **≥ fecha fin del viaje** (sin 6 meses extra). Otros países: 6 meses post-fin, configurable. Alerta conservadora del dashboard: 6 meses post-inicio, CRÍTICA. | `docs/prd/01` |
| **CRIT-03** Psicofísico | **Del alumno** (D2), viajes Grupales con GL; N/A en Individuales. Police checks de GLs = M7 Paso 5. | `docs/prd/02` |

También: **MIN-02** (Confirmation/VISA Letter = campos de control, no paso 11), **MIN-03**
(config documental reemplaza el hardcode Wimbledon), **MIN-05** (acceso post-viaje del
representante: permanente, read-only, revocable), **TEC-01** (absorbido por CRIT-05),
**TEC-08/09/10** (métricas históricas sí; `requiere_test_nivel` superseded; FK agregada).

### Por decisión del 11/06/2026 (Agustín) — ⭐ = validar con María/Felix cuando se pueda

| Ítem | Decisión |
|---|---|
| **CRIT-04** Excursiones ⭐ | **El representante aprueba/rechaza desde su vista** (Interno US-38, más nuevo); el admin puede aprobar en su nombre con nota. Las "solicitudes de cambio" (SLA 7 días) quedan como mecanismo adicional para proponer modificaciones, no como reemplazo de la aprobación. |
| **CRIT-05** Moneda de cuotas ⭐ | **Multi-moneda**: `moneda` ENUM (`USD\|GBP\|ARS`) + `monto` + cotización opcional. **Default USD** (lo que dicen Modelo v1.7 y Familias v1.11). Confirmar con Felix cómo se acuerdan los planes hoy. |
| **MIN-07** Identidad cuenta familias | **Email del Tutor 1** como identidad de auth (Better-Auth) + **DNI del alumno como selector**; permite N alumnos por grupo familiar con una cuenta. |
| **MIN-11** Defaults config documental | **Por documento (Modelo v1.7)**: App Form Requerido · Test de Nivel N/A · Parental Consent N/A · Confirmation Letter Requerido · VISA/Immigration Requerido. |
| **MIN-12** Dropdown de asignación | **Inscripción abierta + Confirmado con vacantes** (consistente con US-11; hace asignables a los Individuales). |
| **MIN-13** Semántica de "Opcional" | **Paso activo pero NO cuenta** para % de completitud ni alertas de obligatorios. |
| **MIN-06** "Paso obligatorio" (derivada de MIN-13) | Obligatorio = paso activo con config **Requerido** (o sin config, p.ej. B1, C2, D1) — excluye Opcional y N/A. |
| **MIN-14** Regla de C1/ETA | **`tipo_entrada_requerida` (ETA\|VISA\|Ninguna) en el colegio destino**, con default derivado de su país (UK→ETA, Irlanda→Ninguna, USA/Canadá→VISA). |
| **MIN-15** Facturación del alumno | **Conservar** (el Modelo v1.7 la protege con RV-20); visible solo admin_juk/super_admin. Pedir a producto que limpie el changelog del Interno. |

---

## 🔶 Abiertos — clarificar con el equipo (no bloquean el plan actual)

### MIN-01 · Versión del Parental Consent: ¿edad al inicio del viaje o al descargar?

Interno v1.13 (US-28): por **edad al inicio**; Familias/Modelo (RV-11): **al descargar**.
Además M3 tiene UN archivo de PC pero A3 distingue DOS versiones (<16 / 16-17).
**Asunción de trabajo mientras tanto:** versión por edad al inicio del viaje + el colegio
puede subir ambos archivos. Impacta recién al implementar A3 en detalle.

### MIN-04 · Diario: ¿quién publica cuando hay varios GLs?

1 entrada/día por viaje, editable 24h (v1.10). Falta: con 2+ GLs, ¿publica solo el principal
(`es_principal`)? ¿Se firma con el nombre del GL? Impacta recién en la Vista del Representante.

### MIN-08 · Acceso post-viaje de FAMILIAS: ¿cuánto dura?

Sin decidir en el PRD (recomendación interna: 2 años + descarga ZIP). El del representante ya
es permanente. Impacta recién en el Portal de Familias.

### MIN-09 · Email emisor de recordatorios: ¿info@ o noreply@?

Pregunta abierta oficial del Interno (M6). **Propuesta nuestra:** automáticos desde `noreply@`,
comunicaciones con respuesta esperada desde `info@`. Confirmar al construir recordatorios.

### MIN-10 · Precio por alumno / cálculo del precio final

Abierta en el PRD (M4). v1 no calcula precios; las comisiones son referencia interna. Falta
también el campo "precio por semana" para Individuales. No bloquea.

---

## ⚙️ Técnicos — los decide el dev, documentar al resolver

- **TEC-02 · Storage R2:** firma de URLs, retención y límites sin formalizar (solo "PDF/DOCX
  máx. 10 MB"). Documentar al construir uploads.
- **TEC-03 · Soft-delete unificado:** estado ENUM, no `activo BOOLEAN`. El Modelo v1.7 usa
  `activo` en cuentas — mantener nuestra convención y mapear.
- **TEC-04 · Tabla `configuracion`:** casos reales: día/horario del resumen semanal, umbrales
  por país, contenido post-rechazo de ETA. Crearla en el primer caso implementado.
- **TEC-05 · Reglas del canal de mensajes:** comentarios 280 chars sin moderación previa
  (v1.11); definir límites de mensajes directos y auditoría JUK.
- **TEC-06 · Tabla `notificacion_enviada`:** para recordatorios escalonados con dedup
  `(tipo, entidad_id, fecha)`. Construir junto con Trigger.dev.
- **TEC-07 · Importer de planillas:** definir con Tomas/María antes del go-live.
- **TEC-11 · Desfasajes del Modelo v1.7 vs. el PRD Interno v1.13** (manda el Interno; avisar
  a producto): (a) glosario Directo_JUK desactualizado · (b) son 11 pasos, no 10 · (c) RV-10
  "Confirmado" = sub-estado de Pasajes · (d) falta estado **Vencido** (A1) · (e) ESTUDIANTE:
  valen los 6 estados del Interno · (f) POLICE_CHECK por **GL físico**, no por representante ·
  (g) estados police check: unión `pendiente|en_tramite|aprobado|rechazado|vencido` ·
  (h) CUOTA_PAGO necesita **canal** · (i) RV-14 superseded (acceso permanente) · (j) alerta
  pasaporte CRÍTICA y general · (k) `En_negociacion` opcional · (l) ETA "En trámite" =
  `en_tramite` canónico · (m) `config_visa_immigration` NO inicializa C2 (campo de control).

---

## Cómo usar este documento

1. Antes de codear un área sensible: `/juk-gate <área>` (lee este archivo).
2. Cerrada una decisión: moverla a "Resueltos" con la referencia a la spec actualizada.
3. Nueva contradicción entre PRDs: sumarla acá Y marcarla `> ⚠️` en la spec de `docs/prd/`.
4. Los ⭐ requieren validación del equipo: si María/Felix deciden distinto, revertir es un
   cambio acotado (las specs señalan el punto exacto).

*Generado del cruce de los 4 PRDs (jun 2026) + specs `docs/prd/` + decisiones del 11/06/2026.*
