# 02 · Portal de Gestión Interno — Spec funcional completa

> **Fuente:** PRD Portal de Gestión Interno **v1.13** (junio 2026; "revisión Delfina v1.6").
> Raw en [`fuentes/portal-gestion-interno-v1.13.md`](fuentes/portal-gestion-interno-v1.13.md).
> Conceptos transversales (roles, tipos de representante, tipo de viaje, pasaporte) en
> [01-vision-y-dominio.md](01-vision-y-dominio.md). Deltas contra el código en
> [06-deltas-implementacion.md](06-deltas-implementacion.md).

Back-office exclusivo del equipo operativo JUK. Centraliza alumnos, viajes, colegios y el
estado de cada trámite. Módulos: **M1** Login · **M2** Dashboard · **M3** ABM Colegios destino ·
**M4** ABM Viajes · **M5** ABM Estudiantes · **M6** Seguimiento del alumno (Paso 0 + A/B/C/D) ·
**M7** Seguimiento del viaje (5 pasos).

**Fuera de alcance de este PRD:** Vista del Representante (doc 05), Portal de Familias (doc 04),
y el Colegio cliente como entidad independiente (es un tipo de representante, ver doc 01).

---

## Módulo 1 — Login

**Objetivo:** que solo usuarios autorizados accedan, con usuario y contraseña. Simple de
administrar y seguro para los 4 admins.

### User stories

- **US-01 — Ingresar al portal.** Form con email y contraseña. Credenciales correctas →
  Dashboard. Incorrectas → error genérico (sin revelar qué campo falló). **5 intentos fallidos
  consecutivos → bloqueo temporal de 15 minutos.** Link "Olvidé mi contraseña" que envía email
  de restablecimiento.
- **US-01b — Ingresar con Google.** Botón "Continuar con Google" debajo del form de email, visible
  solo si el portal tiene configuradas las credenciales OAuth (si no, no se muestra y el login
  sigue funcionando igual). **Entra únicamente a una cuenta que ya existe con ese email**: un email
  desconocido se rechaza con un mensaje claro y **no crea cuenta**. El rol y el estado
  activo/inactivo mandan igual que en el login por email (una cuenta desactivada tampoco entra por
  Google). No es SSO: la identidad la sigue administrando JUK. Decisión: MIN-28 en
  `OPEN_DECISIONS.md`.
- **US-02 — Cerrar sesión.** Botón visible en todo momento (header o menú). Invalida la sesión
  en el servidor y borra cookie/token. URL protegida después de logout → redirige a login.
- **US-03 — Gestión de usuarios (solo super-admin).** Crear usuario con: nombre, apellido,
  email, rol (admin / representante) y contraseña temporal. Al crear → email al nuevo usuario
  con contraseña temporal + link para cambiarla. Desactivar sin borrar (conserva historial; un
  desactivado no puede iniciar sesión). Soporta exactamente 4 admins simultáneos (ampliable).
- **US-04 — Restablecer contraseña.** Link caduca a las **24 horas**; un solo uso. Nueva
  contraseña: mínimo **8 caracteres**. Email de confirmación cuando se cambió.

### Reglas de negocio

- 4 admins iniciales: María (CEO, **super-admin de v1**), Felix (Sales), Delfina (Marketing),
  Tomas (Operations). Arquitectura preparada para agregar más.
- **Sin 2FA.** **Sin SSO** de Google Workspace: el SSO (delegar la identidad a Workspace, con alta
  automática de quien tenga el dominio) sigue descartado — Felix. Lo que sí hay desde 18/09/2026 es
  el **login con Google acotado a vinculación** (US-01b): Google abre sesión en una cuenta que el
  equipo ya creó y **nunca crea una**. Es otra cosa que el SSO y está acotada por MIN-28
  (`OPEN_DECISIONS.md`), pendiente de validar con Felix.
- **Credenciales del Representante: se activan al asignarlo al viaje**, sin importar el estado
  del viaje (puede estar en Inscripción abierta). No hay ventana de días previos.
- **Log de auditoría:** todos los accesos quedan registrados (usuario, fecha/hora, acción).
- **Sesión expira a las 8 horas** de inactividad.

---

## Módulo 2 — Dashboard

**Objetivo:** visibilidad operativa inmediata al iniciar sesión: qué alumnos requieren atención
hoy, qué viajes se aproximan, alertas críticas y estado general del año.

### Secciones (★ requerido / ◇ opcional)

| Sección | Contenido | |
|---|---|---|
| **Panel de alertas críticas** | ETAs rechazados o con primer pago registrado y ETA aún Pendiente; pasaportes vencidos o que vencen dentro de los 6 meses posteriores al inicio del viaje; mora >7 días; documentos faltantes con viaje a <3 meses. | ★ |
| **Viajes próximos (90 días)** | Nombre, fechas, colegio, inscriptos/capacidad, % de trámites completados. | ★ |
| **Alumnos con acción urgente** | Ordenados por urgencia (viaje más próximo + pasos bloqueados). Click directo al perfil. | ★ |
| **Resumen del año en curso** | Alumnos activos, viajes confirmados, viajes en curso, alumnos viajando ahora. | ★ |
| **Accesos rápidos** | Nuevo alumno, nuevo viaje, panel de pagos en mora. | ◇ |
| **Indicador de pagos en mora** | Contador de alumnos con ≥1 cuota vencida sin pagar. Link al panel de pagos. | ★ |
| **Viajes del próximo año (>6 meses)** | Solo viajes **Grupales** con inicio a >6 meses. Dos indicadores: **naranja** si <5 alumnos (mínimo no alcanzado), **azul** si llegó o está próximo a capacidad máxima. Los Individuales NO aparecen. | ★ |
| **NPS — resultados post-viaje** | Read-only. NPS promedio por viaje finalizado en 3 dimensiones: JUK general, Representante, Colegio UK. NPS acumulado por representante. | ★ |
| **Calendario visual de viajes** | Viajes activos y próximos distribuidos en sus fechas. Detecta solapamientos, temporadas, viajes flacos. | ★ |
| **Métricas históricas** | Comparativas anuales: alumnos enviados, viajes, NPS promedio histórico. | ★ |

