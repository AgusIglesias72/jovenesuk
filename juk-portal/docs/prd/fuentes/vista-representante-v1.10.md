__JUK — Jóvenes en UK__

__Vista del Representante__

__PRODUCT REQUIREMENTS DOCUMENT \(PRD\)  ·  v1\.10__

*Versión 1\.10  ·  Mayo 2026*

*Documento interno — Uso exclusivo del equipo JUK*

# Resumen Ejecutivo

Este documento especifica los requerimientos funcionales de la Vista del Representante dentro del Portal de Gestión Interno de JUK\. Los Representantes son líderes freelance o dueños de institutos argentinos que viajan con los grupos de alumnos; son siempre externos a JUK\. Acceden al mismo portal que el equipo JUK pero con una vista acotada: solo ven su propio viaje y sus propios alumnos\.

El objetivo de esta vista es proveer al Representante la información necesaria para acompañar a su grupo antes y durante el viaje: estado documental de cada alumno, calendario de actividades, mapa de ubicaciones y condiciones de salud relevantes; sin acceso a información sensible ni capacidad de modificar datos en el sistema\.

## Arquitectura de módulos

La Vista del Representante se organiza en cuatro módulos\. El login es el mismo punto de entrada que el Portal de Gestión Interno de JUK \(documentado en el PRD v1\.2\); este PRD solo documenta el comportamiento diferencial post\-autenticación\.

__Módulo__

__Nombre__

__Descripción__

1

Acceso del Representante

Comportamiento diferencial post\-login: credenciales, dashboard propio, gestión de cuenta\.

2

Mi Viaje

Calendario de clases y actividades, solicitud de cambios, transfer e itinerario descargable\.

3

Mis Estudiantes

Panel de estados de los pasos del alumno \(Paso 0 \+ grupos A, B, C, D\)\. Incluye perfil de salud y toggle de vista mapa\.

4

Diario de Viaje

Publicación de novedades, fotos y videos durante el viaje\. Canal de mensajes con familias\. Disponible solo en estado En curso\.

## Principios rectores de la vista del Representante

- __Solo su viaje: __El Representante nunca ve ni accede a información de otros viajes, bajo ninguna circunstancia\.
- __Solo puede solicitar, no confirmar: __Puede proponer cambios en el calendario o actividades, pero JUK debe aprobar o rechazar cada solicitud\.
- __Solo lectura sobre datos de alumnos: __No puede editar datos personales de alumnos ni cambiar el estado de ningún paso de seguimiento\.
- __Datos de facturación invisibles: __CUIL/CUIT, razón social y condición fiscal de los alumnos no son accesibles en ninguna circunstancia\.
- __Dependencia de datos cargados por JUK: __El mapa de ubicaciones y la sección de salud solo muestran información cuando JUK la ha cargado en el sistema\.
- __Diseño para el usuario no técnico: __La interfaz prioriza la claridad sobre la densidad de información\. Está pensada para que cualquier Representante pueda operar sin capacitación técnica previa\. No todos los representantes son usuarios frecuentes de software de gestión\.

## Lineamientos de diseño y experiencia de usuario

Dado que los Representantes son líderes freelance o dueños de institutos con niveles muy variados de familiaridad tecnológica, el diseño de la Vista del Representante debe respetar los siguientes lineamientos de forma transversal en todos los módulos:

- __Una acción principal por pantalla: __Cada vista tiene un elemento de acción dominante y claramente identificable\. El Representante nunca debe adivinar qué hacer a continuación\. Si hay una tarea urgente, el sistema la muestra proactivamente en un "Panel de atención" con lenguaje directo \(ej: "3 alumnos tienen C1 \(ETA\) pendiente"\)\.
- __Íconos siempre con etiqueta de texto: __Ningún ícono aparece solo\. Todo ícono de navegación, acción o estado lleva su etiqueta de texto debajo o al lado\. Los colores de estado \(verde, rojo, naranja\) se acompañan siempre de un ícono con forma diferenciada para que sean legibles sin depender de la percepción del color\.
- __Lenguaje cotidiano: __Todos los botones, etiquetas, mensajes y notificaciones usan vocabulario simple y directo en español\. Se evitan términos técnicos y anglicismos\. Ejemplos: "Ver mi viaje" \(no "Navegar al módulo de itinerario"\), "Algo salió mal\. Intentá de nuevo" \(no "Error 500"\), "Listo, tu solicitud fue enviada" \(no "Request submitted successfully"\)\.
- __Confirmación de cada acción: __Cada vez que el Representante completa una acción \(enviar un email, subir una foto, mandar una solicitud\), el sistema muestra un mensaje de confirmación visible en pantalla\. Nunca debe quedar la duda de si algo funcionó\.
- __Mensajes de error con instrucción: __Si algo falla, el mensaje explica qué pasó y qué debe hacer a continuación\. No se muestran códigos técnicos de error\.
- __Revelación progresiva: __La información compleja \(como el detalle de los pasos de seguimiento\) está disponible detrás de un clic, no desplegada por defecto\. La vista principal muestra solo lo esencial; el detalle aparece al solicitarlo\.
- __Mobile\-first en el Módulo 4: __La publicación del Diario de Viaje ocurre desde el destino, en movimiento, desde el celular\. Esta sección debe funcionar de forma fluida en dispositivos móviles\. El botón de carga de fotos debe ser el elemento más prominente del formulario\. Si la experiencia mobile es deficiente, el Representante no publicará contenido con la frecuencia esperada\.

# Módulo 1 — Acceso del Representante

## 1\.1 Objetivo del módulo

Describir el comportamiento diferencial del portal cuando quien inicia sesión es un Representante\. La mecánica de autenticación \(formulario de login, expiración de sesión, log de auditoría, recuperación de contraseña\) es compartida con el Portal de Gestión Interno de JUK y está documentada en el PRD v1\.2, Módulo 1\. Este módulo cubre exclusivamente lo que es propio del Representante: cómo obtiene acceso, a qué aterriza y cómo se gestiona su cuenta\.

## 1\.2 User Stories y Criterios de Aceptación

### __US\-1\.1 — Aterrizaje en el dashboard propio al iniciar sesión__

*Como Representante, quiero que al iniciar sesión el sistema me lleve directamente a mi dashboard personal para no tener que navegar desde el dashboard de JUK ni ver información que no me corresponde\.*

### __Criterios de aceptación__

- Al autenticarse con rol Representante, el sistema redirige automáticamente al dashboard del Representante, que muestra: nombre del viaje asignado, días hasta la partida, resumen de alertas activas del grupo y accesos directos a los cuatro módulos\.
- Si el Representante intenta acceder por URL directa a cualquier módulo del portal de Admin JUK, el sistema lo redirige al dashboard del Representante con el aviso "Sin acceso"\.
- El dashboard del Representante no muestra ningún dato de otros viajes ni de otros representantes\.
- Si el Representante tiene más de un viaje activo, el dashboard muestra un selector de viaje; debe elegir uno para operar\.
- Diseño del dashboard — Claridad de navegación: los cuatro módulos se presentan como tarjetas grandes con ícono prominente y etiqueta de texto\. El acceso principal \(el módulo con la acción más urgente\) se resalta visualmente sobre los demás\.
- Diseño del dashboard — Panel de atención inmediata: si hay alertas activas, un banner en la parte superior del dashboard describe la situación en lenguaje directo y ofrece un botón de acción inmediata \(ej: "2 alumnos tienen C1 rechazado → Ver alumnos"\)\. El Representante no necesita navegar para enterarse de qué es urgente\.
- Primer ingreso al sistema: el dashboard muestra una guía de bienvenida de 3 pasos en lenguaje simple: "1\. Cambiá tu contraseña · 2\. Revisá el calendario de tu viaje · 3\. Controlá el estado de tus alumnos"\. Esta guía desaparece una vez que el Representante completa los 3 pasos o la descarta manualmente\.

### __US\-1\.2 — Creación y activación de credenciales por parte de JUK__

*Como admin JUK, quiero poder crear las credenciales del Representante desde el ABM de Viajes para no tener que gestionar el acceso fuera del portal\.*

### __Criterios de aceptación__

