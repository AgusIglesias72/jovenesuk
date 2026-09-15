---
name: juk-paso
description: Implementa o modifica un paso del tablero del alumno (M6, Paso 0 + A1…D2) o del viaje (M7, pasajes, excursiones, transfers, tarjeta de transporte, police checks) del JUK Portal sobre el modelo real — estados y sub-estados en el dominio, server actions con auditoría, documentos al storage privado, UI del tablero, portal de familias y tests. Usalo para cualquier cambio en un paso.
---

# /juk-paso — Un paso del tablero M6 o M7

Comandos desde `juk-portal/`. Spec funcional: `docs/prd/02-portal-interno.md` (M6 y M7) y
`docs/prd/04-portal-familias.md` (lo que ve y hace la familia). Dos decisiones ⭐ tocan pasos:
CRIT-04 (excursiones, M7) y CRIT-05 (moneda de cuotas, B1/B2). Estado vigente en
`OPEN_DECISIONS.md` o con `/juk-gate`: se codean, acotadas y revertibles.

## El modelo real

### M6 — tablero del alumno: una fila por asignación × paso

- Tabla `src/lib/db/schema/pasos-alumno.ts`. Queries `src/lib/db/queries/pasos-alumno.ts`
  (`listPasosByAsignacion`, `getPasoAlumnoById`, `updatePasoAlumno`, `crearPasosParaAsignacion`).
- Dominio `src/lib/domain/pasos/` (barrel en `index.ts`):

| Archivo | Qué tiene |
|---|---|
| `codigos.ts` | `PASO_CODIGOS` (`paso_0`, `a1`…`a3`, `b1`, `b2`, `c1`…`c3`, `d1`, `d2`), grupos A/B/C/D, `PASO_LABELS`, `esPasoEditable`, `PASO_NUMERACION_VIEJA` (equivalencia con la numeración 1–10 anterior) |
| `estados.ts` | `PASO_ESTADOS` (`pendiente`, `en_progreso`, `completado`, `bloqueado`, `na`, `vencido`), `puedeTransicionarPasoAlumno`, `transicionesPasoAlumno`, `transicionRequiereNota` (bloquear pide motivo), `admiteFechaLimite`, `cuentaParaCompletitud`, `esPasoDerivadoDePago` |
| `sub-estados.ts` | ETA de C1 (`ETA_SUBESTADOS`, `estadoPasoDesdeEta`, `ETA_SUBESTADOS_FAMILIA`: las opciones que muestra el portal, aunque `reportarEtaFamiliaAction` no valida contra ellas (ver paso 6), `ETA_PROBLEMAS`) y Parental Consent de A3 (`PC_SUBESTADOS`, `estadoPasoDesdePc`) |
| `inicializacion.ts` | `pasosIniciales(ctx)`: las filas al asignar, con los N/A automáticos; `edadAlInicioDelViaje`, `versionParentalConsent` |
| `trigger.ts` | auto-confirmación del viaje (`INSCRIPTOS_PARA_AUTOCONFIRMAR`, `debeAutoConfirmar`) y `fechaLimiteA1Default` |
| `ayuda-familia.ts` | qué es cada paso y quién lo hace, en el lenguaje del portal de familias |

- Cuotas (B1/B2): `src/lib/domain/cuotas/` (`schema.ts` con las monedas, `derivaciones.ts` con el
  canal de cada cuota y la regla de B2, `resumen.ts`). **B2 no tiene pago propio**: se deriva de la
  última cuota del plan de B1.
- Crear el tablero: `src/lib/actions/asignaciones.ts` → `asignarConTablero` en
  `src/lib/db/queries/asignar-alumno.ts` (usa `pasosIniciales`).

### M7 — pasos del viaje: una fila por viaje × tipo

- Tabla `src/lib/db/schema/pasos-viaje.ts`. Queries `src/lib/db/queries/pasos-viaje.ts`
  (`listOrInitPasosViaje` crea las filas que falten, `updateEstadoPasoViaje`,
  `updateMetadataPasoViaje`, `listGroupLeadersDeViaje`).
- Dominio `src/lib/domain/pasos-viaje/`:

| Archivo | Qué tiene |
|---|---|
| `estados.ts` | `PASO_VIAJE_TIPOS`, `PASO_VIAJE_ESTADOS`, `PASO_VIAJE_DEPENDENCIAS` (transfers depende de pasajes), `PASO_VIAJE_DERIVADOS` (police_checks), `puedeTransicionarPaso`, `transicionesPasoConDependencias` |
| `metadata.ts` | schemas Zod de la metadata por tipo (`METADATA_SCHEMAS`), sub-estados de pasajes grupal e individual, `EXCURSION_ESTADOS` (CRIT-04 ⭐), normalización de valores viejos (`*_LEGACY`), `coberturaPorAlumno` para transfers y tarjeta |
| `police.ts` | `POLICE_CHECK_ESTADOS`, `derivarEstadoPoliceChecks(gls)`: el estado sale de los Group Leaders, no se edita a mano |
| `labels.ts`, `errors.ts` | textos y errores nombrados |

## Dónde vive cada cosa fuera del dominio