### User stories

- **US-DX-01 — Panel de alertas críticas.** Carga automática post-login. Muestra: ETA
  rechazados, pasaportes vencidos antes del viaje, mora >7 días, documentos con fecha límite
  inminente. Cada alerta linkea al alumno/viaje. Orden por prioridad (crítica > alta > media).
  Se puede **descartar temporalmente** una alerta (solo por la sesión; vuelve al día siguiente
  si no fue resuelta).
- **US-DX-02 — Viajes próximos 90 días.** Orden por fecha de inicio. Por viaje: nombre, fechas,
  colegio destino, inscriptos/capacidad, **indicador de completitud** (barra/porcentaje de
  alumnos con todos sus pasos Completados). Click → detalle del viaje.
- **US-DX-03 — Alumnos con acción urgente.** Alumnos con ≥1 paso Bloqueado o alerta activa.
  Orden: (1) viaje en próximos 30 días, (2) alertas críticas. Por alumno: nombre, viaje, días
  hasta el viaje, tipo de alerta. Click → tablero de seguimiento.
- **US-DX-04 — Métricas del año.** Alumnos activos del año, viajes confirmados, viajes en
  curso, alumnos viajando. Actualización en tiempo real. Indicador de mora incluido.
- **US-DX-05 — Viajes del próximo año.** Solo Grupales con inicio >6 meses. Por viaje: nombre,
  fecha, colegio, inscriptos, indicador de mínimo (5). **<5 alumnos → alerta naranja**;
  **capacidad llena o casi → indicador azul**. Click → detalle.
- **US-DX-06 — NPS.** Por viaje finalizado: NPS promedio en 3 dimensiones (JUK general,
  Representante, Colegio UK) = promedio de respuestas individuales de la encuesta post-viaje
  del Portal de Familias. Muestra respuestas recibidas vs. total ("12 de 15"). NPS acumulado
  del representante = promedio de todos sus viajes, visible en su perfil. **Read-only para el
  admin** (los datos los ingresa exclusivamente el Portal de Familias). Viajes sin respuestas →
  "Sin datos" (no cero, para no distorsionar promedios).

### Reglas de negocio

- **Alerta CRÍTICA:** (1) ETA rechazado; (2) pasaporte vence dentro de los 6 meses posteriores
  al **inicio** del viaje (criterio conservador; la validación legal es ≥ fin del viaje para
  UK); (3) mora >7 días en una cuota; (4) viaje en <7 días con algún paso obligatorio Pendiente.
- **Alerta ALTA:** (1) primer pago pendiente con ETA Pendiente; (2) viaje en <21 días con paso
  Bloqueado; (3) pasaporte vence dentro de los 30 días siguientes a la fecha del viaje.
- **Completitud de un viaje** = alumnos con todos los pasos aplicables Completados / total de
  alumnos activos del viaje.
- **Mínimo viable:** viaje Grupal del próximo año con <5 inscriptos = "en riesgo" (naranja).
  Individuales: sin indicador (1 alumno es válido por definición).
- **Resumen semanal por email** a los 4 admins (info@jovenesenuk.com o emails individuales):
  alertas activas, viajes próximos 90 días, viajes del próximo año con <5 alumnos, mora.
  **Día y horario configurables.**
- **NPS:** viaje = promedio de respuestas de sus alumnos; representante = promedio acumulado de
  sus viajes. Fuente: siempre el Portal de Familias; el interno solo consume.

---

## Módulo 3 — ABM de Colegios Destino

**Objetivo:** registro centralizado de colegios destino (instituciones educativas en UK u otros
países anglófonos). Los colegios clientes **no tienen módulo propio** (su lógica es del tipo de
representante, M4), pero el catálogo sí admite filas de tipo "cliente" — solo como entrada de
directorio para el dropdown "Colegio cliente (origen)" del viaje (campo Tipo y filtro de US-09).

### Campos del formulario

| Campo | Detalle | |
|---|---|---|
| Nombre del colegio | Ej: London School of English | ★ |
| País | Dropdown: Reino Unido, Irlanda, Canadá, Malta, Australia, otro | ★ |
| Ciudad / Ubicación | Texto libre | ★ |
| Tipo | Colegio destino (default) / Colegio cliente | ★ |
| Contacto Académico / Principal | Nombre + email + teléfono | ★ |
| Contacto Administrativo / Documentos | Nombre + email + teléfono | ★ |
| Contacto de Alojamientos | Nombre + email + teléfono | ◇ |
| Contacto Programas Juniors | Nombre + email + teléfono (algunos colegios) | ◇ |
| Comisión del colegio destino (%) | Sobre el programa. **Visible solo Admin.** | ◇ |
| Sitio web | URL | ◇ |
| Application Form (archivo) | PDF/DOCX descargable, actualizable. Ver config documental. | ★ |
| Parental Consent (archivo) | PDF/DOCX. Se actualiza año a año; solo la versión vigente es accesible. Requerido/Opcional/N-A según configuración. | ◇ |
| Año vigente del Parental Consent | Ej: 2026. Visible solo si PC ≠ N/A. | ◇ |
| Confirmation Letter (template/instructivo) | PDF/DOCX. Req/Opc/N-A según config. | ◇ |
| VISA / Immigration Letter (instrucciones) | Template o instrucciones del colegio. La letter personalizada por alumno se tramita en M6 (C2). | ◇ |
| Cursos disponibles | Lista múltiple (General English, Exam Prep, Academic Year…) | ★ |
| Tipos de alojamiento | Lista múltiple (Familia anfitriona, Residencia, otro) | ★ |
| Notas adicionales | Texto libre | ◇ |
| Estado | Activo / Inactivo. Default: Activo | ★ |