- Al asignar un Representante a un viaje en el ABM de Viajes, el sistema crea las credenciales si no existen y el acceso queda activo de inmediato, independientemente del estado del viaje\.
- El sistema envía un email de bienvenida al Representante con su usuario \(su email\) y una contraseña temporal que debe cambiar en el primer ingreso\.
- Un admin JUK puede resetear la contraseña de un Representante desde el ABM de Viajes en cualquier momento\.
- Un Representante que ya tiene cuenta puede ser asignado a un nuevo viaje sin necesidad de crear credenciales nuevas; su cuenta existente recibe acceso al nuevo viaje\.
- Diseño del email de bienvenida: el email incluye un botón grande de "Ingresar al portal", las instrucciones en 3 pasos simples en español, y el nombre del viaje asignado\. No debe incluir jerga técnica ni instrucciones ambiguas\.
- Cambio de contraseña en el primer ingreso: el formulario guía con instrucciones claras y muestra un indicador de fortaleza de contraseña\. Si la contraseña no cumple los requisitos, el mensaje de error explica exactamente qué falta\.

### __US\-1\.3 — Gestión de acceso y visibilidad de viajes finalizados__

*Como Representante, quiero mantener acceso al portal y poder ver mis viajes anteriores una vez finalizados para consultar información histórica cuando lo necesite\.*

### __Criterios de aceptación__

- El Representante mantiene acceso permanente al portal\. No hay desactivación automática de la cuenta al finalizar un viaje\.
- Los viajes finalizados aparecen en el selector del dashboard con la etiqueta "Finalizado" y son accesibles en modo solo lectura\.
- Un admin JUK puede modificar o revocar el acceso de un Representante manualmente desde el ABM de Viajes en cualquier momento\.
- Si el viaje es cancelado, el Representante pasa a tener acceso de solo lectura a ese viaje desde el momento de la cancelación\.

## 1\.3 Reglas de negocio

- __Login compartido: __El formulario de autenticación, la expiración de sesión \(8 hs de inactividad\), el log de auditoría y la recuperación de contraseña son los mismos que para admins JUK\. Ver PRD v1\.2, Módulo 1\.
- __Rol único por cuenta: __Una cuenta no puede tener simultáneamente rol de Admin JUK y rol de Representante\.
- __Un Representante, múltiples viajes: __Una misma cuenta puede estar asignada a múltiples viajes \(activos y finalizados\)\. El selector de viaje en el dashboard permite cambiar de contexto\.
- __Acceso permanente: __Los Representantes conservan acceso al portal de forma indefinida para consultar sus viajes\. Los admins JUK administran los accesos manualmente si es necesario revocarlos\.
- __Sin 2FA en v1: __No se requiere autenticación de doble factor en la versión inicial\.

## 1\.4 Preguntas abiertas

- __RESUELTO — __Timing de activación de credenciales: las credenciales se activan en el momento en que el Representante es asignado al viaje, independientemente del estado del viaje\.
- __RESUELTO — __Cambio de email propio: el Representante puede solicitarlo; JUK lo aprueba y actualiza manualmente\.
- __RESUELTO — __Google SSO para Representantes: no se implementará\.

# Módulo 2 — Mi Viaje: Calendario y Actividades

## 2\.1 Objetivo del módulo

Proveer al Representante una vista completa del itinerario de su viaje: horarios de clases, actividades programadas \(fijas y variables\), información de transfer y descarga del itinerario completo\. El Representante puede solicitar cambios o proponer actividades especiales, pero toda modificación requiere aprobación de JUK\.

## 2\.2 Estructura del módulo

__Sección__

__Descripción__

__Tipo de dato__

Calendario

Vista semanal/mensual con clases, actividades y días libres\.

Del viaje

Actividades

Lista detallada: excursiones estándar \+ actividades variables con estado de aprobación e información descriptiva\.

Del viaje

Transfer

Datos de traslado aeropuerto ↔ casas de familia según vuelo\.

Del viaje

Itinerario completo

Documento descargable en PDF con el programa completo\.

Del viaje

Mis solicitudes

Historial y estado de solicitudes de cambio enviadas por el Representante\.

Del representante

## 2\.3 User Stories y Criterios de Aceptación

### __US\-2\.1 — Ver el calendario completo del viaje__

*Como Representante, quiero ver el calendario completo con clases y actividades organizadas por día para tener una visión global del programa de mi grupo\.*

### __Criterios de aceptación__

- El calendario muestra el rango completo del viaje \(llegada → partida\), navegable semana a semana o en vista mensual\.
- Cada día muestra: horario de clases en el colegio destino, actividades programadas \(con hora de inicio y duración estimada\) y si es día libre\.
- Las actividades pagas \(fijas, con fecha y horario bloqueado\) se distinguen visualmente de las actividades variables \(sujetas a modificación por clima u otros imprevistos\)\.
- Los días festivos en el país de destino relevantes para el viaje están marcados en el calendario\.
- El calendario es visible para el Representante desde el momento de creación del viaje\. Para que sea visible para padres y alumnos o descargable como PDF, debe pasar por una validación conjunta entre el Representante y JUK\.
- El calendario incluye una leyenda de tipos de actividades y su estado de confirmación\. La leyenda es siempre visible sin necesidad de desplazarse\.
- Diseño — vista por defecto: al abrir el módulo, el calendario muestra la semana actual del viaje \(o la primera semana si el viaje aún no comenzó\), no el inicio del período completo\. El Representante no tiene que navegar para llegar al "hoy"\.
- Diseño — días con acción pendiente: los días con solicitudes sin respuesta de JUK muestran un indicador visual \(punto de color\)\. Esto permite identificar de un vistazo qué días tienen situaciones abiertas sin necesidad de revisar la lista de solicitudes\.

### __US\-2\.2 — Ver el detalle de cada actividad__

*Como Representante, quiero ver el detalle de cada actividad del calendario para poder informar y preparar a mis alumnos\.*

### __Criterios de aceptación__

- Al hacer clic en una actividad se despliega un panel con: nombre, descripción, fecha y hora, lugar, si es paga u opcional, y costo adicional \(si aplica\)\.
- Cada actividad tiene una descripción informativa opcional \(cargada por JUK\) visible al pasar el cursor sobre el ícono de información \(tooltip\)\. Esta descripción está pensada para ser compartida con padres y alumnos para que sepan qué van a visitar\.
- Para actividades variables, se muestra el estado de aprobación: Por definir / Propuesta / Aprobada / Rechazada\.
- Si una actividad fue rechazada por JUK, se muestra el motivo\.

### __US\-2\.3 — Solicitar cambios o proponer actividades especiales__

*Como Representante, quiero poder enviar una solicitud de cambio en el calendario o proponer una actividad especial para adaptar el programa a las necesidades de mi grupo, sabiendo que JUK debe aprobarla\.*

### __Criterios de aceptación__

- El Representante puede iniciar una solicitud desde cualquier día del calendario con el botón "Solicitar cambio" o "Proponer actividad", incluso antes de que el viaje esté en estado Confirmado\.
- El formulario incluye: tipo de solicitud \(cambio de horario / actividad nueva / cancelación / otro\), descripción libre, fecha/s afectadas y nivel de urgencia \(urgente / normal\)\.
- Al enviar, el sistema notifica por email a info@jovenesenuk\.com con todos los detalles\.
- La solicitud queda registrada con estado: Enviada / En revisión / Aprobada / Rechazada\.
- JUK tiene un plazo máximo de 7 días corridos para responder una solicitud\. Si el plazo vence sin respuesta, el sistema envía una alerta interna al equipo JUK\.
- El Representante recibe una notificación cuando JUK cambia el estado, incluyendo el motivo si fue rechazada\.
- Si JUK aprueba la solicitud, el cambio se refleja automáticamente en el calendario\.
- El Representante no puede editar el calendario directamente bajo ninguna circunstancia\.

### __US\-2\.4 — Ver información del transfer__

*Como Representante, quiero ver los datos del transfer aeropuerto ↔ casas de familia para coordinar la llegada y salida del grupo\.*

### __Criterios de aceptación__

- La sección Transfer muestra: empresa de transfer, horario de llegada al aeropuerto, punto de encuentro, horario estimado de llegada a las casas y contacto local del transfer\.
- La información de transfer de regreso se muestra de forma análoga\.
- Si los datos de transfer aún no están cargados por JUK, se muestra: "Información de transfer pendiente de carga\. El equipo JUK la completará una vez confirmados los pasajes\."

