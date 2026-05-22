# Modelo de Datos

Entidades principales del JUK Portal y sus relaciones. Para el detalle de cada columna, ver los archivos en `src/lib/db/schema/`.

## Diagrama ER (alto nivel)

```
                      ┌─────────────┐
                      │   users     │ (4 admins · Better-Auth)
                      └─────────────┘
                            │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   sessions          accounts          verifications

┌──────────────┐                     ┌──────────────┐
│   colegios   │◄────────────────────│    viajes    │
│ (destino +   │      destino +      │              │
│  cliente)    │      cliente_id     └──────┬───────┘
└──────────────┘                            │
                                            │
                ┌───────────────────────────┼───────────────┐
                ▼                           ▼               ▼
        ┌──────────────┐        ┌─────────────────┐  ┌──────────────────┐
        │   alumnos    │◄───┬───│  asignaciones   │  │  pasos_viaje     │
        └──────────────┘    │   └─────────────────┘  │  (M7 · 5 pasos)  │
                            │           │            └──────────────────┘
                            │           │
                            │           ├─────► pasos_alumno (M6 · 10 pasos por asignación)
                            │           ├─────► cuotas        (plan de pagos)
                            │           └─────► alertas       (operativas)
                            │
                            │   ┌──────────────────┐
                            │   │ group_leaders    │
                            │   │ (police checks)  │
                            │   └─────────┬────────┘
                            │             │
                            │             ▼
                            │   ┌──────────────────────┐
                            │   │ group_leaders_viaje  │ N:M
                            │   └──────────────────────┘
                            │
                            └───► documentos (R2 · polimórfico)

                            └───► auditoria (log de cambios)
```

## Entidades

### `users`
4 administradores JUK + (futuros) representantes y familias. Role-based access control.

**Roles:** `admin_juk`, `super_admin`, `representante`, `familia`.

### `colegios`
Dos tipos:
- **`destino`**: instituciones en UK/IE/etc. donde estudian los alumnos
- **`cliente`**: instituciones argentinas que llevan grupos (ej: NEA)

Diferenciado por columna `tipo`. Mismo tabla porque comparten ~80% de campos.

### `viajes`
Una salida grupal. Tiene:
- `colegio_destino_id` (siempre requerido)
- `colegio_cliente_id` (opcional, sólo si el origen es un colegio cliente)
- `origen`: representante_independiente / instituto / colegio_cliente
- `ultimo_pago_presencial`: si/no (calculado al crearse según origen)

### `alumnos`
Datos personales del alumno. Datos de pasaporte que DEBEN coincidir con el documento físico.

### `asignaciones`
**Crítico:** un alumno puede estar en varios viajes (PRD §4.5). La asignación es la unidad sobre la que se modela el tablero de 10 pasos.

Por ejemplo: Camila viaja en febrero y en julio → 2 asignaciones → 2 tableros de 10 pasos cada uno = 20 filas en `pasos_alumno`.

### `pasos_alumno`
Los 10 pasos del M6, una fila por (asignación × tipo). El campo `metadata` (JSON) guarda datos específicos del paso (ej: para ETA, el sub-estado y número de autorización).

### `pasos_viaje`
Los 5 pasos del M7, una fila por (viaje × tipo).

### `cuotas`
Plan de pagos por asignación. La última cuota tiene `esUltimaCuota = 1` y `canal = "presencial"` cuando el viaje requiere pago final presencial.

**Importante:** el "Paso 10" del M6 NO genera un registro aparte — es esta última cuota.

### `group_leaders`
Personas externas que viajan con el grupo. Tienen police check tracking propio.

### `documentos`
Archivos en R2. Polimórfico via `entidad_tipo` + `entidad_id`.

### `alertas`
Alertas operativas materializadas para el dashboard. Generadas por jobs y al cambiar estados.

### `auditoria`
Log de cambios para trazabilidad. Capturamos todas las acciones críticas: login, create, update, delete, cambios de estado, registros de pago, uploads de documentos.

## Decisiones de modelado

### Por qué `asignaciones` es una entidad separada

Sin esta tabla, un alumno se ata directamente a un viaje vía FK. Pero como un alumno puede estar en varios viajes (caso real, no hipotético — ya pasó en JUK), necesitamos modelar la asignación como entidad para colgar de ella el tablero de 10 pasos y el plan de pagos.

### Por qué metadata JSON en pasos

Cada paso tiene campos específicos: el ETA tiene sub-estado y número de autorización; el Parental Consent tiene sub-estado de envío/firma; el Test de Nivel guarda el nivel. Hacer columnas separadas significaría 30+ columnas en `pasos_alumno`. JSON con tipado en TS (en `lib/domain/pasos/`) es más limpio y flexible.

**Trade-off:** queries no pueden filtrar por estos campos vía SQL puro fácilmente. Cuando aparezca el caso (ej: "mostrar todos los alumnos con ETA rechazado"), se puede:
1. Promover el campo a columna real (migración liviana)
2. Usar JSONB index si el caso es raro
3. Filtrar en memoria (60 alumnos, no es problema)

### Por qué documentos polimórfico

Documentos cuelgan de varios tipos (alumno, viaje, colegio, paso). Una tabla por tipo sería repetitiva. Polimorfismo vía dos columnas (`entidad_tipo` + `entidad_id`) sin FK estricta funciona bien y deja la integridad referencial al código.

**Trade-off:** no hay constraint a nivel DB. Mitigado porque `lib/domain/documentos/upload.ts` valida antes de insertar.

### Por qué materializar alertas

Computar alertas en cada page load del dashboard significa recorrer 60 alumnos × N reglas. Materializarlas en una tabla permite:
- Page load instantáneo (un SELECT vs. cálculo)
- "Descartar alerta por sesión" (PRD §2.3)
- Historial de alertas pasadas

El job `recompute-alerts` (en Trigger.dev) corre cada hora.

## Migraciones

Las migraciones se generan con Drizzle Kit:

```bash
# Después de cambiar algún archivo en src/lib/db/schema/
npm run db:generate     # genera SQL en drizzle/
git add drizzle/
git commit -m "feat(db): add alumno.preferencia_curso"
git push                # CI corre drizzle migrate en la branch preview
```

En producción, las migraciones se aplican manualmente desde un workflow de GitHub Actions (paso bloqueante antes del deploy).