### Configuración de requisitos documentales por colegio (US-05b) — pieza clave

Al crear/editar un colegio destino, el admin configura cada documento estándar como
**Requerido / Opcional / N-A** (✅ MIN-11 resuelto: valen los **defaults por documento del
Modelo v1.7** — App Form Requerido, Test de Nivel N/A, Parental Consent N/A, Confirmation
Letter Requerido, VISA/Immigration Requerido — y no el "todo Opcional" de esta US). Esa configuración determina
automáticamente los pasos activos del tablero del alumno (M6) al asignarlo a un viaje de ese
colegio — **sin reglas hardcodeadas**:

| Documento | Impacto en M6 |
|---|---|
| Application Form | Paso A1 activo o N/A automático |
| Test de Nivel | Paso A2 activo o N/A automático |
| Parental Consent | Paso A3 activo o N/A automático (además de la regla N/A por edad ≥18) |
| Confirmation Letter | Campo de control visible en el tablero del alumno |
| VISA / Immigration Letter | Campo de control visible en el tablero del alumno |

- Cambios de configuración con alumnos activos: aplican **solo a asignaciones nuevas**; los
  tableros existentes no se tocan.
- La config registra fecha y usuario de última modificación.
- **Nota de modelo de datos:** la configuración debe ser una entidad independiente
  (`colegio_documento_config`, una fila por documento), NO columnas fijas en `colegios`. En v2
  habrá "+ Agregar documento" (documentos personalizados con paso propio en el tablero).

### User stories

- **US-05 — Crear colegio.** Secciones por tipo de contacto; al menos el Académico es
  requerido. Archivos PDF/DOCX hasta **10 MB** c/u. Comisión visible solo Admin. Al guardar,
  aparece en los dropdowns del ABM de Viajes. Se registra quién y cuándo lo creó.
- **US-05b — Configurar documentos** (ver arriba).
- **US-06 — Actualizar Parental Consent anual.** Subir nuevo PC **reemplaza** el anterior (sin
  historial de versiones caducas). Año vigente se actualiza con el archivo o manualmente.
  **Aviso si el PC tiene >12 meses sin actualizar.** Los links de descarga siempre apuntan a la
  versión vigente.
- **US-08 — Desactivar colegio.** No aparece en dropdowns de creación de viajes; viajes y
  alumnos históricos conservan la referencia; se puede reactivar. **No se puede eliminar un
  colegio con viajes asociados.**
- **US-09 — Buscar/filtrar.** Texto libre por nombre; filtros por tipo (destino/cliente), país
  y estado. Resultados: nombre, tipo, país, ciudad, estado.

### Estados, alertas y reglas

- Estados: **Activo** (disponible para viajes) / **Inactivo** (no aparece en dropdowns).
- Alerta interna: PC con >12 meses sin actualizar.
- Alerta interna: si se modifica el AF o PC de un colegio **con alumnos activos**, se notifica
  al equipo.
- Un viaje tiene SIEMPRE un colegio destino; el tipo de representante es atributo del viaje.
- Viaje con dos colegios destino: **fuera de alcance v1** (si pasara: un viaje por colegio).
- NEA usa el formulario JUK (no hay Application Form diferenciado) — cerrado por María.
- **Precio por semana**: cerrado que hace falta para viajes Individuales (duraciones variables:
  2, 3 o más semanas; los Grupales suelen ser 2 o 3 fijas).
  *Pendiente de incluir como campo en el ABM de Viajes en una próxima versión del PRD.*
- v1 NO calcula precios/presupuestos (cerrado por Felix). Comisiones = referencia interna.

### Roadmap v2 (Delfina) — NO construir en v1

Contrato de representación con el colegio (archivo + vigencia inicio/vencimiento), alerta de
vencimiento de contrato (~30 días antes), campo de vacantes pedidas al colegio por temporada.

---

## Módulo 4 — ABM de Viajes / Salidas

**Objetivo:** registrar y gestionar cada salida. Un viaje agrupa alumnos que viajan juntos con
uno o más GLs a un colegio destino. El estado del viaje habilita/bloquea acciones.

### Campos del formulario

| Campo | Detalle | |
|---|---|---|
| Nombre / código | Ej: `UK-2026-JUL-LONDON` | ★ |
| **Tipo de viaje** | ENUM: **Grupal \| Individual**. Condiciona campos y comportamiento. | ★ |
| **Tipo de representante** | Dropdown: Representante Independiente / Instituto / Colegio cliente / **JUK (directo)**. Determina flujo de pago. | ★ |
| Representante (GL principal) | Dropdown de usuarios con rol representante. Para 'JUK (directo)' no hay persona externa. Oculto/fijo para Individuales. | ★ |
| Cantidad de group leaders | Entero ≥1. Solo Grupales. Individuales: fijo 0. | ★ |
| Capacidad máxima | Grupal: **GL × 12, editable solo hacia abajo**. Individual: fija 1. | ★ |
| Fecha de inicio / fin | Salida desde Argentina / regreso | ★ |
| Semanas de duración | Calculado: (fin − inicio) / 7. Read-only. | ★ |
| País destino | Dropdown: Reino Unido, Irlanda, Canadá, Malta, Australia, otro | ★ |
| Colegio destino | Dropdown filtrado por país; solo activos tipo destino | ★ |
| Colegio cliente (origen) | Dropdown de colegios activos tipo cliente. Opcional si el origen es representante independiente. | ◇ |
| Tipo de curso | Dropdown con cursos del colegio destino | ★ |
| Tipo de alojamiento | Dropdown con alojamientos del colegio destino | ★ |
| **Flujo de pago** | **Calculado**: 'Vía agencia' para Independiente, Instituto y Colegio cliente; 'Directo JUK' solo para JUK (directo). La diferencia Independiente/Instituto vs. Colegio cliente es la excepción presencial del último pago (B2). | ★ |
| Comisión de la agencia externa (%) | Solo Admin. Aplica 'Vía agencia'; N/A para JUK directo. | ◇ |
| Fee del representante | Monto fijo o %. Solo Admin. Aplica Independiente e Instituto. | ◇ |
| Cantidad de inscriptos | Calculado, read-only | ◇ |
| Estado del viaje | Ver ciclo de vida | ★ |
| Notas internas | Texto libre | ◇ |