### __US\-2\.5 — Descargar el itinerario completo__

*Como Representante, quiero descargar el itinerario completo en PDF para compartirlo con los alumnos y sus familias\.*

### __Criterios de aceptación__

- El botón "Descargar itinerario" está habilitado únicamente después de que el Representante y JUK hayan validado conjuntamente el calendario\. Antes de esa validación, el botón está deshabilitado con el tooltip "El itinerario requiere validación antes de poder descargarse"\.
- El PDF incluye: datos del viaje \(fechas, colegio destino, destino\), calendario completo con actividades confirmadas, datos de transfer y contactos de emergencia\.
- Las actividades pagas \(fijas\) se identifican visualmente en el PDF con un indicador diferenciado \(ej: borde o ícono de candado\)\.
- El PDF incluye la leyenda: "Las actividades no pagas están sujetas a cambio y/o modificaciones sin previo aviso\."
- Las actividades "por confirmar" se incluyen con indicación explícita de que están pendientes de confirmación\.
- El nombre del archivo sigue el formato: JUK\_Itinerario\_\[NombreViaje\]\_\[Año\]\.pdf

## 2\.4 Reglas de negocio

__Categorías de actividades:__

__Categoría__

__Descripción__

__¿Modificable?__

__Indicador en PDF__

Paga / Fija

Actividad con fecha y horario bloqueado, ya abonada \(ej: obra de teatro con fecha exclusiva\)\.

No \(comprometida contractualmente\)

Indicador destacado

Variable estándar

Excursión habitual del programa JUK, sin fecha bloqueada\. Puede alterarse por clima u otros imprevistos\.

Sí, con aviso

Incluida con leyenda de sujeto a cambio

Variable opcional con costo

Actividad adicional con costo extra, pactada previamente con aprobación de los padres\.

Sí, con aviso

Incluida con leyenda de sujeto a cambio

__Qué puede VER el Representante:__

- Calendario completo: clases, actividades y días libres \(desde el momento de creación del viaje\)\.
- Estado de aprobación y descripción de cada actividad\.
- Datos de transfer \(si están cargados por JUK\)\.
- Historial y estado de todas sus solicitudes de cambio\.
- Itinerario descargable en PDF \(habilitado tras validación conjunta con JUK\)\.

__Qué puede SOLICITAR:__

- Cambios de horario o fecha de actividades \(incluso antes del estado Confirmado\)\.
- Incorporación de actividades especiales\.
- Cancelación de una actividad variable\.

__Qué NO puede hacer:__

- Editar el calendario directamente\.
- Aprobar, rechazar o confirmar actividades\.
- Ver datos internos de JUK \(costos de proveedor, márgenes, comisiones\)\.
- Descargar el itinerario PDF antes de la validación conjunta con JUK\.

__Comportamiento según estado del viaje:__

__Estado del viaje__

__Comportamiento del módulo__

Inscripción abierta

El calendario puede estar incompleto\. Aviso: "El itinerario está en elaboración"\. El Representante ya puede proponer actividades\.

Confirmado

El calendario debería estar completo o en proceso\. Disponible para validación conjunta con JUK\.

En curso

Solo lectura\. No se pueden enviar solicitudes de cambio mayores \(solo reportar incidencias a JUK\)\.

Finalizado / Cancelado

Solo lectura\. Solicitudes de cambio deshabilitadas\.

## 2\.5 Alertas y notificaciones

__Tipo__

__Descripción__

Notificación

JUK aprueba o rechaza una solicitud de cambio: email al Representante con el resultado y motivo\.

Notificación

JUK actualiza el calendario o itinerario: email informando el cambio\.

Notificación

JUK carga los datos de transfer: email con los detalles completos\.

Campana en portal

El portal muestra un ícono de notificaciones con contador de modificaciones no leídas, como alternativa al email para Representantes que no revisan su correo con frecuencia\.

Interna a JUK

Si el viaje está a menos de 21 días y el itinerario no fue validado, el sistema alerta al equipo JUK\.

Interna a JUK

Si una solicitud del Representante lleva más de 7 días sin respuesta, el sistema alerta al equipo JUK\.

## 2\.6 Preguntas abiertas — todas resueltas

- __RESUELTO — __Costo de actividades variables: pueden tener costo adicional\. Se intenta que si tienen costo, estén pactadas antes del inicio del viaje con aprobación explícita de todos los padres involucrados\.
- __RESUELTO — __Propuesta de actividades antes de Confirmado: sí, el Representante puede proponer actividades en cualquier estado del viaje\.
- __RESUELTO — __Plazo máximo de respuesta de JUK a solicitudes: 7 días corridos\.
- __RESUELTO — __Itinerario descargable: documento único para el grupo\. No incluye información personalizada por alumno para evitar confusión si se reenvía\.
- __RESUELTO — __Publicación del calendario: visible para el Representante desde la creación del viaje\. Para padres/alumnos y para descarga requiere validación conjunta Representante \+ JUK\.

# Módulo 3 — Mis Estudiantes

## 3\.1 Objetivo del módulo

Centralizar toda la información por alumno que el Representante necesita para acompañar a su grupo\. El módulo tiene tres capas de visualización accesibles desde la misma pantalla:

__Capa__

__Nombre__

__Descripción__

A

Panel de estados

Tabla con el estado de todos los pasos de seguimiento \(Paso 0 \+ grupos A, B, C, D\) por alumno\. Vista principal y por defecto\.

B

Mapa de ubicaciones

Toggle de vista alternativa: misma lista de alumnos representada en mapa con pins de casas y colegio destino\.

C

Perfil del alumno

Panel lateral que se abre al seleccionar un alumno\. Contiene detalle de sus pasos, datos de contacto y sección de salud\.

*Las capas B y C son vistas complementarias, no módulos separados\. El Representante alterna entre tabla y mapa con un toggle, y abre el perfil de cualquier alumno desde ambas vistas\.*

## 3A — Panel de Estados

### __Objetivo__

Proveer una tabla consolidada con el estado de todos los pasos de seguimiento de cada alumno \(Paso 0 \+ grupos A, B, C, D\), para identificar rápidamente quién tiene documentación pendiente, bloqueada o con errores sin necesidad de entrar al perfil individual\.

### __Estructura de pasos__

El seguimiento de cada alumno se organiza en un Paso 0 de solo lectura y cuatro grupos de pasos \(A, B, C, D\) mayormente paralelos entre sí\. Solo C2 tiene dependencia formal: requiere que B1 esté Completado\.

__Grupo__

__Código__

__Nombre del paso__

__Notas__

Paso 0

—

Application Form JUK

Solo lectura\. Cargado por el alumno/familia\. Base de todos los demás pasos\.

A

A1

App Form colegio

A

A2

Test de Nivel

A

A3

Parental Consent

B

B1

Plan de cuotas

B

B2

Último pago presencial

N/A en Flujo JUK Directo y Colegio cliente\.

C

C1

ETA

Activo solo si el colegio destino está en UK\. N/A automático para USA/Canadá \(requieren VISA, fuera de scope v1\), Irlanda \(argentinos no requieren documentación\) y otros destinos\.

C

C2

Immigration Letter

Depende de B1 \(Plan de cuotas Completado\)\.

C

C3

Accommodation Letter

Activa el pin del alumno en el mapa\.

D

D1

Autorización escribano

D

D2

Psicofísico

N/A en viajes Individuales\.

### __Estados de cada paso__

__Estado__

__Significado__

__Color indicativo__

Pendiente

El paso no fue iniciado\.

Gris

En progreso

El trámite está en curso\.

Azul

Completado

Finalizado y validado por JUK\.

Verde

N/A

No aplica a este alumno o viaje\.

Blanco / rayado

Bloqueado

No puede avanzar por razón específica \(ej: C1 rechazado\)\.

Rojo

### __US\-3\.1 — Ver el tablero de pasos por alumno__

*Como Representante, quiero ver en una sola tabla el estado de todos los trámites de mis alumnos para identificar de forma rápida qué está pendiente sin entrar al perfil de cada uno\.*

### __Criterios de aceptación__

