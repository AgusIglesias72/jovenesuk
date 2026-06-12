# 05 · Vista del Representante

> **Fuente:** PRD Vista del Representante **v1.10** (mayo 2026, última revisión incorporada junio 2026). Raw completo en [`fuentes/vista-representante-v1.10.md`](fuentes/vista-representante-v1.10.md).
> **Estado: NO construida.** Esta es la spec objetivo del portal de representantes (group leaders externos). El portal interno ya tiene piezas que esta vista reutiliza — ver [Puntos de contacto](#puntos-de-contacto-con-el-portal-interno) e [Implicancias para el código actual](#implicancias-para-el-código-actual).

---

## Resumen

Los **Representantes** son líderes freelance o dueños de institutos argentinos que viajan con los grupos de alumnos; son **siempre externos a JUK**. Acceden al **mismo portal** que el equipo JUK (mismo login) pero con una vista acotada: **solo ven su propio viaje y sus propios alumnos**.

El objetivo de la vista es darle al Representante lo que necesita para acompañar a su grupo antes y durante el viaje: estado documental de cada alumno, calendario de actividades, mapa de ubicaciones y condiciones de salud relevantes — **sin acceso a información sensible ni capacidad de modificar datos** en el sistema.

### Arquitectura de módulos

El login es el mismo punto de entrada que el Portal de Gestión Interno (PRD interno, Módulo 1); este PRD documenta solo el comportamiento diferencial post-autenticación.

| # | Módulo | Descripción |
|---|---|---|
| 1 | Acceso del Representante | Comportamiento diferencial post-login: credenciales, dashboard propio, gestión de cuenta. |
| 2 | Mi Viaje | Calendario de clases y actividades, solicitud de cambios, transfer e itinerario descargable. |
| 3 | Mis Estudiantes | Panel de estados de los pasos del alumno (Paso 0 + grupos A, B, C, D). Incluye perfil de salud y toggle de vista mapa. |
| 4 | Diario de Viaje | Publicación de novedades, fotos y videos durante el viaje. Canal de mensajes con familias. Disponible solo en estado En curso. |

### Principios rectores

- **Solo su viaje:** el Representante nunca ve ni accede a información de otros viajes, bajo ninguna circunstancia.
- **Solo puede solicitar, no confirmar:** puede proponer cambios en el calendario o actividades, pero JUK debe aprobar o rechazar cada solicitud.
- **Solo lectura sobre datos de alumnos:** no puede editar datos personales ni cambiar el estado de ningún paso de seguimiento.
- **Datos de facturación invisibles:** CUIL/CUIT, razón social y condición fiscal de los alumnos no son accesibles en ninguna circunstancia.
- **Dependencia de datos cargados por JUK:** el mapa de ubicaciones y la sección de salud solo muestran información cuando JUK la cargó en el sistema.
- **Diseño para usuario no técnico:** claridad sobre densidad. Cualquier Representante debe poder operar sin capacitación técnica previa; no todos son usuarios frecuentes de software de gestión.

### Lineamientos de UX (transversales a todos los módulos)

- **Una acción principal por pantalla.** El Representante nunca debe adivinar qué hacer a continuación. Si hay una tarea urgente, el sistema la muestra proactivamente en un "Panel de atención" con lenguaje directo (ej: "3 alumnos tienen C1 (ETA) pendiente").
- **Íconos siempre con etiqueta de texto.** Ningún ícono aparece solo. Los colores de estado (verde, rojo, naranja) se acompañan siempre de un ícono con forma diferenciada, legible sin depender de la percepción del color.
- **Lenguaje cotidiano.** Español simple y directo, sin tecnicismos ni anglicismos. Ej: "Ver mi viaje" (no "Navegar al módulo de itinerario"), "Algo salió mal. Intentá de nuevo" (no "Error 500"), "Listo, tu solicitud fue enviada" (no "Request submitted successfully").
- **Confirmación de cada acción.** Toda acción completada (enviar un email, subir una foto, mandar una solicitud) muestra un mensaje de confirmación visible. Nunca debe quedar la duda de si algo funcionó.
- **Mensajes de error con instrucción.** El mensaje explica qué pasó y qué hacer; nunca códigos técnicos.
- **Revelación progresiva.** La información compleja (ej: detalle de pasos) vive detrás de un clic; la vista principal muestra solo lo esencial.
- **Mobile-first en el Módulo 4.** El Diario de Viaje se publica desde el destino, en movimiento, desde el celular. El botón de carga de fotos debe ser el elemento más prominente del formulario. Si la experiencia mobile es deficiente, el Representante no publica con la frecuencia esperada.

---

## Módulo 1 — Acceso del Representante

### Objetivo

Comportamiento diferencial del portal cuando inicia sesión un Representante. La mecánica de autenticación (formulario de login, expiración de sesión, log de auditoría, recuperación de contraseña) es **compartida** con el portal interno (PRD interno, Módulo 1). Este módulo cubre solo lo propio del Representante: cómo obtiene acceso, a qué aterriza y cómo se gestiona su cuenta.

### US-1.1 — Aterrizaje en el dashboard propio al iniciar sesión

*Como Representante, quiero que al iniciar sesión el sistema me lleve directamente a mi dashboard personal para no tener que navegar desde el dashboard de JUK ni ver información que no me corresponde.*

**Criterios de aceptación:**

- Al autenticarse con rol Representante, redirección automática a su dashboard, que muestra: nombre del viaje asignado, días hasta la partida, resumen de alertas activas del grupo y accesos directos a los 4 módulos.
- Si intenta acceder por URL directa a cualquier módulo del portal de Admin JUK, se lo redirige a su dashboard con el aviso "Sin acceso".
- El dashboard no muestra ningún dato de otros viajes ni de otros representantes.
- Si tiene más de un viaje activo, el dashboard muestra un **selector de viaje**; debe elegir uno para operar.
- Diseño — claridad de navegación: los 4 módulos como tarjetas grandes con ícono prominente y etiqueta de texto. El módulo con la acción más urgente se resalta sobre los demás.
- Diseño — panel de atención inmediata: si hay alertas activas, un banner superior describe la situación en lenguaje directo con botón de acción inmediata (ej: "2 alumnos tienen C1 rechazado → Ver alumnos").
- Primer ingreso: guía de bienvenida de 3 pasos ("1. Cambiá tu contraseña · 2. Revisá el calendario de tu viaje · 3. Controlá el estado de tus alumnos"). Desaparece al completar los 3 pasos o al descartarla manualmente.

### US-1.2 — Creación y activación de credenciales por parte de JUK

*Como admin JUK, quiero poder crear las credenciales del Representante desde el ABM de Viajes para no tener que gestionar el acceso fuera del portal.*

**Criterios de aceptación:**

- **Al asignar un Representante a un viaje en el ABM de Viajes, el sistema crea las credenciales si no existen y el acceso queda activo de inmediato, independientemente del estado del viaje.**
- El sistema envía un email de bienvenida con su usuario (su email) y una contraseña temporal que debe cambiar en el primer ingreso.
- Un admin JUK puede resetear la contraseña de un Representante desde el ABM de Viajes en cualquier momento.
- Un Representante con cuenta existente puede ser asignado a un nuevo viaje sin crear credenciales nuevas; su cuenta recibe acceso al nuevo viaje.
- Diseño del email de bienvenida: botón grande "Ingresar al portal", instrucciones en 3 pasos simples en español y el nombre del viaje asignado. Sin jerga técnica ni instrucciones ambiguas.
- Cambio de contraseña en el primer ingreso: formulario guiado con indicador de fortaleza; si no cumple los requisitos, el error explica exactamente qué falta.

### US-1.3 — Gestión de acceso y visibilidad de viajes finalizados

*Como Representante, quiero mantener acceso al portal y poder ver mis viajes anteriores una vez finalizados para consultar información histórica cuando lo necesite.*

**Criterios de aceptación:**

- Acceso **permanente** al portal: no hay desactivación automática al finalizar un viaje.
- Los viajes finalizados aparecen en el selector con la etiqueta "Finalizado", accesibles en modo solo lectura.
- Un admin JUK puede modificar o revocar el acceso manualmente desde el ABM de Viajes en cualquier momento.
- Si el viaje es **cancelado**, el Representante pasa a acceso de solo lectura a ese viaje desde el momento de la cancelación.

### Reglas de negocio (Módulo 1)

- **Login compartido:** formulario, expiración de sesión (8 hs de inactividad), log de auditoría y recuperación de contraseña son los mismos que para admins JUK (PRD interno, Módulo 1).
- **Rol único por cuenta:** una cuenta no puede tener simultáneamente rol Admin JUK y rol Representante.
- **Un Representante, múltiples viajes:** una misma cuenta puede estar asignada a múltiples viajes (activos y finalizados); el selector permite cambiar de contexto.
- **Acceso permanente:** los Representantes conservan acceso indefinido; JUK administra los accesos manualmente si hay que revocarlos.
- **Sin 2FA en v1.**

### Preguntas cerradas (Módulo 1)

- **RESUELTO** — Timing de activación de credenciales: se activan al asignar el Representante al viaje, independientemente del estado del viaje. No hay ventana de días previos al inicio.
- **RESUELTO** — Cambio de email propio: el Representante lo solicita; JUK lo aprueba y actualiza manualmente.
- **RESUELTO** — Google SSO para Representantes: no se implementará.

---

## Módulo 2 — Mi Viaje: Calendario y Actividades

### Objetivo

Vista completa del itinerario: horarios de clases, actividades programadas (fijas y variables), información de transfer y descarga del itinerario completo. El Representante **puede solicitar cambios o proponer actividades especiales, pero toda modificación requiere aprobación de JUK**.

### Estructura del módulo

| Sección | Descripción | Tipo de dato |
|---|---|---|
| Calendario | Vista semanal/mensual con clases, actividades y días libres. | Del viaje |
| Actividades | Lista detallada: excursiones estándar + actividades variables con estado de aprobación e información descriptiva. | Del viaje |
| Transfer | Datos de traslado aeropuerto ↔ casas de familia según vuelo. | Del viaje |
| Itinerario completo | Documento descargable en PDF con el programa completo. | Del viaje |
| Mis solicitudes | Historial y estado de solicitudes de cambio enviadas por el Representante. | Del representante |

### US-2.1 — Ver el calendario completo del viaje

*Como Representante, quiero ver el calendario completo con clases y actividades organizadas por día para tener una visión global del programa de mi grupo.*

**Criterios de aceptación:**

- El calendario muestra el rango completo del viaje (llegada → partida), navegable semana a semana o en vista mensual.
- Cada día muestra: horario de clases en el colegio destino, actividades programadas (hora de inicio y duración estimada) y si es día libre.
- Las actividades **pagas** (fijas, fecha y horario bloqueado) se distinguen visualmente de las **variables** (sujetas a modificación por clima u otros imprevistos).
- Los días festivos del país de destino relevantes para el viaje están marcados.
- El calendario es visible para el Representante **desde el momento de creación del viaje**. Para que sea visible para padres y alumnos o descargable como PDF, debe pasar por una **validación conjunta** Representante + JUK.
- Incluye una leyenda de tipos de actividades y estado de confirmación, siempre visible sin necesidad de desplazarse.
- Diseño — vista por defecto: la semana actual del viaje (o la primera semana si aún no comenzó), no el inicio del período.
- Diseño — días con acción pendiente: los días con solicitudes sin respuesta de JUK muestran un indicador visual (punto de color).

### US-2.2 — Ver el detalle de cada actividad

*Como Representante, quiero ver el detalle de cada actividad del calendario para poder informar y preparar a mis alumnos.*

**Criterios de aceptación:**

- Al hacer clic en una actividad: panel con nombre, descripción, fecha y hora, lugar, si es paga u opcional, y costo adicional (si aplica).
- Cada actividad tiene una descripción informativa opcional (cargada por JUK) visible como tooltip sobre el ícono de información, pensada para compartir con padres y alumnos.
- Para actividades variables, se muestra el estado de aprobación: **Por definir / Propuesta / Aprobada / Rechazada**.
- Si una actividad fue rechazada por JUK, se muestra el motivo.

### US-2.3 — Solicitar cambios o proponer actividades especiales

*Como Representante, quiero poder enviar una solicitud de cambio en el calendario o proponer una actividad especial para adaptar el programa a las necesidades de mi grupo, sabiendo que JUK debe aprobarla.*

**Criterios de aceptación:**

- Puede iniciar una solicitud desde cualquier día del calendario con "Solicitar cambio" o "Proponer actividad", **incluso antes de que el viaje esté en estado Confirmado**.
- Formulario: tipo de solicitud (cambio de horario / actividad nueva / cancelación / otro), descripción libre, fecha/s afectadas y nivel de urgencia (urgente / normal).
- Al enviar, el sistema notifica por email a info@jovenesenuk.com con todos los detalles.
- La solicitud queda registrada con estado: **Enviada / En revisión / Aprobada / Rechazada**.
- JUK tiene un plazo máximo de **7 días corridos** para responder. Si vence sin respuesta, el sistema envía una alerta interna al equipo JUK.
- El Representante recibe notificación cuando JUK cambia el estado, con el motivo si fue rechazada.
- Si JUK aprueba la solicitud, el cambio se refleja automáticamente en el calendario.
- El Representante **no puede editar el calendario directamente bajo ninguna circunstancia**.

### US-2.4 — Ver información del transfer

*Como Representante, quiero ver los datos del transfer aeropuerto ↔ casas de familia para coordinar la llegada y salida del grupo.*

**Criterios de aceptación:**

- La sección muestra: empresa de transfer, horario de llegada al aeropuerto, punto de encuentro, horario estimado de llegada a las casas y contacto local del transfer.
- El transfer de regreso se muestra de forma análoga.
- Si los datos aún no están cargados por JUK: "Información de transfer pendiente de carga. El equipo JUK la completará una vez confirmados los pasajes."

### US-2.5 — Descargar el itinerario completo

*Como Representante, quiero descargar el itinerario completo en PDF para compartirlo con los alumnos y sus familias.*

**Criterios de aceptación:**

- El botón "Descargar itinerario" se habilita **únicamente después de la validación conjunta** Representante + JUK del calendario. Antes, deshabilitado con tooltip "El itinerario requiere validación antes de poder descargarse".
- El PDF incluye: datos del viaje (fechas, colegio destino, destino), calendario completo con actividades confirmadas, datos de transfer y contactos de emergencia.
- Las actividades pagas (fijas) se identifican con un indicador diferenciado (ej: borde o ícono de candado).
- Leyenda obligatoria: "Las actividades no pagas están sujetas a cambio y/o modificaciones sin previo aviso."
- Las actividades "por confirmar" se incluyen con indicación explícita de pendiente de confirmación.
- Nombre de archivo: `JUK_Itinerario_[NombreViaje]_[Año].pdf`.

### Reglas de negocio (Módulo 2)

**Categorías de actividades:**

| Categoría | Descripción | ¿Modificable? | Indicador en PDF |
|---|---|---|---|
| Paga / Fija | Fecha y horario bloqueado, ya abonada (ej: obra de teatro con fecha exclusiva). | No (comprometida contractualmente) | Indicador destacado |
| Variable estándar | Excursión habitual del programa JUK, sin fecha bloqueada. Puede alterarse por clima u otros imprevistos. | Sí, con aviso | Incluida con leyenda de sujeto a cambio |
| Variable opcional con costo | Actividad adicional con costo extra, pactada previamente con aprobación de los padres. | Sí, con aviso | Incluida con leyenda de sujeto a cambio |

**Qué puede VER:** calendario completo (desde la creación del viaje); estado de aprobación y descripción de cada actividad; datos de transfer (si JUK los cargó); historial y estado de todas sus solicitudes; itinerario PDF (tras validación conjunta).

**Qué puede SOLICITAR:** cambios de horario o fecha de actividades (incluso antes de Confirmado); incorporación de actividades especiales; cancelación de una actividad variable.

**Qué NO puede hacer:** editar el calendario directamente; aprobar, rechazar o confirmar actividades; ver datos internos de JUK (costos de proveedor, márgenes, comisiones); descargar el itinerario PDF antes de la validación conjunta.

**Comportamiento según estado del viaje:**

| Estado del viaje | Comportamiento del módulo |
|---|---|
| Inscripción abierta | El calendario puede estar incompleto. Aviso: "El itinerario está en elaboración". Ya puede proponer actividades. |
| Confirmado | Calendario completo o en proceso. Disponible para validación conjunta con JUK. |
| En curso | Solo lectura. No se pueden enviar solicitudes de cambio mayores (solo reportar incidencias a JUK). |
| Finalizado / Cancelado | Solo lectura. Solicitudes de cambio deshabilitadas. |

### Alertas y notificaciones (Módulo 2)

| Tipo | Descripción |
|---|---|
| Notificación | JUK aprueba o rechaza una solicitud: email al Representante con resultado y motivo. |
| Notificación | JUK actualiza el calendario o itinerario: email informando el cambio. |
| Notificación | JUK carga los datos de transfer: email con los detalles completos. |
| Campana en portal | Ícono de notificaciones con contador de modificaciones no leídas, alternativa al email para quienes no revisan el correo con frecuencia. |
| Interna a JUK | Viaje a menos de 21 días con itinerario no validado: alerta al equipo JUK. |
| Interna a JUK | Solicitud del Representante con más de 7 días sin respuesta: alerta al equipo JUK. |

### Preguntas cerradas (Módulo 2)

- **RESUELTO** — Costo de actividades variables: pueden tener costo adicional; si lo tienen, se intenta pactarlas antes del inicio del viaje con aprobación explícita de todos los padres involucrados.
- **RESUELTO** — Propuesta de actividades antes de Confirmado: sí, en cualquier estado del viaje.
- **RESUELTO** — Plazo máximo de respuesta de JUK: 7 días corridos.
- **RESUELTO** — Itinerario descargable: documento único para el grupo; sin información personalizada por alumno (para evitar confusión si se reenvía).
- **RESUELTO** — Publicación del calendario: visible para el Representante desde la creación del viaje; para padres/alumnos y descarga requiere validación conjunta Representante + JUK.

---

## Módulo 3 — Mis Estudiantes

### Objetivo y capas

Centraliza toda la información por alumno. Tres capas accesibles desde la misma pantalla (B y C son vistas complementarias, no módulos separados):

| Capa | Nombre | Descripción |
|---|---|---|
| A | Panel de estados | Tabla con el estado de todos los pasos de seguimiento (Paso 0 + grupos A, B, C, D) por alumno. Vista principal y por defecto. |
| B | Mapa de ubicaciones | Toggle de vista alternativa: misma lista de alumnos en mapa con pins de casas y colegio destino. |
| C | Perfil del alumno | Panel lateral al seleccionar un alumno: detalle de sus pasos, datos de contacto y sección de salud. |

### 3A — Panel de Estados

**Objetivo:** tabla consolidada del estado de todos los pasos de cada alumno, para identificar rápido quién tiene documentación pendiente, bloqueada o con errores sin entrar al perfil individual.

**Estructura de pasos.** Paso 0 de solo lectura + cuatro grupos (A, B, C, D) mayormente paralelos entre sí. Solo C2 tiene dependencia formal (requiere B1 Completado).

| Grupo | Código | Nombre del paso | Notas |
|---|---|---|---|
| Paso 0 | — | Application Form JUK | Solo lectura. Cargado por el alumno/familia. Base de todos los demás pasos. |
| A | A1 | App Form colegio | |
| A | A2 | Test de Nivel | |
| A | A3 | Parental Consent | |
| B | B1 | Plan de cuotas | |
| B | B2 | Último pago presencial | N/A en Flujo JUK Directo y Colegio cliente. |
| C | C1 | ETA | Activo solo si el colegio destino está en UK. N/A automático para USA/Canadá (requieren VISA, fuera de scope v1), Irlanda (argentinos no requieren documentación) y otros destinos. |
| C | C2 | Immigration Letter | Depende de B1 (Plan de cuotas Completado). |
| C | C3 | Accommodation Letter | Activa el pin del alumno en el mapa. |
| D | D1 | Autorización escribano | |
| D | D2 | Psicofísico | N/A en viajes Individuales. |

**Estados de cada paso:**

| Estado | Significado | Color indicativo |
|---|---|---|
| Pendiente | El paso no fue iniciado. | Gris |
| En progreso | El trámite está en curso. | Azul |
| Completado | Finalizado y validado por JUK. | Verde |
| N/A | No aplica a este alumno o viaje. | Blanco / rayado |
| Bloqueado | No puede avanzar por razón específica (ej: C1 rechazado). | Rojo |

> **Nota (TEC-11.d):** el Interno v1.13 define además el estado **Vencido** (fecha límite pasada sin
> completar, aplicable a A1), que esta tabla no incluye. Agregarlo al implementar.

#### US-3.1 — Ver el tablero de pasos por alumno

*Como Representante, quiero ver en una sola tabla el estado de todos los trámites de mis alumnos para identificar de forma rápida qué está pendiente sin entrar al perfil de cada uno.*

**Criterios de aceptación:**

- Una fila por alumno: nombre completo, edad, columnas agrupadas por Paso 0 y grupos A, B, C, D (una columna por paso dentro de cada grupo).
- Cada celda muestra ícono/color del estado; al hacer clic se abre el perfil del alumno con ese paso activo.
- Ordenable por: nombre, cantidad de pasos pendientes y alertas activas.
- Filtrable por estado de paso (ej: "solo alumnos con C1 Bloqueado") y por nivel de alerta.
- Los datos de facturación (CUIL/CUIT, razón social, condición fiscal) **no aparecen en ninguna columna**.
- Panel de resumen superior: total de alumnos, % con todos los pasos completados, alertas activas por nivel y días hasta el viaje. Los contadores son clicables y filtran la tabla.
- La tabla se actualiza **en tiempo real**; fallback si la complejidad técnica lo requiere: actualización automática cada 15 minutos.
- Diseño — nombres de pasos: nombre completo al hacer hover sobre el encabezado de columna; abreviatura permitida si falta espacio, pero nunca solo un número.
- Diseño — exportación: los botones "Descargar resumen de salud" y "Exportar ubicaciones" son visibles directamente arriba de la tabla, no dentro de menús desplegables.
- **Regla C1 por país de destino:** C1 (ETA) activo únicamente cuando el colegio destino está en UK. Para cualquier otro destino, N/A automático con etiqueta "No aplica para este destino". Lógica a nivel de viaje, transparente para el Representante.

#### US-3.2 — Identificar alertas visuales por paso incompleto o bloqueado

*Como Representante, quiero ver alertas visuales destacadas cuando un alumno tiene un paso bloqueado, próximo a vencer o con datos incorrectos para actuar con anticipación.*

**Criterios de aceptación:**

- Pasos Bloqueados resaltados en rojo prominente.
- Paso con fecha límite a 3 días o menos: ícono de alerta naranja junto al estado.
- Si JUK detectó un error en la información cargada (ej: nombre del pasaporte no coincide): ícono de advertencia con detalle al hacer clic.
- Banner de resumen superior con las alertas activas más urgentes del grupo.
- Diseño — accesibilidad cromática: todos los estados combinan color y forma de ícono (ej: Completado = círculo verde con tilde; Bloqueado = rombo rojo con X; Pendiente = círculo gris vacío).
- Diseño — texto de alerta en lenguaje simple (ej: "El pasaporte de Juan López vence en 2 días. Contactar a la familia." en lugar de "C2 — Próximo vencimiento").

#### US-3.3 — Enviar email a una familia o a todas las que tienen un paso pendiente

*Como Representante, quiero contactar a familias con pasos pendientes para agilizar la gestión sin depender de JUK para cada comunicación.*

**Criterios de aceptación:**

- Desde cualquier fila: "Enviar email" a esa familia.
- En el encabezado de cada columna de paso: "Enviar email a todos" → recordatorio a todas las familias con ese paso en Pendiente o Bloqueado.
- El sistema propone un texto predeterminado en español, editable antes de enviar. Template **único para todos los viajes**, incluye el nombre del alumno cuyos datos están pendientes.
- El email incluye: nombre del alumno, paso(s) pendiente(s), plazo (si aplica) y datos de contacto de JUK.
- El Representante configura desde su perfil si los emails salen desde su email personal o desde info@jovenesenuk.com. **JUK recibe una alerta indicando cuál es el remitente configurado.**
- Las alertas automáticas del sistema (no los emails manuales) se envían desde una dirección noreply.
- El Representante **no ve las cuentas de email de los padres**; el sistema las gestiona internamente.
- Cada envío queda registrado en el portal (fecha, hora, paso(s) referenciados, individual vs. masivo).

#### US-3.4 — Configurar alertas automáticas ante anomalías

*Como Representante, quiero recibir alertas automáticas antes de que venzan los plazos de los pasos para poder actuar con anticipación y no cuando ya es tarde.*

**Criterios de aceptación:**

- Puede activar/desactivar alertas automáticas globalmente desde la configuración del módulo.
- El sistema envía alertas automáticas a las familias **3 días antes y 1 día antes** del vencimiento de cada paso (no al momento del vencimiento, cuando ya es tarde).
- Anomalías con alerta inmediata: paso que pasa a Bloqueado y C1 rechazado.
- El email automático va a la familia del alumno afectado **con copia al Representante**.
- El Representante elige entre copia de cada alerta individual o resumen diario.
- JUK tiene visibilidad de todas las alertas automáticas enviadas desde su panel de administración.

**Diferencias según tipo de viaje — Panel de Estados:**

| Condición del viaje | Comportamiento específico |
|---|---|
| Flujo JUK Directo | B2 (Último pago presencial) en N/A. No hay pago presencial en este flujo. |
| Colegio cliente | B2 en N/A. El colegio centraliza el cobro; no existe pago presencial por fuera del colegio. |
| Vía agencia (sin colegio cliente) | B2 visible y activo; Pendiente hasta que JUK lo confirma. |
| Viaje Grupal | D2 (Psicofísico) activo para todos los alumnos; genera alertas de vencimiento. |
| Viaje Individual | D2 en N/A. |
| Destino UK | C1 (ETA) activo. El alumno lo tramita vía app. Único destino donde C1 aplica. |
| Destino USA o Canadá | C1 en N/A automático con etiqueta "No aplica para este destino". Requieren VISA (fuera de scope v1). |
| Destino Irlanda | C1 en N/A automático. Los argentinos no requieren documentación de entrada a Irlanda. |
| Otros destinos | C1 en N/A automático con etiqueta "No aplica para este destino" hasta nueva definición. |

### 3B — Mapa de Ubicaciones

**Objetivo:** vista alternativa de la misma lista de alumnos en un mapa interactivo. El toggle tabla/mapa cambia la forma de ver los datos sin cambiar de módulo ni perder el filtro activo. Dos modos de agrupación: **por alumno** y **por casa de familia**.

#### US-3.5 — Alternar entre vista tabla y vista mapa

*Como Representante, quiero poder cambiar entre vista de tabla y vista de mapa para tener una lectura geográfica del grupo sin abandonar el módulo.*

**Criterios de aceptación:**

- Toggle "Tabla / Mapa" claramente visible arriba del módulo.
- Al cambiar a mapa, el filtro activo de la tabla se mantiene.
- El pin del colegio destino siempre visible, diferenciado por ícono o color.
- Toggle secundario de modos: (1) **Por alumno** — un pin por alumno en la dirección de su casa de familia; (2) **Por casa** — un pin por casa (ej: "Casa 1", "Casa 2") con el número de alumnos que viven allí. Clic en el pin de una casa despliega la lista de alumnos asignados.
- Los alumnos que comparten casa de familia aparecen agrupados bajo el mismo pin en la vista por casa.
- Los alumnos sin Accommodation Letter aparecen en una lista flotante junto al mapa con el indicador "Alojamiento pendiente de asignación".

#### US-3.6 — Ver detalle y ruta de transporte desde el pin de un alumno o casa

*Como Representante, quiero ver la dirección y la ruta de transporte público de cada alumno desde el mapa para poder orientarlos al inicio del viaje.*

**Criterios de aceptación:**

- Clic en el pin de un alumno: se abre el perfil (Capa C) con la pestaña de ubicación activa.
- Clic en el pin de una casa (vista por casa): lista de alumnos de esa casa con la ruta de transporte compartida.
- El panel muestra: nombre del alumno, dirección completa de la casa de familia, nombre de la familia anfitriona y ruta de transporte público sugerida al colegio (medio, línea/s, tiempo estimado, transbordos).
- Si no existe ruta de transporte público disponible, el sistema envía automáticamente una alerta al admin JUK indicando que la dirección puede ser incorrecta o tener problemas de geolocalización. JUK puede editar la dirección manualmente desde el portal de administración.
- Vista de lista con la ruta de todos los alumnos para planificar el grupo.

#### US-3.7 — Exportar ubicaciones del grupo

*Como Representante, quiero exportar las direcciones de mis alumnos para tenerlas disponibles offline durante el viaje.*

**Criterios de aceptación:**

- "Exportar ubicaciones" genera un PDF o planilla con: nombre del alumno, dirección de la casa de familia, nombre de la familia anfitriona y ruta de transporte sugerida.
- Incluye **solo** alumnos con Accommodation Letter confirmada.
- Formato del archivo: `JUK_Ubicaciones_[NombreViaje]_[Año]`.

**Reglas de negocio — Mapa:**

- El pin de un alumno se activa automáticamente cuando **C3 (Accommodation Letter) pasa a Completado**.
- La dirección de la casa de familia proviene **exclusivamente** de la Accommodation Letter cargada por JUK. El Representante no puede agregar, editar ni sugerir direcciones.
- Las direcciones son datos sensibles: visibles solo para el Representante de ese viaje y para admins JUK.
- Sin ninguna Accommodation Letter cargada, el mapa muestra solo el pin del colegio con: "Las ubicaciones estarán disponibles a medida que se asignen los alojamientos".
- Si una dirección no puede geolocalizarse, alerta al Representante **y** al admin JUK; JUK corrige manualmente.

### 3C — Perfil del Alumno

**Objetivo:** panel lateral (drawer) que se abre al seleccionar cualquier alumno desde la tabla o el mapa. Pestañas:

| Pestaña | Contenido |
|---|---|
| Datos generales | Nombre completo, edad, número de pasaporte (sin datos de facturación). Datos de contacto de la familia. |
| Pasos de seguimiento | Estado actual, fecha de última actualización y admin JUK que actualizó cada paso (Paso 0 + grupos A, B, C, D). El Representante **no ve observaciones internas**. Nota: las observaciones tendrán dos niveles de visibilidad (solo admin / admin + representante), a implementar en iteración futura. |
| Ubicación | Dirección de la casa de familia, familia anfitriona y ruta de transporte público sugerida. Solo visible si la Accommodation Letter está Completada. |
| Salud | Alergias, condiciones crónicas, medicación habitual y observaciones de salud. Datos del Application Form y Parental Consent (complementarios entre sí). Estado de D2 (si aplica). Acceso a tarjeta de emergencia. |

#### US-3.8 — Ver y navegar el perfil de un alumno

*Como Representante, quiero acceder a toda la información de un alumno en un panel unificado para no tener que navegar entre distintas pantallas.*

**Criterios de aceptación:**

- El panel se abre como drawer lateral sin salir de la lista principal.
- Clic en una celda de paso en la tabla: panel abierto con pestaña "Pasos" activa y ese paso resaltado.
- Clic en el pin de un alumno en el mapa: panel abierto con pestaña "Ubicación" activa.
- Navegación entre alumnos sin cerrar el panel (botones anterior/siguiente).
- Ninguna pestaña muestra datos de facturación.

#### US-3.9 — Ver información de salud del alumno

*Como Representante, quiero ver las condiciones de salud y alergias de mis alumnos para poder actuar correctamente ante una emergencia médica durante el viaje.*

**Criterios de aceptación:**

- La pestaña "Salud" muestra: alergias (alimentarias, ambientales, medicamentos), condiciones crónicas relevantes, medicación habitual (nombre, dosis, frecuencia) y observaciones especiales.
- **Condiciones críticas** (indicador de alta prioridad): alergias graves que requieran EpiPen o puedan causar anafilaxia; enfermedades que puedan requerir internación o causar daño significativo sin cuidado adecuado (epilepsia, diabetes, enfermedades respiratorias severas, entre otras). La lista puede ampliarse.
- Los datos del Application Form y del Parental Consent se muestran de forma **complementaria** (pueden tener distinto nivel de detalle sobre la misma condición). Ambas fuentes visibles.
- Los alumnos con condiciones críticas tienen indicador de alta prioridad visible desde la tabla principal (ícono de alerta médica en la fila).
- Si el Application Form del alumno no está Completado: "Información pendiente de Application Form".
- Si el viaje es Grupal, la pestaña muestra el estado de D2 con su fecha de emisión si fue cargada.
- Botón "Tarjeta de emergencia": ficha compacta (media hoja A4) con los datos críticos — nombre, fecha de nacimiento, pasaporte, alergias graves, condiciones críticas y medicación de emergencia.
- La sección de salud es accesible solo para el Representante de ese viaje y para admins JUK. Nota para iteración futura (Portal de Familias): el padre/alumno debería poder verificar su propia información de salud.

#### US-3.10 — Exportar resumen de salud del grupo

*Como Representante, quiero descargar el resumen de salud de todo el grupo en formato imprimible para llevarlo conmigo durante el viaje.*

**Criterios de aceptación:**

- "Descargar resumen de salud" disponible en la vista de tabla del módulo.
- El PDF incluye una ficha por alumno: nombre, edad, alergias, condiciones crónicas, medicación y observaciones. Sin datos de facturación.
- Lleva la leyenda **"CONFIDENCIAL"** y la fecha de generación.
- Nombre de archivo: `JUK_Salud_[NombreViaje]_[Año]_CONFIDENCIAL.pdf`.
- Cada descarga queda registrada en el log de auditoría (quién, cuándo).

### Reglas de negocio generales (Módulo 3)

**Qué puede VER:** estado de los pasos de cada alumno (Paso 0 + A, B, C, D); fecha de última actualización y admin JUK que actualizó cada paso; datos de contacto de la familia (el sistema gestiona el envío, no se exponen emails en crudo); información de salud y alergias; dirección de alojamiento y ruta de transporte (si la Accommodation Letter está Completada).

**Qué puede HACER:** enviar emails a familias (individuales o masivos por paso); activar/desactivar alertas automáticas y configurar el remitente; filtrar y ordenar la tabla; alternar tabla/mapa (por alumno o por casa); descargar exportaciones de ubicaciones y resumen de salud; generar tarjetas de emergencia individuales.

**Qué NO puede hacer:** actualizar o cambiar el estado de ningún paso (solo JUK); editar datos personales o de salud; ver datos de facturación; ver información de alumnos de otros viajes.

### Alertas que recibe el Representante (Módulo 3)

| Nivel | Trigger | Canal |
|---|---|---|
| Crítica | C1 (ETA) de un alumno rechazado. | Email inmediato |
| Crítica | Viaje en menos de 3 meses con algún paso obligatorio en Pendiente. | Email + banner en portal |
| Alta | Paso en estado Bloqueado con viaje en menos de 3 meses. | Email |
| Alta | Alumno en viaje Grupal con D2 (Psicofísico) Pendiente y fecha de inicio en menos de 3 meses. | Email |
| Normal | Plazo de un paso a 3 días de vencer (alerta anticipada). | Email automático a familia + copia al Representante |
| Normal | Plazo de un paso a 1 día de vencer (alerta final). | Email automático a familia + copia al Representante |
| Normal | Anomalía de información detectada por JUK en un paso. | Email + ícono en tabla |
| Notificación | JUK carga la Accommodation Letter de un alumno. | Email |
| Notificación | Todas las Accommodation Letters del viaje cargadas. | Email resumen |
| Notificación | JUK actualiza datos de salud de un alumno. | Email |

> ⚠️ AMBIGUO: el PRD no define cuáles pasos son "obligatorios" a efectos de la alerta crítica "viaje en menos de 3 meses con algún paso obligatorio en Pendiente" (¿todos los activos no-N/A?).

### Preguntas del Módulo 3

- **RESUELTO** — Historial de cambios de estado: fuera del alcance de v1 (iteración futura).
- **RESUELTO** — Observaciones internas de JUK: dos niveles de visibilidad — (1) solo admin JUK; (2) admin JUK + Representante. Útil para notas sobre comportamiento del alumno, la familia, situaciones especiales. A implementar en iteración futura junto con el sistema de observaciones.
- **RESUELTO** — Template de email automático: único para todos los viajes; incluye el nombre del alumno con datos pendientes.
- **RESUELTO** — Frecuencia de actualización de la tabla: tiempo real; fallback cada 15 minutos.
- **RESUELTO** — Condiciones de salud críticas: alergias graves (anafilaxia, EpiPen), epilepsia, diabetes, enfermedades respiratorias severas y cualquier condición que pueda requerir internación o causar daño significativo sin cuidado adecuado.
- **RESUELTO** — Datos de salud contradictorios entre Application Form y Parental Consent: se complementan; ambas fuentes se muestran. Es poco probable que se contradigan.
- **RESUELTO** — Tarjeta de emergencia offline: no aplica, no considerar.
- **RESUELTO** — Dirección no geolocalizable: alerta automática al Representante y al admin JUK; JUK edita manualmente.
- **RESUELTO** — Mapa de actividades/excursiones: funcionalidad futura, como mapa complementario al calendario con la ruta del itinerario del día y rutas de transporte público sugeridas a cada destino.
- **PENDIENTE** — ¿Los vencimientos de pasos son bloqueantes para el alumno o el viaje? ¿Qué impacto operativo concreto tienen si un paso vence sin completarse? (Única pregunta abierta de todo el PRD.)

---

## Módulo 4 — Diario de Viaje

### Objetivo

Permitir a la Representante documentar y compartir el día a día del viaje con las familias de su grupo a través del **Portal de Familias** (resuelve la responsabilidad del PRD Portal de Familias v1.11, Módulo 7). Incluye un canal asíncrono de mensajes para recibir y responder consultas individuales de los padres.

**PRIORIDAD de diseño: mobile-first.** La Representante publica desde el destino, en movimiento, desde su teléfono: campos grandes, botón de carga de fotos prominente, sin desplazamiento horizontal. Se recomienda evaluar una app nativa o PWA en una iteración futura.

**El módulo está disponible únicamente cuando el viaje está En curso.** En cualquier otro estado, acceso de solo lectura.

### Estructura del módulo

| Sección | Descripción |
|---|---|
| Publicar entrada | Crear una nueva entrada diaria con texto, fotos y/o videos. |
| Historial del diario | Lista cronológica de todas las entradas publicadas en el viaje actual. |
| Mensajes de familias | Bandeja de mensajes recibidos de los padres del grupo, con opción de respuesta. |

### US-4.1 — Crear una entrada diaria en el Diario de Viaje

*Como Representante, quiero publicar una entrada con texto, fotos y videos del día para que las familias de mi grupo puedan seguir el viaje en tiempo real.*

**Criterios de aceptación:**

- Formulario: campo de texto libre (novedad del día), carga de imágenes (múltiple, JPG/PNG/HEIC) y campo de video (link externo o carga directa).
- Al publicar, el contenido es visible **de forma inmediata** para los padres del grupo en el Portal de Familias. **Sin moderación previa de JUK en v1.**
- Cada nueva entrada genera una alerta interna al equipo JUK con el contenido.
- Máximo **una entrada por día**; editable hasta **24 horas** después de publicada.
- La entrada queda asociada automáticamente al viaje activo en el contexto del selector del dashboard.
- Si tiene más de un viaje activo simultáneo, el sistema indica claramente a qué viaje corresponde la entrada antes de publicar.
- Solo se pueden crear entradas con el viaje En curso; en cualquier otro estado el botón "Publicar entrada" está deshabilitado.
- Diseño — simplicidad: por defecto solo dos elementos (campo de texto y botón grande "Agregar fotos"); las opciones adicionales (video, visibilidad) se revelan con "Más opciones".
- Diseño — confirmación: tras publicar, mensaje "¡Entrada publicada! Las familias de tu grupo ya pueden verla."

### US-4.2 — Cargar fotos y videos en una entrada

*Como Representante, quiero poder adjuntar fotos y videos a cada entrada para que las familias tengan una experiencia visual del viaje.*

**Criterios de aceptación:**

- Múltiples imágenes por entrada: JPG, PNG y HEIC.
- Video: link (YouTube, Vimeo u otro) o carga directa (MP4, MOV). Tamaño máximo de carga directa a definir con el equipo técnico, priorizando velocidad de carga sobre calidad máxima.
- Las fotos son visibles únicamente para los padres del mismo grupo; no para familias de otros viajes.
- Progreso de carga de archivos pesados con barra visible y porcentaje (clave en conexiones lentas desde el extranjero).
- Si la carga falla: mensaje simple con instrucción ("No se pudo subir la foto. Revisá tu conexión e intentá de nuevo.") y **el texto del campo no se pierde**.
- Diseño — móvil: el botón de agregar fotos activa directamente la galería del teléfono o la cámara, sin pasos intermedios.

### US-4.3 — Ver y editar el historial de entradas publicadas

*Como Representante, quiero ver todas las entradas que publiqué durante el viaje para tener un registro cronológico y poder corregir errores.*

**Criterios de aceptación:**

- Historial en orden cronológico inverso, con fecha, texto, fotos/videos y cantidad de reacciones (emojis) y comentarios.
- Los padres y alumnos pueden reaccionar con emojis y dejar comentarios. Los comentarios se publican de forma **inmediata** en el Portal de Familias (sin aprobación previa), con límite de **280 caracteres** (definido en Portal de Familias v1.11).
- Edición del texto de una entrada hasta 24 horas después de publicarla; luego solo lectura.
- La Representante **no puede eliminar entradas**; para quitar contenido inapropiado debe contactar a JUK.
- JUK puede eliminar cualquier entrada desde el portal de administración.
- Al pasar el viaje de En curso a Finalizado, el historial queda accesible en modo lectura de forma indefinida.

### US-4.4 — Recibir y responder mensajes de las familias

*Como Representante, quiero recibir y responder los mensajes que me envían los padres de mi grupo para mantener una comunicación fluida durante el viaje sin que JUK intermedie.*

**Criterios de aceptación:**

- Bandeja con todos los mensajes de los padres del grupo, ordenados por fecha (más reciente primero).
- Cada mensaje indica: nombre del padre/madre, nombre del alumno al que corresponde y fecha/hora.
- Respuesta directa desde el portal; llega al padre por email o notificación según lo defina el Portal de Familias.
- Los mensajes son individuales por familia: no se ven mensajes cruzados entre familias.
- La Representante puede optar por hacer visible una respuesta a **todo el grupo** (ej: pregunta frecuente). Opcional, a su criterio.
- Notificación por email al recibir un mensaje nuevo, con el texto incluido para poder responder sin entrar al portal.
- **No puede iniciar conversaciones**; solo responde mensajes entrantes.
- Los mensajes sin respuesta tienen indicador visual de "no leído".
- Los mensajes solo están disponibles durante el estado En curso.

### US-4.5 — Eliminar comentarios de padres publicados en el Diario

*Como Representante, quiero poder eliminar comentarios de padres ya publicados en el Diario de Viaje para mantener un ambiente apropiado en el grupo sin tener que moderar de forma previa.*

**Criterios de aceptación:**

- Cada comentario publicado muestra un botón de eliminar visible **solo** para la Representante; padres y alumnos no lo ven.
- Confirmación previa: "¿Eliminar este comentario? Esta acción no se puede deshacer."
- Al confirmar, el comentario desaparece del feed de todos los padres del grupo de inmediato.
- El autor **no recibe ninguna notificación** de la eliminación.
- La eliminación queda registrada en el log interno: quién eliminó, qué comentario (texto completo), de qué entrada, fecha y hora. Registro visible **solo para JUK**.
- La Representante no puede restaurar comentarios eliminados; debe contactar a JUK para revisarlos.
- JUK puede eliminar cualquier comentario desde el portal de administración, con el mismo registro en el log.

### Reglas de negocio (Módulo 4)

**Activación del módulo según estado del viaje:**

| Estado del viaje | Comportamiento |
|---|---|
| Inscripción abierta / Confirmado | Módulo no visible o visible en modo lectura (sin entradas aún). |
| En curso | Completamente activo: publicación, edición, mensajes y eliminación de comentarios habilitados. |
| Finalizado | Solo lectura. Historial de entradas y mensajes accesible indefinidamente. Sin nuevas entradas ni mensajes. |
| Cancelado | Módulo no accesible. |

**Qué puede VER:** historial de entradas de su viaje activo; reacciones y comentarios publicados; mensajes recibidos de los padres de su grupo (individuales por familia).

**Qué puede HACER:** crear y editar entradas (texto, fotos, videos) con el viaje En curso; eliminar comentarios ya publicados; responder mensajes; opcionalmente hacer visible una respuesta a todo el grupo.

**Qué NO puede hacer:** ver entradas o mensajes de otros viajes o representantes; iniciar conversaciones con familias; eliminar entradas publicadas (debe contactar a JUK); publicar contenido si el viaje no está En curso.

**Visibilidad del contenido:** fotos, videos y novedades visibles exclusivamente para los padres del mismo grupo en el Portal de Familias. Sin moderación previa de entradas ni comentarios; los comentarios se publican de inmediato (límite 280 caracteres). La Representante puede eliminarlos post-publicación. JUK puede eliminar entradas y comentarios desde administración y recibe una alerta por cada entrada nueva.

**JUK puede publicar en nombre de la Representante:** en casos de excepción (ej: Representante sin acceso a internet), un admin JUK puede publicar una entrada en su nombre. La acción debe ser simple de ejecutar desde el portal de administración y queda registrada indicando que fue publicada por JUK.

### Alertas que recibe la Representante (Módulo 4)

| Tipo | Descripción |
|---|---|
| Notificación | Nuevo mensaje de un padre/madre: email inmediato con el texto del mensaje. |
| Comentario publicado | Un padre publicó un comentario en una entrada: notificación en portal, una vez por comentario. |
| Recordatorio | Viaje En curso sin entradas en las últimas 48 horas: recordatorio a la Representante. |
| Interna a JUK | Nueva entrada publicada: alerta al equipo JUK con el contenido. |
| Interna a JUK | Una entrada recibe una cantidad inusual de mensajes de familias en poco tiempo: alerta interna para que JUK revise. |

### Preguntas cerradas (Módulo 4)

- **RESUELTO** — Tamaño máximo de videos: a definir con el equipo técnico; tamaño estándar que garantice velocidad de carga sin degradar la experiencia.
- **RESUELTO** — Reacciones y comentarios: emojis + comentarios publicados de forma inmediata sin aprobación previa (límite 280 caracteres, Portal de Familias v1.11). La Representante puede eliminarlos post-publicación. El flujo de aprobación previa fue eliminado en Portal de Familias v1.11.
- **RESUELTO** — Mensajes de padres: disponibles solo durante En curso.
- **RESUELTO** — Moderación previa de JUK: no en v1; JUK actúa de forma reactiva.
- **RESUELTO** — JUK publica en nombre de la Representante: sí, como excepción ante falta de internet.

> ⚠️ AMBIGUO: el Apéndice A del PRD todavía dice "Reacciones y comentarios → emojis + comentarios con aprobación de la Representante", redacción que quedó desactualizada respecto del cuerpo v1.10 (publicación inmediata + eliminación post-publicación, US-4.5). Manda el cuerpo del documento y el changelog v1.10.

---

## Pregunta abierta consolidada (Apéndice A del PRD)

Todas las preguntas abiertas de la v1.3 fueron resueltas en la ronda de revisión de Felix Mir (mayo 2026), salvo una:

- **Módulo 3 — PENDIENTE:** ¿los vencimientos de pasos son bloqueantes para el alumno o el viaje? ¿Qué impacto operativo concreto tienen para JUK y para el Representante si un paso vence sin completarse?

---

## Tabla de permisos del Representante (Apéndice B del PRD)

| Área | Puede VER | Puede HACER | Restricciones clave |
|---|---|---|---|
| Login / Acceso | Sus propias credenciales y sesiones. Viajes activos y finalizados. | Recuperar contraseña. Elegir viaje activo. | No puede ver datos de otros usuarios ni roles. |
| Mi Viaje — Calendario | Calendario completo desde la creación del viaje. Actividades fijas y variables con estado de aprobación. | Descargar itinerario PDF (tras validación conjunta con JUK). | No puede editar el calendario directamente. |
| Mi Viaje — Solicitudes | Estado de sus solicitudes de cambio. | Enviar solicitudes de cambio o propuesta de actividad (en cualquier estado del viaje). | No puede aprobar ni rechazar actividades. |
| Mi Viaje — Transfer | Empresa, horarios, punto de encuentro, contacto local. | — | Solo lectura. JUK carga los datos. |
| Mis Estudiantes — Tabla | Estado de los pasos (Paso 0 + grupos A, B, C, D), alertas, resumen del grupo. | Filtrar, ordenar, enviar emails, configurar alertas automáticas y remitente. | No puede editar estados de pasos ni datos de alumnos. |
| Mis Estudiantes — Mapa | Pin del colegio + pins por alumno y por casa. Ruta de transporte. | Toggle tabla/mapa. Toggle por alumno/por casa. Exportar ubicaciones PDF. | No puede editar ni agregar direcciones. |
| Perfil del alumno — Salud | Alergias, condiciones crónicas, medicación, estado del psicofísico (si aplica). | Descargar resumen de salud del grupo. Generar tarjeta de emergencia individual. | No puede editar datos de salud. |
| Diario de Viaje | Historial de entradas, reacciones y comentarios publicados. Mensajes de familias. | Publicar entradas, eliminar comentarios publicados, responder mensajes (solo En curso). | Solo disponible En curso. No puede iniciar conversaciones ni ver contenido de otros viajes. |
| Facturación de alumnos | — | — | **INVISIBLE**: sin acceso bajo ninguna circunstancia. |
| Otros viajes | — | — | **INVISIBLE**: solo opera en el contexto de su viaje. |

## Historial de versiones relevante del PRD fuente

| Versión | Cambio clave |
|---|---|
| v1.10 | Comentarios de padres sin aprobación previa (publicación inmediata, 280 caracteres) + nueva US-4.5 (eliminación post-publicación con log para JUK). Alineado con Portal de Familias v1.11. |
| v1.9 | Regla C1 (ETA) por país de destino: activo solo para UK; N/A automático para USA/Canadá, Irlanda y otros. |
| v1.8 | Pasos lineales 1-10 reemplazados por Paso 0 + grupos A/B/C/D (alineado con Portal de Gestión v1.9). Sin cambios de lógica: condiciones N/A, dependencias y alertas iguales. |
| v1.7 | Lógica B2 (ex Paso 10): JUK Directo y Colegio cliente = N/A por razones distintas; Vía agencia lo mantiene activo. |
| v1.6 | Eliminado el flag deprecado `requiere_psicofisico`; D2 depende solo del tipo de viaje (Grupal = activo, Individual = N/A). |
| v1.5 | Lineamientos de UX para representantes no técnicos. |
| v1.4 | Revisión de Felix Mir: todas las preguntas abiertas resueltas salvo una. |
| v1.2 | Activación inmediata de credenciales al asignar; observaciones visibles para el Representante fuera de alcance v1. |

---

## Puntos de contacto con el Portal Interno

Esta vista comparte modelo de datos y login con el portal interno (PRD interno v1.13 — ver [`fuentes/portal-gestion-interno-v1.13.md`](fuentes/portal-gestion-interno-v1.13.md)). Dueños de cada dato:

### 1. Activación de credenciales al asignar al viaje

- **Dueño del trigger: portal interno (ABM de Viajes).** Regla del PRD interno (M1): las credenciales del Representante se activan en el momento en que es asignado al viaje, independientemente del estado del viaje; no existe ventana de días previos. Coincide con US-1.2 de esta vista.
- La **cuenta** vive en la tabla compartida `users` (rol `representante`); el email de bienvenida con contraseña temporal sale del lado interno al momento de asignar. Reset de contraseña y revocación de acceso: siempre desde el ABM de Viajes del portal interno.
- Excepción: con tipo de representante "JUK (directo)" **no se generan credenciales** (no existe persona física externa).

### 2. Aprobación de excursiones (M7 Paso 2 del portal interno)

- **Dueño del dato: portal interno.** Las excursiones y su estado (Propuesta / Aprobada por representante / Confirmada / Cancelada) viven en el paso 2 del seguimiento del viaje (M7). JUK carga las propuestas.
- El PRD interno establece que **el representante aprueba o rechaza excursiones desde su vista del viaje**, y que un admin JUK puede **aprobar en nombre del representante** cuando éste comunica su aprobación por email — debe quedar registrado en el portal **con una nota** (cerrado por María).
- > ⚠️ AMBIGUO: contradicción entre PRDs. El PRD interno (M7 Paso 2) dice que el representante "puede aprobar o rechazar excursiones desde su vista"; este PRD (Módulo 2 y Apéndice B) dice que el Representante "no puede aprobar, rechazar ni confirmar actividades — solo solicitar". Hay que cerrar con el equipo si la aprobación de excursiones propuestas por JUK es una excepción al principio "solo puede solicitar" (flujo inverso: JUK propone → representante aprueba) o si toda aprobación queda del lado admin. La US-2.2 de esta vista muestra los estados de aprobación pero asume que quien aprueba/rechaza es JUK.

### 3. NPS acumulado del representante

- **Dueño del dato: Portal de Familias** (entidad `NPS_RESPUESTA`, 1:1 con la inscripción del alumno, habilitada al pasar el viaje a Finalizado). Tres dimensiones: JUK general, Representante, Colegio UK.
- El **portal interno** solo consume: NPS del viaje = promedio de las respuestas de sus alumnos; NPS acumulado del representante = promedio de todos los viajes en los que fue GL, **visible en su perfil del portal interno** (vista de solo lectura para el admin). Viajes sin respuestas muestran "Sin datos" (no cero).
- **La Vista del Representante no incluye el NPS**: el PRD v1.10 no contempla que el representante vea su propio puntaje. Es un dato de evaluación interna de JUK.

### 4. Representante (contacto responsable) vs. group leader físico

- **Dueño de la distinción: portal interno (ABM de Viajes).** Regla del PRD interno (M4): el representante registrado en el sistema es el **contacto responsable** del viaje; el o los group leaders que **físicamente acompañan** al grupo pueden ser la misma persona o personas distintas. Hasta ahora siempre coincidieron, pero la arquitectura debe soportar que difieran. En v1, el campo "Representante (group leader principal)" registra al contacto responsable; si el GL físico es distinto, queda documentado en las notas internas del viaje.
- Consecuencia para esta vista: **la cuenta del portal es del representante (contacto responsable)**, no necesariamente de cada GL físico. Los police checks (M7 Paso 5) son de los GL físicos y se gestionan en el portal interno; esta vista no los muestra ni los gestiona.

### 5. Acceso post-viaje

- **Dueño de la política: esta vista; administración: portal interno.** Acceso permanente sin desactivación automática; viajes finalizados en solo lectura (incluido el Diario de Viaje, accesible indefinidamente); viaje cancelado → solo lectura desde la cancelación (Diario no accesible). El admin JUK puede modificar o revocar el acceso manualmente desde el ABM de Viajes en cualquier momento.

### 6. Otros datos compartidos (resumen de propiedad)

| Dato | Dueño / quién escribe | El representante… |
|---|---|---|
| Estados de pasos del alumno (Paso 0 + A/B/C/D) | Portal interno (solo JUK cambia estados) | Solo lee; ve fecha y admin de última actualización |
| Calendario, actividades, transfer, itinerario | Portal interno (JUK carga) | Lee; solicita cambios (JUK resuelve en ≤ 7 días) |
| Solicitudes de cambio | Representante (las crea) | Crea y consulta; JUK aprueba/rechaza con motivo |
| Validación del itinerario | Conjunta (Representante + JUK) | Participa; habilita PDF y visibilidad para familias |
| Direcciones de casas de familia | Portal interno (de la Accommodation Letter; JUK corrige geolocalización) | Solo lee y exporta |
| Datos de salud del alumno | Portal interno / Application Form + Parental Consent | Solo lee, exporta y genera tarjetas de emergencia |
| Datos de facturación del alumno | Portal interno | **Nunca los ve** |
| Observaciones internas de JUK | Portal interno | No las ve (doble nivel de visibilidad: iteración futura) |
| Entradas del Diario de Viaje | Representante (JUK puede eliminar y publicar en su nombre, registrado) | Crea/edita 24 hs; no elimina |
| Comentarios y mensajes de familias | Portal de Familias (familias escriben) | Lee, responde, elimina comentarios (log solo para JUK) |
| Emails a familias | Representante (manuales) / sistema (automáticos, noreply) | Envía con template editable; remitente configurable; JUK ve todo |

---

## Implicancias para el código actual

### Qué ya existe en el portal interno que esta vista reutiliza

- **Rol `representante` en `users`** (`src/lib/db/schema/users.ts`): el enum `user_role` ya lo incluye, junto con Better-Auth, sesiones de 8 hs y el corte por `isActive` en `requireSession`. El login compartido del Módulo 1 ya está construido.
- **Tabla `group_leaders`** (`src/lib/db/schema/grupos-leaders.ts`): ABM funcionando, con datos de contacto y seguimiento del police check (estado, URL, fechas). Modela hoy al **GL físico**.
- **Tabla `group_leaders_viaje` con `es_principal`** (`src/lib/db/schema/pasos-viaje.ts`): asignación N:M de GLs a viajes, con flag de principal, ya operable desde el detalle del viaje. Es el ancla natural del trigger "asignar representante → activar credenciales".
- **`pasos_viaje` (M7)**: el paso `excursiones` ya existe con metadata tipada y audit log — es donde se materializa la aprobación de excursiones del punto de contacto 2.
- **`pasos_alumno`, `asignaciones`, `alumnos`, `viajes`, `colegios`**: el roster del viaje y el esqueleto del seguimiento por alumno que alimentarían el Panel de Estados (3A).
- **`alertas` (schema) y la infra de email (Resend + React Email)**: base para las notificaciones, hoy con alertas placeholder.

### Qué falta conceptualmente

1. **Vínculo `group_leaders` ↔ `users`.** No existe FK entre el GL y una cuenta de usuario; hoy asignar un GL a un viaje no crea credenciales ni manda email de bienvenida (US-1.2). Hay que decidir cómo se modela la cuenta del representante y su acceso multi-viaje con selector de contexto.
2. **Distinción representante vs. GL físico.** `es_principal` marca un GL principal, pero el PRD interno define al representante como *contacto responsable* que puede no ser ninguno de los GL físicos. Falta decidir si el representante es un atributo del viaje apuntando a `users` o una relación aparte. También falta el origen "JUK (directo)" en el enum `viaje_origen` (hoy solo `representante_independiente | instituto | colegio_cliente`), que es el caso *sin* credenciales.
3. **Autorización por alcance ("solo su viaje").** El proxy/guards actuales distinguen admin vs. no-admin; falta todo el scoping por viaje asignado, el redirect al dashboard propio con "Sin acceso", y el layout/navegación de la vista representante.
4. **Estructura de pasos A/B/C/D.** El enum `paso_tipo` actual conserva la numeración lineal 1-10 vieja; el PRD v1.8+ usa Paso 0 + grupos A/B/C/D con N/A automáticos por destino (C1), por flujo de pago (B2) y por tipo de viaje (D2). Además `viajes` no tiene campo `tipo_viaje` (grupal/individual). Los ex CRIT-01/03 ya están resueltos (PRD Interno v1.13: B2 derivado del tipo de representante, D2 del alumno en Grupales); el único gate que hereda el Panel de Estados (3A) es **CRIT-05** (moneda de cuotas) y, para la aprobación de excursiones, **CRIT-04** (`OPEN_DECISIONS.md`).
5. **Entidades nuevas completas:** calendario/actividades del viaje (con categorías paga/variable y estados de aprobación), solicitudes de cambio, datos de transfer, validación conjunta del itinerario, casas de familia con dirección y geocoding, diario de viaje (entradas, media, reacciones, comentarios, mensajes), notificaciones in-app (campana) y preferencias de alertas/remitente del representante.
6. **Infra pendiente:** upload de archivos a R2 (hoy URLs manuales), generación de PDFs (itinerario, ubicaciones, salud, tarjeta de emergencia), geocoding y mapas con rutas de transporte público, envío con remitente configurable, jobs programados (Trigger.dev) para alertas de vencimiento 3 días / 1 día y recordatorios de 48 hs del diario, y actualización en tiempo real (o polling de 15 minutos) del panel de estados.
7. **Datos de salud estructurados.** Hoy `alumnos` solo tiene `alergiasSalud` (texto libre); el PRD pide alergias, condiciones crónicas, medicación y observaciones diferenciadas, doble fuente (Application Form + Parental Consent), y flag de condición crítica visible en la tabla.
8. **Dependencia del Portal de Familias.** El Módulo 4 entero (visibilidad de entradas, comentarios, reacciones, mensajes) y el NPS asumen un Portal de Familias que no existe; sin él, el Diario de Viaje no tiene consumidor.