### Ciclo de vida y transiciones

```
Grupal:      (creación) → Inscripción abierta → Confirmado → En curso → Finalizado
Individual:  (creación) → Confirmado → En curso → Finalizado
Cualquier estado (excepto Finalizado) → Cancelado
```

- **No existe estado Borrador** en ningún tipo de viaje.
- Grupal nace en **Inscripción abierta**; Individual nace en **Confirmado**.
- **Inscripción abierta → Confirmado: AUTOMÁTICO al llegar a 5 alumnos inscriptos.** También
  puede confirmarse manualmente antes.
- Confirmado → En curso: manual **o automática en la fecha de inicio** (ambos tipos).
- En curso → Finalizado: manual **o automática en la fecha de fin** (ambos tipos).
- Cualquier estado → Cancelado: manual con confirmación. Ofrece **notificar a los inscriptos**.
- Se pueden agregar/quitar alumnos en **Inscripción abierta Y Confirmado**. En estados
  posteriores, solo baja extraordinaria con confirmación explícita.
- Estados: Inscripción abierta (inicial, alta/baja de inscriptos) · Confirmado (5+ alumnos o
  manual; sigue permitiendo altas/bajas) · En curso (viajando) · Finalizado (regresaron) ·
  Cancelado (alumnos se liberan).

### User stories

- **US-10 — Crear viaje.** Cursos/alojamientos filtrados por colegio destino. Semanas
  auto-calculadas. Capacidad = GL × 12, ajustable solo hacia abajo. Bloquea fin < inicio. Flujo
  de pago auto-calculado según tipo de representante. Al guardar → estado 'Inscripción abierta'
  directo.
- **US-10b — Crear viaje Individual.** `tipo_viaje = Individual` oculta GLs y fija capacidad 1.
  Nace en 'Confirmado'. Puede usar 'JUK (directo)'. En M7: P1 Pasajes activo con nota "el
  alumno gestiona sus propios pasajes — JUK registra los datos del vuelo"; P5 Police checks N/A
  automático; P2/P3/P4 normales. Badge "Individual" en el listado.
- **US-11 — Inscribir/quitar alumnos.** En Inscripción abierta Y Confirmado. Contador en tiempo
  real. **Sobre-capacidad: advierte pero NO bloquea** (requiere confirmación explícita). Al
  llegar a 5 inscriptos → notificación interna de que puede confirmarse. Detalle muestra
  inscriptos / capacidad / vacantes.
- **US-12 — Listado.** Código, colegio destino, fechas, estado, inscriptos/capacidad, badge
  Individual. Filtros: año, país, colegio, tipo de viaje, estado. Orden default: fecha de
  inicio descendente.
- **US-13 — Avanzar estado.** Sin saltear pasos. Cada cambio registra fecha/hora/usuario. Al
  cancelar: pregunta si notificar inscriptos. **Editar fechas con inscriptos → advertencia +
  re-validación de pasaportes de todos.**
- **US-14 — Detalle 360°.** Lista de alumnos con seguimiento resumido; click al detalle de cada
  uno; alertas activas del viaje (pagos atrasados, documentos pendientes, ETAs rechazados).

### Reglas de negocio

- **Tipo de viaje** (ver tabla comparativa en doc 01).
- **JUK (directo):** flujo Directo JUK, comisión agencia = N/A, fee = N/A, sin credenciales de
  representante externo. Aplica a Individuales y a Grupales coordinados directamente por JUK.
- **Proporción GL/alumnos:** solo Grupales, 1 GL cada 12 alumnos máximo.
- **Representante siempre externo** (modelo de venta directa); distinción con GL físico en doc 01.
- **Multi-viaje por alumno:** un alumno puede estar en más de un viaje el mismo año. Cada
  asignación genera un tablero de seguimiento independiente.
- **Activación del tablero M6: al asignar el alumno al viaje**, sin importar el estado del
  viaje.
- **Flujo de pago según representante:** Independiente/Instituto → vía agencia con B2
  presencial; Colegio cliente → vía agencia sin excepción (B2 = N/A); JUK directo → directo
  (B2 = N/A).

### Preguntas abiertas — M4

- ¿Campo de precio/costo por alumno a nivel viaje (para calcular el total con las 3 capas de
  comisión)? Felix: varía según cantidad de alumnos. **Definir si v1 o futuro.**
- ¿Las comisiones son referencia o cálculo del precio final? María: a veces son el precio
  final, a veces no. **Requiere definir por tipo de viaje.**
- ¿Multi-destino en futuras versiones? Abierta.

---

## Módulo 5 — ABM de Estudiantes