- La tabla muestra una fila por alumno con: nombre completo, edad, y columnas agrupadas por Paso 0 y grupos A, B, C, D\. Dentro de cada grupo, una columna por paso\.
- Cada celda de paso muestra el ícono/color del estado\. Al hacer clic, se abre el perfil del alumno con el detalle de ese paso activo\.
- La tabla es ordenable por: nombre, cantidad de pasos pendientes y alertas activas\.
- La tabla es filtrable por estado de paso \(ej: "mostrar solo alumnos con C1 Bloqueado"\) y por nivel de alerta\.
- Los datos de facturación \(CUIL/CUIT, razón social, condición fiscal\) no aparecen en ninguna columna\.
- En la parte superior hay un panel de resumen: total de alumnos, % con todos los pasos completados, alertas activas por nivel y días hasta el viaje\. Los contadores son clicables y filtran la tabla\.
- El estado de la tabla se actualiza en tiempo real\. Si la complejidad técnica lo requiere, el fallback es una actualización automática cada 15 minutos\.
- Diseño — nombres de pasos: los pasos se muestran con su nombre completo al hacer hover sobre el encabezado de cada columna\. El encabezado puede usar abreviatura si el espacio lo requiere, pero nunca solo un número\.
- Diseño — acciones de exportación: los botones "Descargar resumen de salud" y "Exportar ubicaciones" son visibles directamente en la parte superior de la tabla, no dentro de menús desplegables\. El Representante no tiene que buscar estas funciones\.
- Regla C1 por país de destino: el paso C1 \(ETA\) se muestra activo únicamente cuando el colegio destino del viaje está en UK\. Para cualquier otro destino \(USA, Canadá, Irlanda u otros\), C1 aparece automáticamente como N/A con la etiqueta "No aplica para este destino"\. Esta lógica se aplica a nivel de viaje y es transparente para el Representante: no requiere ninguna acción de su parte\.

### __US\-3\.2 — Identificar alertas visuales por paso incompleto o bloqueado__

*Como Representante, quiero ver alertas visuales destacadas cuando un alumno tiene un paso bloqueado, próximo a vencer o con datos incorrectos para actuar con anticipación\.*

### __Criterios de aceptación__

- Los pasos en estado Bloqueado se resaltan en rojo prominente\.
- Si un paso tiene fecha límite a 3 días o menos, se muestra un ícono de alerta naranja junto al estado\.
- Si JUK detectó un error en la información cargada de un paso \(ej: nombre del pasaporte no coincide\), la celda muestra un ícono de advertencia con el detalle al hacer clic\.
- Un banner de resumen en la parte superior de la tabla lista las alertas activas más urgentes del grupo\.
- Diseño — accesibilidad cromática: todos los estados de los pasos combinan color y forma de ícono para que sean distinguibles sin depender exclusivamente de la percepción del color\. Ejemplo: Completado = círculo verde con tilde; Bloqueado = rombo rojo con X; Pendiente = círculo gris vacío\.
- Diseño — texto de alerta en lenguaje simple: cuando el banner de alertas está activo, describe la situación en palabras simples y directas \(ej: "El pasaporte de Juan López vence en 2 días\. Contactar a la familia\." en lugar de "C2 — Próximo vencimiento"\)\.

### __US\-3\.3 — Enviar email a una familia o a todas las que tienen un paso pendiente__

*Como Representante, quiero contactar a familias con pasos pendientes para agilizar la gestión sin depender de JUK para cada comunicación\.*

### __Criterios de aceptación__

- Desde cualquier fila, el Representante puede hacer clic en "Enviar email" para contactar a esa familia\.
- En el encabezado de cada columna de paso hay un botón "Enviar email a todos" que envía un recordatorio a todas las familias con ese paso en Pendiente o Bloqueado\.
- El sistema propone un texto predeterminado en español editable antes de enviar\. El template es único para todos los viajes e incluye el nombre del alumno cuyos datos están pendientes\.
- El email incluye: nombre del alumno, paso\(s\) pendiente\(s\), plazo \(si aplica\) y datos de contacto de JUK\.
- El Representante configura desde los ajustes de su perfil si los emails se envían desde su email personal o desde info@jovenesenuk\.com\. JUK recibe una alerta indicando cuál es el remitente configurado\.
- Todas las alertas automáticas del sistema \(no los emails manuales del Representante\) se envían desde una dirección noreply\.
- El Representante no ve las cuentas de email de los padres; el sistema los gestiona internamente\.
- Cada envío queda registrado en el portal \(fecha, hora, paso\(s\) referenciados, individual vs\. masivo\)\.

### __US\-3\.4 — Configurar alertas automáticas ante anomalías__

*Como Representante, quiero recibir alertas automáticas antes de que venzan los plazos de los pasos para poder actuar con anticipación y no cuando ya es tarde\.*

### __Criterios de aceptación__

- El Representante puede activar o desactivar alertas automáticas globalmente desde la configuración del módulo\.
- El sistema envía alertas automáticas a las familias 3 días antes y 1 día antes del vencimiento de cada paso \(no al momento del vencimiento, cuando ya sería tarde para actuar\)\.
- Las anomalías que también disparan alertas inmediatas son: paso que pasa a Bloqueado y C1 rechazado\.
- El email automático va a la familia del alumno afectado con copia al Representante\.
- El Representante puede elegir entre recibir copia de cada alerta individual o un resumen diario\.
- JUK tiene visibilidad de todas las alertas automáticas enviadas desde su panel de administración\.

__Diferencias según tipo de viaje — Panel de Estados:__

__Condición del viaje__

__Comportamiento específico__

Flujo JUK Directo

B2 \(Último pago presencial\) se muestra en N/A\. No hay instancia de pago presencial en este flujo\.

Colegio cliente

B2 se muestra en N/A\. El colegio centraliza el cobro; no existe pago presencial por fuera del colegio\.

Vía agencia \(sin colegio cliente\)

B2 es visible y activo; se muestra Pendiente hasta que JUK lo confirma\.

Viaje de tipo Grupal

D2 \(Psicofísico\) está activo para todos los alumnos y genera alertas de vencimiento\.

Viaje de tipo Individual

D2 se muestra en N/A\.

Destino UK

C1 \(ETA\) está activo\. El alumno lo tramita vía app\. Es el único destino donde C1 aplica\.

Destino USA o Canadá

C1 \(ETA\) se muestra en N/A automático con etiqueta "No aplica para este destino"\. Requieren VISA \(fuera de scope v1\)\.

Destino Irlanda

C1 \(ETA\) se muestra en N/A automático\. Los argentinos no requieren documentación de entrada a Irlanda\.

Otros destinos

C1 \(ETA\) se muestra en N/A automático con etiqueta "No aplica para este destino" hasta nueva definición\.

## 3B — Mapa de Ubicaciones

### __Objetivo__

Vista alternativa de la misma lista de alumnos representada en un mapa interactivo\. El toggle tabla/mapa cambia la forma de ver los datos sin cambiar de módulo ni perder el filtro activo\. El mapa soporta dos modos de agrupación: por alumno y por casa de familia\.

### __US\-3\.5 — Alternar entre vista tabla y vista mapa__

*Como Representante, quiero poder cambiar entre vista de tabla y vista de mapa para tener una lectura geográfica del grupo sin abandonar el módulo\.*

### __Criterios de aceptación__

- Existe un toggle "Tabla / Mapa" claramente visible en la parte superior del módulo\.
- Al cambiar a vista mapa, el filtro activo en la tabla se mantiene\.
- El pin del colegio destino siempre está visible en el mapa, diferenciado del resto por ícono o color\.
- El mapa soporta dos modos de visualización, seleccionables mediante un toggle secundario: \(1\) Por alumno — un pin por alumno en la dirección de su casa de familia; \(2\) Por casa — un pin por casa de familia \(ej: "Casa 1", "Casa 2"\) con indicador del número de alumnos que viven allí\. Al hacer clic en el pin de una casa, se despliega la lista de alumnos asignados\.
- Los alumnos que comparten una misma casa de familia aparecen agrupados bajo el mismo pin en la vista por casa\.
- Los alumnos sin Accommodation Letter aparecen en una lista flotante junto al mapa con el indicador "Alojamiento pendiente de asignación"\.

### __US\-3\.6 — Ver detalle y ruta de transporte desde el pin de un alumno o casa__