| Qué | M6 | M7 |
|---|---|---|
| Server actions | `src/app/(admin)/alumnos/[id]/pasos-actions.ts` (`transicionarPasoAlumnoAction`, `actualizarSubEstadoPasoAction`, `actualizarFechaLimiteA1Action`), `documentos-actions.ts` (`subirDocumentoPasoAction`), `cuotas-actions.ts` | `src/app/(admin)/viajes/[id]/pasos-actions.ts` (`cambiarEstadoPasoViajeAction`, `guardarMetadataPasoViajeAction`, `marcarAlumnoPasoViajeAction`); GLs en `group-leaders-actions.ts` |
| UI | `src/app/(admin)/alumnos/[id]/tablero-m6.tsx` | `src/app/(admin)/viajes/[id]/pasos-viaje-panel.tsx` (police checks derivados en `sections.tsx`) |
| Portal de familias | `src/app/familias/_actions.ts` (`subirDocumentoFamiliaAction`, `reportarEtaFamiliaAction`, `confirmarPasoFamiliaAction`) y `src/app/familias/[dni]/documentacion/` | — |
| Alertas, recordatorios y transiciones por fecha | reglas en `src/lib/domain/alertas/` y `src/lib/domain/recordatorios/`; job diario `dailyReminderScan` en `src/trigger/reminders.ts` (09:00 UTC): primero `transicionarViajesPorFecha` (`src/lib/jobs/transiciones-viajes.ts`), después `scanRecordatorios` (`src/lib/jobs/scan-recordatorios.ts`: marca vencidos y envía) | — |

## Cómo cambiar o sumar algo

1. **Spec y gate.** Leé la sección del paso en `docs/prd/02` (y `04` si lo toca la familia).
2. **Dominio primero, con su test al lado:**
   - transición o regla de estado → `estados.ts`;
   - sub-estado → `sub-estados.ts` (M6) o `metadata.ts` (M7). **Nunca un archivo por paso.** Si
     cambian valores ya guardados, traducilos al leer (patrón `PASAJE_SUBESTADO_LEGACY`) o hacé una
     migración de datos (`/juk-migracion`, `drizzle-kit generate --custom`);
   - N/A automático → `inicializacion.ts`;
   - dependencia entre pasos del viaje → `PASO_VIAJE_DEPENDENCIAS`;
   - paso nuevo → código en `codigos.ts`, labels, `ayuda-familia.ts`, `pasosIniciales` y una
     migración de datos que cree la fila en las asignaciones existentes.
3. **Action**, con el patrón de `transicionarPasoAlumnoAction`: `requireAdminJuk()` → Zod → paso
   por id → dueño derivado en el server (`alumnoIdDeAsignacion`) → validar con el dominio → update
   (`fechaCompletado`, notas) → `safeAudit` → `revalidatePath("/alumnos/[id]", "page")` →
   `ActionResult`. Error esperado → mensaje; inesperado → Sentry.
4. **Documento**, si el paso lleva archivo (`CATEGORIA_POR_PASO` en `documentos-actions.ts`):
   `validarDocumento` y `keyDocumento` (`@/lib/domain/documentos`) → `putDocumento`
   (`@/lib/storage`: R2 privado, revalida el contenido real; en dev sin R2 cae a `.uploads/`) →
   `insertDocumento` (tabla `documentos`, polimórfica por `entidadTipo`) → `metadata.archivoUrl`.
   Se sirve solo por `/api/uploads/[...key]`, que controla el acceso
   (`src/lib/db/queries/documentos-acceso.ts`). Nunca URLs públicas.
5. **UI**: `StepBadge` de `components/ui/badge.tsx` sin tocar el color-mapping; las opciones del
   selector salen de `transicionesPasoAlumno` / `transicionesPasoConDependencias`, no de una lista
   escrita en el componente.
6. **Familia**: toda action de familia pasa por el ownership de `_actions.ts` (`pasoConOwnership`:
   el alumno tiene que ser de la familia de la sesión). Subir un documento o confirmar D1 manda el
   paso a revisión de JUK solo si estaba pendiente, vencido o bloqueado (`avanzaConAccionFamilia`):
   nunca reabre lo que el equipo completó. Excepción abierta: el autoreporte del ETA
   (`reportarEtaFamiliaAction`) valida contra `ETA_SUBESTADOS` completo y escribe
   `estadoPasoDesdeEta`, así que la familia puede aprobar C1 sin revisión o volverlo a Pendiente
   (MIN-25 en `OPEN_DECISIONS.md`). No lo cambies sin decidir MIN-25.
7. **Alertas y recordatorios**: los umbrales van al dominio, no a la UI, para que el dashboard,
   el portal y los mails usen la misma regla.

## Tests

- Dominio: `<archivo>.test.ts` al lado (existen para códigos, estados, sub-estados, inicialización,
  trigger y ayuda-familia; en M7, estados, metadata, police y cobertura). Un paso nuevo suma su
  caso en `codigos.test.ts` (grupo, etiqueta única, numeración) además del test de la regla que
  toque.
- Actions: `pasos-actions.test.ts` (M6 y M7), `cuotas-actions.test.ts`, `familias/_actions.test.ts`:
  autorización, ownership, transición inválida, auditoría.
- Integración: si tocás la creación del tablero o las cuotas, `asignar-alumno.integration.test.ts`
  y `cuotas.integration.test.ts`; pagos, `pagos.integration.test.ts`; el job diario,
  `scan-recordatorios.integration.test.ts` y `transiciones-viajes.integration.test.ts`.
- E2E: `tablero-alumno`, `tablero-subestados`, `pasos-viaje`, `cobertura-m7`, `m7-excursiones`,
  `cuotas`, `familias-acciones` y `recorrido-completo` (helpers `pasoAlumno`,
  `selectorEstadoPasoAlumno`, `botonPasoViaje` en `tests/e2e/helpers.ts`).

## Docs (regla de sincronía)

- Regla, estado o sub-estado → `docs/prd/02-portal-interno.md` (y `04-portal-familias.md` si lo ve la familia).
- Decisión o asunción → `OPEN_DECISIONS.md`.
- El paso pasa de parcial a completo → `docs/estado-actual.md`.
- Siempre → `CHANGELOG.md`.

## Cerrar

`/juk-cierre` completo.