**Objetivo:** alta, visualización y edición de estudiantes. El alta se inicia externamente vía
**Application Form JUK (Google Form) → webhook** → registro en estado 'Pre-inscripto' → el
equipo revisa y completa → asignación a viaje → 'Inscripto'.

### Campos

**Datos personales:** Nombre ★ y Apellido ★ (como figuran en el pasaporte, coincidencia
exacta), Fecha de nacimiento ★ (DD/MM/AAAA), DNI ★, Número de pasaporte ★ (se usa para
verificar la Immigration Letter), Fecha de vencimiento del pasaporte ★ (validación automática
≥ fecha fin del viaje para UK), Teléfono del alumno ◇ (WhatsApp preferentemente), Email del
alumno ◇, Alergias/dietas/salud ◇ (texto libre, **confidencial**).

**Contacto familiar:** Tutor 1 (nombre ★, celular ★, email ★ — email principal para
comunicaciones), Tutor 2 (nombre ◇, celular ◇, email ◇).

**Datos del programa:** Viaje asignado ◇ (dropdown de viajes en 'Inscripción abierta'; se puede
asignar después del alta), Tipo de alojamiento solicitado ◇, Preferencias de alojamiento ◇
(texto: no fumadores, mascotas…), Nivel de inglés (autoevaluación) ◇.

**Seguimiento (interno):** Estado general ★, Fecha de alta ★ (automática, del webhook),
Usuario que procesó el alta ★ (automático), Notas internas ◇ (visibles para representantes
**excepto datos fiscales**).

> Nota: el changelog dice que la sección "Datos de facturación" del alumno se **eliminó en v1.2**
> (Felix), pero US-15 y el Modelo v1.7 (RV-20) la conservan. ✅ **MIN-15:** se conserva, visible
> solo para admins (sección plegable en la ficha del alumno).

### User stories

- **US-15 — Alta automática por webhook.** Google Form completo → webhook crea el alumno.
  Mapeo completo de campos. Estado 'Pre-inscripto' + notificación al equipo. Todo editable
  desde el portal. Datos de facturación visibles solo para admins (no representantes).
- **US-16 — Asignar a viaje.** Dropdown solo con viajes en 'Inscripción abierta' **con
  vacantes**. Contador se actualiza. Al límite de capacidad → advertencia antes de confirmar.
  Al asignar → **activa el tablero M6** y **valida el pasaporte** contra el viaje.

> ✅ RESUELTO (MIN-12, decisión 11/06/2026): el dropdown incluye viajes en **Inscripción
> abierta Y Confirmado con vacantes** (consistente con US-11; los Individuales nacen
> Confirmados y deben ser asignables).
- **US-17 — Buscar/filtrar.** Por nombre, apellido o número de pasaporte. Filtros: viaje,
  estado general, alertas activas, paso de trámite pendiente. Indicador visual de alertas por
  alumno en la lista.
- **US-18 — Editar.** Todo editable en cualquier momento. Cambios de datos de pasaporte
  (nombre, número, fecha de nacimiento, vencimiento) quedan **marcados con fecha** — impactan
  la verificación de la Immigration Letter. Si cambia el vencimiento → re-validación automática
  contra el viaje. **No se puede eliminar un alumno con documentos generados; solo dar de baja.**
- **US-19 — Dar de baja.** Estado 'Baja', contador del viaje se actualiza. Fecha + motivo
  (opcional). Sigue visible en historial; desaparece de vistas activas.