*Como Representante, quiero ver la dirección y la ruta de transporte público de cada alumno desde el mapa para poder orientarlos al inicio del viaje\.*

### __Criterios de aceptación__

- Al hacer clic en el pin de un alumno, se abre el perfil del alumno \(Capa C\) con la pestaña de ubicación activa\.
- Al hacer clic en el pin de una casa \(vista por casa\), se despliega la lista de alumnos de esa casa con la ruta de transporte compartida\.
- El panel muestra: nombre del alumno, dirección completa de la casa de familia, nombre de la familia anfitriona y ruta de transporte público sugerida al colegio \(medio, línea/s, tiempo estimado, transbordos\)\.
- Si no existe ruta de transporte público disponible, el sistema envía automáticamente una alerta al admin JUK indicando que la dirección puede ser incorrecta o presentar problemas de geolocalización\. JUK puede editar la dirección manualmente desde el portal de administración\.
- El Representante puede ver una vista de lista con la ruta de todos los alumnos para planificar el grupo\.

### __US\-3\.7 — Exportar ubicaciones del grupo__

*Como Representante, quiero exportar las direcciones de mis alumnos para tenerlas disponibles offline durante el viaje\.*

### __Criterios de aceptación__

- El botón "Exportar ubicaciones" genera un PDF o planilla con: nombre del alumno, dirección de la casa de familia, nombre de la familia anfitriona y ruta de transporte sugerida\.
- La exportación incluye solo alumnos con Accommodation Letter confirmada\.
- El archivo sigue el formato: JUK\_Ubicaciones\_\[NombreViaje\]\_\[Año\]\.

__Reglas de negocio — Mapa:__

- El pin de un alumno se activa automáticamente cuando C3 \(Accommodation Letter\) pasa a estado Completado\.
- La dirección de la casa de familia proviene exclusivamente de la Accommodation Letter cargada por JUK\. El Representante no puede agregar, editar ni sugerir direcciones\.
- Las direcciones son datos sensibles: visibles solo para el Representante de ese viaje y para admins JUK\.
- Cuando ningún alumno tiene Accommodation Letter cargada, el mapa muestra solo el pin del colegio con el mensaje: "Las ubicaciones estarán disponibles a medida que se asignen los alojamientos"\.
- Si la dirección de una Accommodation Letter no puede ser geolocalizada, el sistema alerta tanto al Representante como al admin JUK\. JUK puede corregir la dirección manualmente\.

## 3C — Perfil del Alumno

### __Objetivo__

Panel lateral que se abre al seleccionar cualquier alumno desde la tabla o el mapa\. Centraliza toda la información que el Representante necesita sobre ese alumno en pestañas organizadas\.

### __Estructura del perfil__

__Pestaña__

__Contenido__

Datos generales

Nombre completo, edad, número de pasaporte \(sin datos de facturación\)\. Datos de contacto de la familia\.

Pasos de seguimiento

Estado actual, fecha de última actualización y admin JUK que actualizó cada paso \(Paso 0 \+ grupos A, B, C, D\)\. El Representante no ve observaciones internas\. Nota: las observaciones tienen dos niveles de visibilidad \(solo admin / admin \+ representante\), a implementar en iteración futura\.

Ubicación

Dirección de la casa de familia, nombre de la familia anfitriona y ruta de transporte público sugerida\. Solo visible si Accommodation Letter está Completada\.

Salud

Alergias, condiciones crónicas, medicación habitual y observaciones de salud\. Datos del Application Form y Parental Consent \(complementarios entre sí\)\. Estado de D2 \(si aplica\)\. Acceso a tarjeta de emergencia\.

### __US\-3\.8 — Ver y navegar el perfil de un alumno__

*Como Representante, quiero acceder a toda la información de un alumno en un panel unificado para no tener que navegar entre distintas pantallas\.*

### __Criterios de aceptación__

- El panel del alumno se abre como un drawer lateral sin salir de la lista principal\.
- Al hacer clic en una celda de paso específica en la tabla, el panel se abre con la pestaña "Pasos" activa y ese paso resaltado\.
- Al hacer clic en el pin de un alumno en el mapa, el panel se abre con la pestaña "Ubicación" activa\.
- El Representante puede navegar entre alumnos sin cerrar el panel \(botones anterior/siguiente\)\.
- Ninguna pestaña del perfil muestra datos de facturación\.

### __US\-3\.9 — Ver información de salud del alumno__

*Como Representante, quiero ver las condiciones de salud y alergias de mis alumnos para poder actuar correctamente ante una emergencia médica durante el viaje\.*

### __Criterios de aceptación__

- La pestaña "Salud" muestra: alergias \(alimentarias, ambientales, medicamentos\), condiciones crónicas relevantes, medicación habitual \(nombre, dosis, frecuencia\) y observaciones especiales\.
- Se consideran condiciones críticas de salud \(indicador de alta prioridad\): alergias graves que requieran EpiPen o puedan causar anafilaxia; enfermedades que puedan requerir internación o causar daño significativo sin cuidado adecuado \(epilepsia, diabetes, enfermedades respiratorias severas, entre otras\)\. La lista puede ampliarse\.
- Los datos del Application Form y del Parental Consent se muestran de forma complementaria \(pueden tener distinto nivel de detalle sobre la misma condición\)\. Ambas fuentes son visibles\.
- Los alumnos con condiciones críticas tienen un indicador de alta prioridad visible desde la tabla principal \(ícono de alerta médica en la fila\)\.
- Si el Application Form del alumno no está Completado, la pestaña "Salud" muestra: "Información pendiente de Application Form"\.
- Si el viaje es de tipo Grupal, la pestaña muestra el estado de D2 con su fecha de emisión si fue cargada\.
- Existe un botón "Tarjeta de emergencia" que genera una ficha compacta \(media hoja A4\) con los datos críticos: nombre, fecha de nacimiento, pasaporte, alergias graves, condiciones críticas y medicación de emergencia\.
- La sección de salud es accesible solo para el Representante de ese viaje y para admins JUK\. Nota para iteración futura \(Portal de Familias\): el padre/alumno debería poder verificar su propia información de salud para confirmar que está correctamente registrada\.

### __US\-3\.10 — Exportar resumen de salud del grupo__

*Como Representante, quiero descargar el resumen de salud de todo el grupo en formato imprimible para llevarlo conmigo durante el viaje\.*

### __Criterios de aceptación__

- El botón "Descargar resumen de salud" está disponible en la vista de tabla del módulo\.
- El PDF incluye una ficha por alumno con: nombre, edad, alergias, condiciones crónicas, medicación y observaciones\. No incluye datos de facturación\.
- El PDF lleva la leyenda "CONFIDENCIAL" y la fecha de generación\.
- El nombre del archivo sigue el formato: JUK\_Salud\_\[NombreViaje\]\_\[Año\]\_CONFIDENCIAL\.pdf
- Cada descarga queda registrada en el log de auditoría \(quién, cuándo\)\.

## 3\.2 Reglas de negocio generales del módulo

__Qué puede VER el Representante:__

- Estado de los pasos de seguimiento de cada alumno \(Paso 0 \+ grupos A, B, C, D\)\.
- Fecha de última actualización y admin JUK que actualizó cada paso\.
- Datos de contacto de la familia \(el sistema gestiona el envío; no se exponen emails en crudo\)\.
- Información de salud y alergias \(pestaña Salud del perfil\)\.
- Dirección de alojamiento y ruta de transporte \(si Accommodation Letter está Completada\)\.

__Qué puede HACER:__

- Enviar emails a familias individuales o masivos por paso\.
- Activar/desactivar alertas automáticas y configurar el remitente\.
- Filtrar y ordenar la tabla\.
- Alternar entre vista tabla y vista mapa \(por alumno o por casa\)\.
- Descargar exportaciones de ubicaciones y resumen de salud\.
- Generar tarjetas de emergencia individuales\.

__Qué NO puede hacer:__

- Actualizar o cambiar el estado de ningún paso\. Solo JUK puede hacerlo\.
- Editar datos personales o de salud de los alumnos\.
- Ver datos de facturación\.
- Ver información de alumnos de otros viajes\.

## 3\.3 Alertas que recibe el Representante

__Nivel__

__Trigger__

__Canal__

Crítica

C1 \(ETA\) de un alumno rechazado\.

Email inmediato

Crítica

Viaje en menos de 3 meses con algún paso obligatorio en Pendiente\.

Email \+ banner en portal

Alta

Paso en estado Bloqueado con viaje en menos de 3 meses\.

Email

Alta

Alumno en viaje Grupal con D2 \(Psicofísico\) Pendiente y fecha de inicio en menos de 3 meses\.

Email

Normal

Plazo de un paso a 3 días de vencer \(alerta anticipada\)\.

Email automático a familia \+ copia al Representante

Normal

Plazo de un paso a 1 día de vencer \(alerta final\)\.

Email automático a familia \+ copia al Representante

Normal

Anomalía de información detectada por JUK en un paso\.

Email \+ ícono en tabla

Notificación

JUK carga la Accommodation Letter de un alumno\.

Email

Notificación

Todas las Accommodation Letters del viaje cargadas\.

Email resumen

Notificación

JUK actualiza datos de salud de un alumno\.

Email

## 3\.4 Preguntas abiertas

- __RESUELTO — __Historial de cambios de estado: fuera del alcance de v1\. Se dejará para una iteración futura\.
- __RESUELTO — __Observaciones internas de JUK: existen dos niveles de visibilidad — \(1\) Solo admin JUK; \(2\) Admin JUK \+ Representante\. Útil para notas sobre comportamiento del alumno, la familia, situaciones especiales, etc\. A implementar en iteración futura junto con el sistema de observaciones\.
- __RESUELTO — __Template de email automático: único para todos los viajes\. Incluye el nombre del alumno cuyos datos están pendientes\.
- __RESUELTO — __Frecuencia de actualización de la tabla: tiempo real\. Fallback: cada 15 minutos si la complejidad técnica lo requiere\.
- __RESUELTO — __Condiciones de salud críticas: alergias graves \(anafilaxia, requieren EpiPen\), epilepsia, diabetes, enfermedades respiratorias severas y cualquier condición que pueda requerir internación o cause daño significativo sin cuidado adecuado\.
- __RESUELTO — __Datos de salud contradictorios entre Application Form y Parental Consent: se complementan \(pueden tener distinto nivel de detalle sobre la misma condición\)\. Ambas fuentes se muestran\. Es poco probable que se contradigan\.
- __RESUELTO — __Tarjeta de emergencia offline: no aplica\. No considerar\.
- __RESUELTO — __Dirección no geolocalizable: alerta automática al Representante y al admin JUK\. JUK puede editar la dirección manualmente desde el portal de administración\.
- __RESUELTO — __Mapa de actividades/excursiones: futura funcionalidad\. Se implementaría como un mapa complementario al calendario que muestre la ruta del itinerario del día con rutas de transporte público sugeridas a cada destino\.
- ¿Los vencimientos de pasos son bloqueantes para el alumno o el viaje? ¿Qué impacto operativo concreto tienen si un paso vence sin completarse?

# Módulo 4 — Diario de Viaje

## 4\.1 Objetivo del módulo

Permitir a la Representante documentar y compartir el día a día del viaje con las familias de su grupo a través del Portal de Familias\. Este módulo resuelve la responsabilidad establecida en el PRD del Portal de Familias \(v1\.3, Módulo 7\), que asigna a la Representante la carga de fotos, videos y novedades del Diario de Viaje\. Incluye también un canal asíncrono de mensajes para recibir y responder consultas individuales de los padres\.

*Nota de diseño — PRIORIDAD: este módulo es mobile\-first\. La Representante publica desde el destino, en movimiento, desde su teléfono\. El formulario de nueva entrada debe funcionar de forma fluida en pantallas pequeñas: campos grandes, botón de carga de fotos prominente, sin desplazamiento horizontal\. Si la experiencia mobile es deficiente, la Representante no publicará contenido con la frecuencia que JUK y las familias esperan\. Se recomienda evaluar una versión app nativa o PWA en una iteración futura\.*

*El módulo está disponible únicamente cuando el viaje está en estado En curso\. En cualquier otro estado, el acceso es de solo lectura\.*

## 4\.2 Estructura del módulo

__Sección__

__Descripción__

Publicar entrada

Crear una nueva entrada diaria con texto, fotos y/o videos\.

Historial del diario

Lista cronológica de todas las entradas publicadas en el viaje actual\.

Mensajes de familias

Bandeja de mensajes recibidos de los padres del grupo, con opción de respuesta\.

## 4\.3 User Stories y Criterios de Aceptación

### __US\-4\.1 — Crear una entrada diaria en el Diario de Viaje__

*Como Representante, quiero publicar una entrada con texto, fotos y videos del día para que las familias de mi grupo puedan seguir el viaje en tiempo real\.*

### __Criterios de aceptación__

- El formulario de nueva entrada incluye: campo de texto libre \(novedad del día\), carga de imágenes \(múltiple, formatos JPG/PNG/HEIC\) y campo de video \(link externo o carga directa\)\.
- Al publicar, el contenido es visible de forma inmediata para los padres del grupo en el Portal de Familias\. No hay moderación previa por parte de JUK en v1\.
- Cada nueva entrada publicada genera una alerta interna al equipo JUK con el contenido de la entrada\.
- La Representante puede publicar como máximo una entrada por día, pero puede editarla hasta 24 horas después de su publicación\.
- La entrada queda asociada automáticamente al viaje activo en el contexto del selector del dashboard\.
- Si la Representante tiene más de un viaje activo simultáneo, el sistema indica claramente a qué viaje corresponde la entrada antes de publicar\.
- El módulo solo permite crear entradas nuevas cuando el viaje está en estado En curso\. En cualquier otro estado, el botón "Publicar entrada" está deshabilitado\.
- Diseño del formulario — simplicidad: el formulario muestra por defecto solo dos elementos: campo de texto y botón grande de "Agregar fotos"\. Las opciones adicionales \(video, opciones de visibilidad\) se revelan con un enlace "Más opciones" para no abrumar a quienes solo quieren escribir y subir fotos\.
- Diseño — confirmación al publicar: inmediatamente después de publicar, el sistema muestra un mensaje de confirmación en pantalla: "¡Entrada publicada\! Las familias de tu grupo ya pueden verla\." El Representante no queda con la duda de si funcionó\.

### __US\-4\.2 — Cargar fotos y videos en una entrada__

*Como Representante, quiero poder adjuntar fotos y videos a cada entrada para que las familias tengan una experiencia visual del viaje\.*

### __Criterios de aceptación__

- Se pueden cargar múltiples imágenes por entrada\. El sistema acepta JPG, PNG y HEIC\.
- Para video: la Representante puede pegar un link \(YouTube, Vimeo u otro\) o cargar un archivo de video directamente \(MP4, MOV\)\. El tamaño máximo de carga directa se define con el equipo técnico, priorizando velocidad de carga sobre calidad máxima\.
- Las fotos son visibles únicamente para los padres del mismo grupo\. No son accesibles para familias de otros viajes\.
- El sistema muestra el progreso de carga de archivos pesados con una barra de progreso visible y el porcentaje completado\. En conexiones lentas \(comunes cuando el Representante está en el extranjero\), la barra es el único indicador de que la carga está ocurriendo\.
- Si la carga falla, el sistema lo indica con un mensaje en lenguaje simple que explica qué hacer: "No se pudo subir la foto\. Revisá tu conexión e intentá de nuevo\." El texto del campo no se pierde\.
- Diseño — selección de fotos desde móvil: el botón de agregar fotos activa directamente la galería del teléfono o la cámara\. No se requieren pasos intermedios\.

### __US\-4\.3 — Ver y editar el historial de entradas publicadas__

*Como Representante, quiero ver todas las entradas que publiqué durante el viaje para tener un registro cronológico y poder corregir errores\.*

### __Criterios de aceptación__