- **US-19b — Credenciales del Portal de Familias.** Se **generan automáticamente al CREAR el
  alumno** (webhook o manual): usuario = email del Tutor 1 + contraseña temporal.
  *✅ RESUELTO (MIN-07, decisión 11/06/2026): identidad de auth = **email del Tutor 1**
  (compatible Better-Auth); el **DNI del alumno es selector/búsqueda**, lo que además permite
  N alumnos por grupo familiar con una sola cuenta.* **NO se
  envían automáticamente** — el envío es acción deliberada del admin (botón "Enviar acceso al
  Portal de Familias" en el perfil). El perfil muestra el estado: 'Acceso no enviado' /
  'Acceso enviado — fecha'. El email sale de info@jovenesenuk.com con usuario, contraseña
  temporal y link. El acceso queda activo desde el envío, sin importar el estado del viaje.
  **Baja del alumno → credenciales desactivadas automáticamente.**

### Estados del estudiante

| Estado | Significado |
|---|---|
| Pre-inscripto | Llenó el form JUK, pendiente de procesamiento |
| Inscripto | Procesado y asignado a un viaje activo |
| Activo | Trámites en curso, viaje próximo |
| Viajando | Actualmente en destino |
| Finalizado | Regresó de su viaje |
| Baja | Canceló su participación |

### Reglas de negocio

- **Pasaporte UK:** vencimiento ≥ fecha de fin del viaje (sin 6 meses extra). Validación
  automática al asignar + alerta si no cumple.
- **Pasaporte otros países:** alerta si vence dentro de los 6 meses posteriores al fin del
  viaje. **Configurable por país.**
- **Visibilidad:** el representante ve datos personales y de contacto del alumno y la familia.
  Notas de salud y observaciones internas: solo admins.
- **Multi-viaje:** asignaciones en distintas temporadas, cada una con tablero independiente.
- **Alumno de colegio cliente:** NO hay campo propio; se deduce del viaje asignado. Cada salida
  de colegio cliente tiene **su propio link de Application Form**; el webhook asocia el alumno
  al viaje (y por extensión al colegio cliente) automáticamente.
- **Solo el admin edita datos del alumno** (cerrado por María: si la familia editara, no habría
  registro de quién cambió qué ni versión vigente).

---

## Módulo 6 — Seguimiento del alumno (Paso 0 + Grupos A/B/C/D)

**Objetivo:** centralizar todos los trámites individuales que el alumno completa antes del
viaje: visibilidad de estado, documentos, recordatorios automáticos y alertas de demora.

### Estructura del tablero

```
Paso 0 — Origen del alumno en JUK (referencia, solo lectura)
Grupo A — Inscripción y programa     A1 Application Form del colegio
                                     A2 Test de Nivel
                                     A3 Parental Consent
Grupo B — Pagos                      B1 Plan de cuotas
                                     B2 Último pago presencial
Grupo C — Documentación de viaje     C1 ETA
                                     C2 Immigration Letter
                                     C3 Accommodation Letter
Grupo D — Documentación legal AR     D1 Autorización ante escribano
                                     D2 Certificado de aptitud psicofísica
```

Equivalencia con la numeración vieja (v1.7 y anteriores): A1=P1, A2=P4, A3=P5, B1=P2, B2=P10,
C1=P7, C2=P3, C3=P6, D1=P8, D2=P9.

**Activación:** todos los pasos se activan **al asignar el alumno a un viaje**, sin importar el
estado del viaje. Los condicionales se marcan N/A automáticamente en ese momento según la
configuración documental del colegio (US-05b) y las reglas del viaje. **Reasignación a otro
viaje → todos los pasos se resetean** al estado inicial del nuevo viaje.

**Dependencias:** los grupos son paralelos entre sí. Única dependencia formal: **C2 requiere B1
Completado**. C1 (ETA) no tiene dependencia formal pero se recomienda tramitarlo antes del
primer pago de B1.

**Estados de los pasos:** Pendiente · En progreso · Completado · Bloqueado · N/A · **Vencido**
(aplica a A1 cuando pasa la fecha límite sin completar).

**Reglas de N/A automático:**

| Paso | N/A cuando |
|---|---|
| A1 | Colegio lo configura N/A |
| A2 | Colegio lo configura N/A |
| A3 | Colegio lo configura N/A **o** alumno ≥18 años al inicio del viaje (✅ MIN-13 resuelto: "Opcional" = paso ACTIVO pero excluido de completitud y alertas; solo "N/A" desactiva) |
| B2 | Tipo de representante = Colegio cliente o JUK (directo) |
| C1 | País destino ≠ UK (Irlanda: no requiere nada; USA/Canadá: VISA obligatoria, flujo v2) |
| D1 | Alumno ≥18 años al inicio del viaje |
| D2 | Viaje Individual (sin GL) |

### Paso 0 — Origen del alumno (US-00)

Punto de entrada, **solo lectura** (no se puede modificar ni completar a mano). Registra canal
y fecha exacta de la primera interacción:
- Vía Google Form → Completado automático con fecha y hora del envío del form.
- Alta manual → 'Alta manual' con fecha y usuario responsable.
- El Portal de Familias lo muestra como primer evento del timeline.

### Grupo A — Inscripción y programa

**A1 — Application Form del colegio.** Cada colegio tiene su AF (PDF) que el alumno completa y
devuelve. Flujo: JUK descarga el AF del portal (M3) → lo envía a la familia por email → la
familia lo completa, firma y devuelve → JUK verifica y carga → Completado.
- **US-20:** fecha límite por alumno (default **heredado del viaje**, sobreescribible).
  Recordatorios automáticos a la familia a los **14, 7, 3 días antes y el día anterior**.
  Vencida la fecha sin entrega → estado **'Vencido'** (NO bloquea) + alerta activa. Se puede
  cargar el archivo completado. Al completar se registra fecha de entrega. La vista del viaje
  muestra cuántos alumnos completaron vs. total.
- Alertas: recordatorios 14/7/3/1; alerta interna si viaje a <30 días y paso Pendiente.

**A2 — Test de Nivel.** Depende del colegio (config US-05b). En algunos colegios el resultado
viene en la Immigration Letter.
- **US-27:** N/A automático si el colegio lo configura N/A. Resultado (nivel asignado) como
  texto. Si viene en la Immigration Letter, se puede registrar desde ese paso.
- Alerta: requerido y viaje a <30 días sin completar.

**A3 — Parental Consent.** El colegio destino lo envía a JUK. **Dos versiones según edad al
inicio del viaje: <16 años y 16–17 años.** N/A si el colegio lo configura N/A o si el alumno
es ≥18 al inicio.
- **US-28:** el sistema calcula la edad al inicio del viaje y muestra qué versión aplica
  (<16 / 16-17). **Advierte si el alumno cumple 16 entre el alta y el inicio del viaje.**
  *⚠️ AMBIGUO (****MIN-01****): Familias v1.11 y el Modelo (RV-11) determinan la versión "al
  momento de la descarga", no por edad al inicio. Además el M3 tiene UN archivo de Parental
  Consent pero acá hay DOS versiones: ¿el colegio sube ambas?*
- **US-29:** sub-estados **Enviado a familia / Firmado por familia / Recibido y archivado**. Se
  puede cargar el escaneado firmado; al cargarlo → Completado.
- Alerta: menor de 18 sin PC devuelto **3 meses antes** del viaje.

### Grupo B — Pagos

Los pagos **no son online** y son en cuotas. La agencia externa (o JUK) informa quién pagó;
JUK registra en el portal.

**B1 — Plan de cuotas.** Registro cuota a cuota. Canal de pago ('Vía agencia' / 'Presencial
JUK') **auto-asignado** según el tipo de representante del viaje.
- Campos por cuota: plan de pagos ★ (número de cuotas y montos acordados), N° de cuota ★,
  monto ★ (en la moneda acordada), fecha de vencimiento ★, fecha de pago efectivo ◇, canal ★
  (calculado), observaciones ◇.

> ✅ RESUELTO (CRIT-05, decisión 11/06/2026 ⭐ validar con Felix): **multi-moneda** — `moneda`
> ENUM (`USD|GBP|ARS`) + monto + cotización opcional, **default USD** (lo que dicen Modelo
> v1.7 y Familias v1.11).
- **US-22:** alta de cuotas con vencimiento y monto; al confirmar pago se registra fecha
  efectiva y canal; **saldo pendiente calculado automáticamente**; B1 Completado cuando todas
  las cuotas están saldadas.
- **US-23:** alerta interna **al día siguiente** del vencimiento impago; se agrupan en el panel
  'Pagos en mora' del dashboard; muestran alumno, viaje, cuota, monto, días de mora; **mora >7
  días → email a los admins** desde info@.
- **US-24:** sección 'Pagos' en el detalle del viaje: por alumno cuotas pagas/total, monto
  abonado, saldo, días de mora; orden por mora, saldo o nombre.

**B2 — Último pago presencial.** Solo Independiente/Instituto. **No es un pago adicional: es
una vista especializada sobre la ÚLTIMA cuota de B1** (sin registro duplicado).
- Al confirmar B2 → la última cuota de B1 pasa a canal 'Presencial JUK' con fecha de pago.
- B2 Completado cuando la última cuota de B1 está pagada con canal 'Presencial JUK'.
- **US-35:** activo solo para Independiente/Instituto; N/A automático para Colegio cliente y
  JUK directo. Sin doble contabilización.
- Alerta: viaje a <14 días con B2 Pendiente (para quienes lo requieren).

### Grupo C — Documentación de viaje

**C1 — ETA.** Documentación de entrada a UK; el alumno la tramita vía app con escaneo de
pasaporte. JUK tiene instructivo propio. Recomendado antes del primer pago (no bloqueante).
- **Por país destino:** UK → aplica; **rechazo → gestionar VISA de turista UK** como
  alternativa. USA/Canadá → VISA obligatoria, C1 = N/A (flujo VISA en v2). Irlanda → ni ETA ni
  VISA para argentinos, C1 = N/A. En v1, el país del viaje determina si C1 está activo.
- **US-31:** estados **Pendiente / En trámite / Aprobado / Rechazado**. Al Aprobar puede
  pedirse el **número de autorización ETA (opcional)**. **Rechazado → paso Bloqueado + alerta
  crítica.** Advertencia si se va a registrar el primer pago con ETA Pendiente.
- **US-32:** instructivo de ETA subido al portal como recurso descargable; botón "Enviar
  instructivo" → email con link desde info@.

**C2 — Immigration Letter.** El colegio envía un Word por alumno; JUK verifica datos críticos
antes de reenviarlo. **Habilitado solo con B1 Completado.**
- Verificaciones obligatorias: número de pasaporte, nombre completo (como en el pasaporte) y
  fecha de nacimiento — coincidencia exacta contra el sistema.
- **US-25:** carga del Word; el sistema muestra los datos clave del alumno al lado del archivo
  para verificación manual; error detectado → **Bloqueado con nota**; datos correctos →
  Completado.
- Alertas: pagos completos y la letter >15 días sin tramitar; viaje a <45 días sin letter.

**C3 — Accommodation Letter.** El colegio informa el alojamiento; la familia valida que sus
preferencias del AF estén reflejadas.
- **US-30:** carga del archivo; registro de validación familiar (**Sí / No / Con
  observaciones**); con observaciones → **Bloqueado** hasta resolver con el colegio.
- Alerta: viaje a <**3 meses** sin Accommodation Letter confirmada.

### Grupo D — Documentación legal argentina

**D1 — Autorización de viaje (escribano).** Para menores de 18 al inicio del viaje; el
documento se lleva el día del viaje. ≥18 → N/A automático.
- **US-33:** recordatorios automáticos a la familia a los **90, 60 y 30 días** antes del viaje
  desde info@. Se registra cuando la familia confirma el trámite.
- Alertas: viaje a <30 días sin confirmación; **CRÍTICA** si viaje a <7 días y Pendiente.

**D2 — Certificado de aptitud psicofísica.** **Del alumno**, para viajes **Grupales** con
adulto acompañante (GL). Individual (sin GL) → N/A automático.
- **US-34:** Grupal con ≥1 GL → Pendiente hasta cargar el certificado de cada alumno. Se carga
  PDF o foto. **La verificación del contenido (aptitud física Y psicológica) es manual por
  JUK** — el sistema no valida el texto.
- Alerta: pendiente y viaje a <**3 meses**.

### Roadmap v2 — pasos dinámicos (NO v1)

En v2 el admin podrá definir pasos adicionales por colegio (nombre, descripción, orden,
dependencias, condición de activación). Referencia de diseño: tabla `pasos_dinamicos_colegio`
(colegio_id, nombre_paso, descripcion, orden, bloqueado_por FK, aplica_si). Fuera de v1.

### Preguntas abiertas — M6

- ¿Recordatorios desde info@ o noreply@? ✅ **Resuelta (MIN-09):** automáticos desde noreply@,
  configurable en `/configuracion`.
- ¿Paso de gestión de VISA para USA/Canadá en v2 o PRD separado? **Abierta.**

---

## Módulo 7 — Seguimiento del viaje (5 pasos)

**Objetivo:** los 5 trámites a nivel de viaje (no por alumno), responsabilidad del equipo JUK
y/o del representante.

**Estados de los pasos:** Pendiente · En progreso · Completado · Bloqueado. (Más N/A para P5 en
Individuales y los sub-estados propios de cada paso.)

### Paso 1 — Pasajes

- **Grupal:** JUK coordina con la agencia de viajes. Sub-estados: **Pendiente cotización →
  Cotizado → Confirmado → Emitido**. Se puede cargar el archivo de e-tickets.
- **Individual:** el alumno compra sus pasajes. Sub-estados simplificados: **Pendiente datos /
  Datos recibidos**. Sin cotización ni emisión por JUK.
- **US-37:** en ambos tipos se registran número de vuelo, aerolínea, aeropuerto de salida, hora
  de salida, hora de llegada estimada. Al registrar el vuelo (Grupal: Confirmado; Individual:
  Datos recibidos) → opción de notificar a alumno/familia con los datos desde info@.
- Alertas: viaje a <60 días en Pendiente cotización; viaje a <30 días sin Emitir.

### Paso 2 — Excursiones

JUK carga propuestas; el representante aprueba desde su portal.
- **US-38:** lista de excursiones con nombre, fecha, proveedor, costo estimado. Estados por
  excursión: **Propuesta / Aprobada por representante / Confirmada / Cancelada**. El
  representante aprueba/rechaza desde su vista; **un admin puede aprobar en nombre del
  representante cuando éste lo comunica por email — debe quedar registrado con una nota**
  (cerrado por María). Todas confirmadas → paso Completado.

> ✅ RESUELTO (CRIT-04, decisión 11/06/2026 ⭐ validar con equipo): **el representante aprueba**
> (esta US manda); las "solicitudes de cambio" del PRD Representante v1.10 quedan como
> mecanismo adicional para proponer modificaciones, no reemplazan la aprobación.

### Paso 3 — Transfers

JUK contrata transfers aeropuerto ↔ alojamiento a través del colegio destino.
- **Dependencia: requiere Paso 1 al menos en Confirmado** (hace falta la hora de llegada).
- **US-39:** registro de proveedor (el colegio), horarios y costo por alumno. **Asignación de
  transfer a cada alumno según su alojamiento.** Completado cuando todos los alumnos activos
  tienen transfer. **Baja de un alumno → su transfer se libera y genera alerta de revisión.**

### Paso 4 — Tarjeta de transporte público

Ej: Oyster Card. JUK gestiona y distribuye a través del colegio.
- **US-40:** tipo de tarjeta, cantidad solicitada, costo, proveedor (el colegio). **Marca por
  alumno de recepción de su tarjeta.** Completado cuando todos los alumnos activos tienen
  tarjeta. Carga de comprobante de compra.

### Paso 5 — Police checks de group leaders

GLs que acompañan a menores de 18 necesitan police check vigente (lo exige el colegio destino).
**Por GL, no por alumno** (corregido desde versiones viejas del PRD, ex-CRIT-03). Se tramitan
en **argentina.gob.ar**. Individual (sin GL) → **N/A automático al crear el viaje**.
- **US-41:** estado por GL: **Pendiente / En trámite / Aprobado / Vencido**. Carga del
  documento aprobado. Registro de **fecha de emisión y de vencimiento**. Paso Completado cuando
  **todos los GLs del viaje tienen police check Aprobado vigente**.
- Alertas: GL con check vencido o que vence en <30 días; viaje a <30 días con algún GL sin
  Aprobado. **Plazo mínimo recomendado: aprobado 30 días antes del inicio** (cerrado por María).

---

## Apéndice — Preguntas abiertas al cierre de v1.13

| Módulo | Área | Pregunta |
|---|---|---|
| M4 | Multi-destino | ¿Un viaje con dos colegios destino en futuras versiones? |
| M4 | Precios | ¿Campo de precio por alumno / cálculo del precio final con las 3 comisiones? ¿v1 o futuro? |
| M6 | Email sistema | ~~¿Recordatorios desde info@ o noreply@?~~ Resuelta: MIN-09 |
| M6/C1 | VISA | ¿Flujo de VISA para USA/Canadá en v2 o PRD separado? |

## Historial de cambios relevante (para entender por qué el código viejo difiere)

- **v1.2:** se eliminó el estado Borrador; Confirmado automático a los 5 alumnos; altas/bajas
  también en Confirmado; aparece 'Tipo de representante'; **se eliminó "Datos de facturación"
  del alumno**; se eliminó el ABM de Colegio cliente como entidad.
- **v1.3:** credenciales del Portal de Familias se generan al CREAR el alumno (no al asignar);
  NPS en dashboard; credenciales del representante al asignarlo al viaje.
- **v1.4:** viajes Individuales (`tipo_viaje`), 'JUK (directo)', N/A por mayoría de edad.
- **v1.5 (María):** Colegio cliente = vía agencia SIN excepción presencial (ex CRIT-01);
  alerta conservadora de pasaporte 6 meses post-inicio; psicofísico = todos los Grupales con GL
  (ex CRIT-03); police checks en argentina.gob.ar, 30 días antes.
- **v1.7:** configuración documental por colegio (`colegio_documento_config`, US-05b) —
  reemplaza las reglas hardcodeadas "solo Wimbledon".
- **v1.8:** **reestructura del M6: Paso 0 + Grupos A/B/C/D** (renombre completo de pasos);
  estado 'Vencido' para A1; B2 redefinido como vista sobre la última cuota de B1.
- **v1.9:** ENUM `Admin_JUK` → `Admin`; `SuperAdmin` reservado v2.
- **v1.10:** calendario visual + métricas históricas en dashboard; resumen semanal a los 4
  admins; ETA por país; distinción representante vs. GL físico.
- **v1.11/v1.12:** umbrales C3 y D2 a 3 meses; cierres de coordinación con Portal de Familias.
- **v1.13:** precisión del panel de alertas críticas; indicador azul de capacidad en 'Viajes
  del próximo año'; roadmap v2 de contratos con colegios (Delfina).