- El historial muestra todas las entradas del viaje en orden cronológico inverso \(más reciente primero\), con fecha, texto, fotos/videos y cantidad de reacciones \(emojis\) y comentarios aprobados\.
- Los padres y alumnos pueden reaccionar a las entradas con emojis y dejar comentarios\. Los comentarios se publican de forma inmediata en el Portal de Familias \(sin aprobación previa\)\. Los comentarios tienen un límite de 280 caracteres, definido en el Portal de Familias v1\.11\.
- La Representante puede editar el texto de una entrada hasta 24 horas después de su publicación\. Pasado ese plazo, la entrada es de solo lectura\.
- La Representante no puede eliminar entradas; si necesita quitar contenido inapropiado, debe contactar a JUK\.
- JUK puede eliminar cualquier entrada desde el portal de administración\.
- Cuando el viaje pasa de En curso a Finalizado, el historial queda accesible en modo lectura de forma indefinida\.

### __US\-4\.5 — Eliminar comentarios de padres publicados en el Diario__

*Como Representante, quiero poder eliminar comentarios de padres ya publicados en el Diario de Viaje para mantener un ambiente apropiado en el grupo sin tener que moderar de forma previa\.*

### __Criterios de aceptación__

- Cada comentario publicado muestra un botón de eliminar \(ej: ícono de papelera o "Eliminar"\) visible únicamente para la Representante\. Los padres y alumnos no ven este botón\.
- Al hacer clic en eliminar, el sistema solicita confirmación antes de proceder \(ej: "¿Eliminar este comentario? Esta acción no se puede deshacer\."\)\.
- Al confirmar la eliminación, el comentario desaparece del feed de todos los padres del grupo de forma inmediata\.
- El autor del comentario no recibe ninguna notificación de que su comentario fue eliminado\.
- La eliminación queda registrada en el log interno del portal: quién eliminó, qué comentario \(texto completo\), de qué entrada, en qué fecha y hora\. Este registro es visible solo para JUK, no para la Representante ni los padres\.
- La Representante no puede restaurar un comentario eliminado\. Si necesita revisar comentarios eliminados, debe contactar a JUK\.
- JUK puede eliminar cualquier comentario desde el portal de administración, con el mismo registro en el log\.

### __US\-4\.4 — Recibir y responder mensajes de las familias__

*Como Representante, quiero recibir y responder los mensajes que me envían los padres de mi grupo para mantener una comunicación fluida durante el viaje sin que JUK intermedie\.*

### __Criterios de aceptación__

- La bandeja de mensajes muestra todos los mensajes recibidos de los padres del grupo, ordenados por fecha \(más reciente primero\)\.
- Cada mensaje indica: nombre del padre/madre, nombre del alumno al que corresponde y fecha/hora del mensaje\.
- La Representante puede responder directamente desde el portal\. La respuesta llega al padre/madre por email o notificación según lo que defina el Portal de Familias\.
- Los mensajes son individuales por familia: la Representante no puede ver mensajes cruzados entre familias\.
- La Representante puede optar por hacer visible una respuesta a todo el grupo \(ej: respuesta a una pregunta frecuente que beneficia a todos los padres\)\. Esta visibilidad es opcional y queda a criterio de la Representante\.
- La Representante recibe una notificación por email cuando llega un nuevo mensaje, con el texto incluido para poder responder sin entrar al portal\.
- La Representante no puede iniciar conversaciones; solo puede responder mensajes entrantes\.
- Los mensajes sin respuesta tienen un indicador visual de "no leído" en la bandeja\.
- Los mensajes solo están disponibles durante el estado En curso del viaje\.

## 4\.4 Reglas de negocio

__Activación del módulo según estado del viaje:__

__Estado del viaje__

__Comportamiento del módulo__

Inscripción abierta / Confirmado

Módulo no visible o visible en modo lectura \(sin entradas aún\)\.

En curso

Módulo completamente activo: publicación, edición, mensajes y eliminación de comentarios habilitados\.

Finalizado

Solo lectura\. Historial de entradas y mensajes accesible indefinidamente\. No se pueden crear nuevas entradas ni recibir mensajes\.

Cancelado

Módulo no accesible\.

__Qué puede VER la Representante:__

- Historial de entradas del Diario de Viaje de su viaje activo\.
- Reacciones y comentarios publicados de padres/alumnos en cada entrada\.
- Mensajes recibidos de los padres de su grupo \(individuales por familia\)\.

__Qué puede HACER:__

- Crear y editar entradas del diario \(texto, fotos, videos\) mientras el viaje está En curso\.
- Eliminar comentarios de padres/alumnos ya publicados en las entradas\.
- Responder mensajes de los padres\.
- Opcionalmente, hacer visible una respuesta a todo el grupo\.

__Qué NO puede hacer:__

- Ver entradas o mensajes de otros viajes o representantes\.
- Iniciar conversaciones con familias \(solo responder\)\.
- Eliminar entradas publicadas \(debe contactar a JUK\)\.
- Publicar contenido cuando el viaje no está En curso\.

__Visibilidad del contenido:__

Las fotos, videos y novedades publicadas son visibles exclusivamente para los padres del mismo grupo en el Portal de Familias\. No hay moderación previa de entradas ni de comentarios; los comentarios de los padres se publican de forma inmediata \(límite: 280 caracteres\)\. La Representante puede eliminar comentarios post\-publicación\. JUK puede eliminar entradas y comentarios desde el portal de administración y recibe una alerta por cada nueva entrada publicada\.

__JUK puede publicar entradas en nombre de la Representante:__

En casos de excepción \(ej: Representante sin acceso a internet\), un admin JUK puede publicar una entrada en el diario en nombre de la Representante\. Esta acción debe ser simple de ejecutar desde el portal de administración y queda registrada indicando que fue publicada por JUK\.

## 4\.5 Alertas que recibe la Representante

__Tipo__

__Descripción__

Notificación

Nuevo mensaje de un padre/madre: email inmediato con el texto del mensaje\.

Comentario publicado

Un padre publicó un comentario en una entrada del Diario: notificación en portal a la Representante, una vez por comentario\.

Recordatorio

Si el viaje está En curso y no se publicó ninguna entrada en las últimas 48 horas, el sistema envía un recordatorio a la Representante\.

Interna a JUK

Nueva entrada publicada en el diario: alerta al equipo JUK con el contenido\.

Interna a JUK

Si una entrada recibe una cantidad inusual de mensajes de familias en poco tiempo, se genera una alerta interna para que JUK revise\.

## 4\.6 Preguntas abiertas — todas resueltas

- __RESUELTO — __Tamaño máximo para carga de videos: a definir con el equipo técnico; se priorizará un tamaño estándar que garantice velocidad de carga sin degradar la experiencia del portal\.
- __RESUELTO — __Reacciones y comentarios en entradas: los padres y alumnos pueden reaccionar con emojis y dejar comentarios\. Los comentarios se publican de forma inmediata sin aprobación previa \(límite: 280 caracteres, Portal de Familias v1\.11\)\. La Representante puede eliminarlos post\-publicación\. El flujo de aprobación previa fue eliminado en Portal de Familias v1\.11\.
- __RESUELTO — __Mensajes de padres: disponibles solo durante el estado En curso del viaje\.
- __RESUELTO — __Moderación previa de contenido por JUK: no en v1\. JUK actúa de forma reactiva si detecta contenido inapropiado\.
- __RESUELTO — __JUK puede publicar en nombre de la Representante: sí, como excepción en casos de falta de acceso a internet\. La acción debe ser simple de ejecutar desde el portal de administración\.

# Apéndice A — Preguntas Abiertas Consolidadas

La mayoría de las preguntas abiertas de la v1\.3 fueron resueltas en la ronda de revisión de Felix Mir \(mayo 2026\) e incorporadas como reglas de negocio en el cuerpo del documento\. Solo queda una pregunta sin respuesta definitiva\.

## Pregunta pendiente — Módulo 3

- ¿Los vencimientos de pasos son bloqueantes para el alumno o el viaje? ¿Qué impacto operativo concreto tienen para JUK y para el Representante si un paso vence sin completarse?

## Preguntas cerradas en esta versión

Las siguientes preguntas fueron respondidas por Felix Mir y cerradas en v1\.4:

### __Módulo 1__

- Timing de activación de credenciales → acceso inmediato al momento de la asignación\.
- Cambio de email propio → el Representante lo solicita; JUK lo aprueba\.
- Google SSO → no se implementará\.

### __Módulo 2__

- Costo de actividades variables → pueden tener costo; se pacta antes del viaje con aprobación de padres\.
- Proponer actividades antes de Confirmado → sí\.
- Plazo de respuesta de JUK → 7 días corridos\.
- Itinerario descargable → documento único para el grupo\.
- Publicación del calendario → visible para el Representante desde la creación; para padres/alumnos y descarga requiere validación conjunta\.

### __Módulo 3__

- Historial de cambios de estado → fuera de alcance v1\.
- Observaciones internas → dos niveles: solo admin / admin \+ representante \(iteración futura\)\.
- Template de email → único para todos, incluye nombre del alumno\.
- Frecuencia de actualización → tiempo real; fallback 15 min\.
- Condiciones críticas de salud → alergias graves, epilepsia, diabetes, enfermedades respiratorias severas\.
- Datos de salud contradictorios → se complementan; ambas fuentes visibles\.
- Tarjeta de emergencia offline → no aplica\.
- Geolocalización fallida → alerta a representante y admin; JUK edita manualmente\.
- Mapa de actividades → funcionalidad futura como complemento al calendario\.

### __Módulo 4__

- Tamaño máximo de videos → estándar a definir con equipo técnico\.
- Reacciones y comentarios → emojis \+ comentarios con aprobación de la Representante\.
- Mensajes solo en curso → sí\.
- Moderación previa → no en v1\.
- JUK publica en nombre de la Representante → sí, como excepción\.

# Apéndice B — Tabla de Permisos del Representante

Referencia rápida de qué puede ver, hacer y qué tiene restringido el Representante\.

__Área__

__Puede VER__

__Puede HACER__

__Restricciones clave__

Login / Acceso

Sus propias credenciales y sesiones\. Viajes activos y finalizados\.

Recuperar contraseña\. Elegir viaje activo\.

No puede ver datos de otros usuarios ni roles\.

Mi Viaje — Calendario

Calendario completo desde la creación del viaje\. Actividades fijas y variables con estado de aprobación\.

Descargar itinerario PDF \(tras validación conjunta con JUK\)\.

No puede editar el calendario directamente\.

Mi Viaje — Solicitudes

Estado de sus solicitudes de cambio\.

Enviar solicitudes de cambio o propuesta de actividad \(en cualquier estado del viaje\)\.

No puede aprobar ni rechazar actividades\.

Mi Viaje — Transfer

Empresa, horarios, punto de encuentro, contacto local\.

—

Solo lectura\. JUK carga los datos\.

Mis Estudiantes — Tabla

Estado de los pasos \(Paso 0 \+ grupos A, B, C, D\), alertas, resumen del grupo\.

Filtrar, ordenar, enviar emails, configurar alertas automáticas y remitente\.

No puede editar estados de pasos ni datos de alumnos\.

Mis Estudiantes — Mapa

Pin del colegio \+ pins por alumno y por casa\. Ruta de transporte\.

Toggle tabla/mapa\. Toggle por alumno/por casa\. Exportar ubicaciones PDF\.

No puede editar ni agregar direcciones\.

Perfil del alumno — Salud

Alergias, condiciones crónicas, medicación, estado certificado psicofísico \(si aplica\)\.

Descargar resumen de salud del grupo\. Generar tarjeta de emergencia individual\.

No puede editar datos de salud\.

Diario de Viaje

Historial de entradas, reacciones y comentarios publicados\. Mensajes de familias\.

Publicar entradas, eliminar comentarios publicados, responder mensajes \(solo En curso\)\.

Solo disponible En curso\. No puede iniciar conversaciones ni ver contenido de otros viajes\.

Facturación de alumnos

—

—

INVISIBLE: sin acceso bajo ninguna circunstancia\.

Otros viajes

—

—

INVISIBLE: el Representante solo opera en el contexto de su viaje\.

# Changelog

__Versión__

__Fecha__

__Cambios__

v1\.10

Mayo 2026

Actualización del Módulo 4 \(Diario de Viaje\) por cambio en Portal de Familias v1\.11\. Se elimina el flujo de aprobación/rechazo previa de comentarios\. Los comentarios de padres se publican de forma inmediata \(límite: 280 caracteres\)\. Nueva US\-4\.5: la Representante puede eliminar comentarios ya publicados; la eliminación es inmediata, sin notificación al autor, con registro en log interno para JUK\. Notificación de "comentario pendiente" reemplazada por notificación de "comentario publicado"\. Pregunta abierta sobre moderación cerrada como RESUELTO\.

v1\.9

Mayo 2026

Incorporación de regla de C1 \(ETA\) por país de destino \(Portal Interno v1\.10\)\. C1 activo únicamente para destino UK\. N/A automático para USA/Canadá \(requieren VISA, fuera de scope v1\), Irlanda \(argentinos sin requisito de entrada\) y otros destinos\. Cambios: nota en tabla de estructura de pasos \(fila C1\), criterio en US\-3\.1 del tablero de seguimiento, y cuatro filas añadidas en tabla de diferencias por condición de destino\.

v1\.8

Mayo 2026

Actualización a nueva estructura de pasos A/B/C/D \(Portal de Gestión v1\.9\)\. Los 10 pasos lineales numerados \(1–10\) son reemplazados por Paso 0 \(Application Form JUK, solo lectura\) más cuatro grupos paralelos: A \(A1 App Form colegio, A2 Test de Nivel, A3 Parental Consent\), B \(B1 Plan de cuotas, B2 Último pago presencial\), C \(C1 ETA, C2 Immigration Letter dependiente de B1, C3 Accommodation Letter\), D \(D1 Autorización escribano, D2 Psicofísico\)\. Agregada tabla de estructura de pasos en Módulo 3A\. Sin cambios de lógica de negocio: condiciones N/A, dependencias y alertas son las mismas\.

v1\.7

Mayo 2026

Corrección en Tabla 7 — lógica del Paso 10: la fila "Flujo Directo JUK \(con colegio cliente\)" fue separada en dos filas independientes\. Flujo JUK Directo y Colegio cliente tienen Paso 10 = N/A pero por razones distintas: JUK Directo no tiene pago presencial en su flujo; Colegio cliente centraliza el cobro en el colegio\. Vía agencia \(sin colegio cliente\) mantiene Paso 10 activo\.

v1\.6

Mayo 2026

Corrección técnica: eliminación del flag deprecado requiere\_psicofisico\. La condición del Paso 9 \(Certificado psicofísico\) pasa a depender exclusivamente del tipo de viaje \(VIAJE\.tipo\_viaje\)\. Paso 9 activo = viaje Grupal\. Paso 9 = N/A = viaje Individual\. Cuatro correcciones localizadas: Tabla de diferencias por tipo de viaje \(2 filas\), criterio de aceptación US\-3\.9 y tabla de alertas de Módulo 3\.

v1\.5

Mayo 2026

Incorporación de lineamientos de diseño y experiencia de usuario para representantes no técnicos\. Nuevo principio rector \(6°\) y sección de Lineamientos de UX en el Resumen Ejecutivo\. Criterios de usabilidad agregados en los cuatro módulos: dashboard con panel de atención, guía de primer ingreso, accesibilidad cromática en estados de pasos, calendar con vista por defecto en semana actual, mobile\-first en Módulo 4\.

v1\.4

Mayo 2026

Incorporación de comentarios de revisión de Felix Mir \(mayo 2026\)\. Todas las preguntas abiertas de v1\.3 resueltas salvo una\. Cambios en actividades \(3 categorías\), alertas anticipadas, mapa con toggle por casa, flujo de aprobación de comentarios en Diario \(reemplazado en v1\.10\), acceso permanente post\-viaje\.

v1\.3

2026

Módulo 4 — Diario de Viaje agregado para cerrar gap con PRD del Portal de Familias v1\.3 Módulo 7\.

v1\.2

2026

Dos correcciones: activación inmediata de credenciales al asignar el Representante; eliminación de observaciones visibles para el Representante \(fuera de alcance v1\)\.

v1\.1

2026

Reestructuración a 3 módulos: Login compartido con portal interno; salud integrada en perfil del alumno; mapa como toggle dentro de Módulo 3\.

v1\.0

2026

Versión inicial: 5 módulos \(Login, Mi Viaje, Mis Estudiantes, Mapa, Salud\)\.

────────────────────────────────────────────────────────────────────────────────

*JUK — Jóvenes en UK  ·  PRD Vista del Representante  ·  v1\.6  ·  Mayo 2026*

