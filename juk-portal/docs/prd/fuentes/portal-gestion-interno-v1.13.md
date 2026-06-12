__JUK — Jóvenes en UK__

Portal de Gestión Interno

__PRODUCT REQUIREMENTS DOCUMENT \(PRD\)  ·  v1\.13__

*Versión 1\.3  ·  Mayo 2026*

*Décimotercera revisión: revisión Delfina v1\.6 — indicadores dashboard y roadmap v2 contratos*

*Documento interno — Uso exclusivo del equipo JUK*

# __Resumen Ejecutivo__

JUK \(Jóvenes en UK\) es una agencia argentina especializada en la organización de viajes de estudio a países de habla inglesa, principalmente el Reino Unido\. La agencia coordina entre 40 y 80 alumnos por año, distribuidos en múltiples salidas grupales y de manera individual\.

Este documento describe los requerimientos funcionales del Portal de Gestión Interno de JUK \(v1\.1\): un back\-office exclusivo para el equipo operativo de la agencia que centraliza toda la información de alumnos, viajes, colegios y el estado de cada trámite\.

## __Alcance del documento__

El PRD cubre los siguientes módulos:

- Módulo 1 — Login
- Módulo 2 — Dashboard \(pantalla principal post\-login\)
- Módulo 3 — ABM de Colegios \(Destinos y Clientes\)
- Módulo 4 — ABM de Viajes / Salidas
- Módulo 5 — ABM de Estudiantes
- Módulo 6 — Gestión de Estudiantes: Seguimiento de Estado \(Paso 0 \+ Grupos A/B/C/D\)
- Módulo 7 — Gestión de Viajes: Seguimiento de Estado \(5 pasos\)

__⚠️ Fuera de alcance — este PRD__

- Vista del Representante: portal diferenciado para group leaders externos \(calendar del viaje, mapa de alumnos, panel de estados\)\. Documentar en PRD separado\.
- Portal de Familias: vista de sólo lectura para padres y alumnos\. Mencionado donde el sistema emite comunicaciones, pero NO construido en v1\.
- Colegio cliente como entidad independiente: el Colegio cliente \(ej: NEA Argentina\) es tratado como un tipo de representante a efectos de este PRD — no tiene su propio módulo de ABM\. Sus particularidades se cubren dentro del ABM de Colegios Destino \(Módulo 3\) y en la lógica de representantes del ABM de Viajes \(Módulo 4\)\.

## __Roles del sistema__

__Admin \(ENUM: 'Admin'\)__

Miembro del equipo operador del portal\. En v1, siempre el equipo JUK: María \(CEO\), Felix \(Sales\), Delfina \(Marketing\), Tomas \(Operations\)\. Acceso completo al Portal Interno según sub\_rol\_admin\.__  ★ Requerido__

__SuperAdmin \(ENUM: 'SuperAdmin'\)__

Rol reservado para v2 \(arquitectura multi\-tenant\)\. No genera lógica nueva en v1 — no se asigna a ningún usuario en esta versión\.  ◇ Opcional

__Representante__

Group leader externo asignado a un viaje\. Vista diferenciada — documentado en PRD separado\.  ◇ Opcional

__Familia / Alumno__

Acceso de sólo lectura al estado de trámites y pagos de su alumno\. Portal futuro\.  ◇ Opcional

__Nota de arquitectura — ENUM de rol__

- El valor del ENUM 'Admin\_JUK' fue renombrado a 'Admin' para preparar la arquitectura multi\-tenant de v2, donde el sistema podrá ser operado por organizaciones externas además de JUK\.
- En v1, todos los usuarios con rol Admin son el equipo JUK\. El cambio de nombre no afecta lógica ni permisos existentes\.
- El valor 'SuperAdmin' está reservado en el ENUM pero no se asigna a ningún usuario en v1\.

## __Conceptos clave de negocio__

### __Tipos de representante__

Cada viaje tiene un representante \(group leader\)\. Existen tres tipos, con diferente lógica de pagos y alcance en este PRD:

__Tipo__

__Descripción__

__Flujo de pago__

__Representante Independiente__

Persona física que trae alumnos a JUK de forma individual\.

Siempre vía agencia externa\. Último pago presencial con JUK \(para evitar comisión 6%\)\.

__Instituto__

Institución de inglés u otro organismo que agrupa alumnos y opera como representante\.

Vía agencia externa\. Último pago presencial con JUK \(igual que Independiente\)\.

__Colegio cliente__

Institución educativa argentina \(ej: NEA\)\. El grupo viaja organizado por el colegio\. Fuera de scope de este PRD como entidad propia\.

Vía agencia externa\. TODOS los pagos — incluido el último — van a través de la agencia \(sin excepción de pago presencial JUK\)\. El paso B2 es N/A para estos alumnos\.

__Colegio destino vs\. colegio cliente__

- Colegio destino: institución educativa en UK \(u otro país anglófono\) donde los alumnos estudian\. Tiene Application Form, Parental Consent, cursos y alojamientos\. Se gestiona en el Módulo 3\.
- Colegio cliente: institución argentina \(ej: NEA\)\. Actúa como representante de tipo 'Colegio cliente'\. No tiene módulo propio en este PRD — sus particularidades se manejan como atributos del viaje\.

# __Módulo 1 — Login__

## __1\.1 Objetivo del módulo__

Garantizar que sólo los usuarios autorizados del equipo JUK puedan acceder al portal, mediante autenticación con usuario y contraseña\. El sistema debe ser simple de administrar y seguro para los 4 administradores del equipo\.

## __1\.2 User Stories y Criterios de Aceptación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-01__

*Como administrador JUK,*

quiero ingresar al portal con mi usuario y contraseña

*para acceder de forma segura a todas las funcionalidades del back\-office\.*

- El formulario tiene campos de email y contraseña\.
- Si las credenciales son correctas, se redirige al Dashboard principal\.
- Si las credenciales son incorrectas, se muestra un mensaje de error genérico \(sin revelar cuál campo es incorrecto\)\.
- Después de 5 intentos fallidos consecutivos, la cuenta se bloquea temporalmente por 15 minutos\.
- Existe un enlace de 'Olvidé mi contraseña' que envía un link de restablecimiento al email registrado\.

__US\-02__

*Como administrador JUK,*

quiero cerrar sesión desde cualquier pantalla del portal

*para proteger la información en caso de dejar la computadora desatendida\.*

- Hay un botón de cierre de sesión visible en todo momento \(header o menú\)\.
- Al cerrar sesión, la sesión se invalida en el servidor y se borra la cookie/token local\.
- Intentar acceder a una URL protegida después de cerrar sesión redirige al login\.

__US\-03__

*Como administrador JUK con permisos de super\-admin,*

quiero crear, editar y desactivar cuentas de usuario para otros miembros del equipo

*para gestionar los accesos al sistema de forma autónoma\.*

- Existe una sección de gestión de usuarios \(visible sólo para super\-admin\)\.
- Se puede crear un usuario con: nombre, apellido, email, rol \(admin / representante\) y contraseña temporal\.
- Al crear, el sistema envía un email al nuevo usuario con su contraseña temporal y un link para cambiarla\.
- Se puede desactivar un usuario sin borrarlo \(mantiene historial\)\. Un usuario desactivado no puede iniciar sesión\.
- El sistema soporta exactamente 4 usuarios administradores JUK simultáneos \(ampliable en el futuro\)\.

__US\-04__

*Como administrador JUK,*

quiero restablecer mi contraseña olvidada a través de mi email

*para recuperar el acceso al portal de forma autónoma\.*

- El link de restablecimiento caduca a las 24 horas de ser generado\.
- Una vez usado el link, queda inválido\.
- La nueva contraseña debe tener al menos 8 caracteres\.
- El sistema notifica por email cuando la contraseña fue cambiada exitosamente\.

## __1\.3 Reglas de negocio__

- __Usuarios administradores: __El sistema tendrá inicialmente 4 usuarios admins: María \(CEO\), Felix \(Sales\), Delfina \(Marketing\) y Tomas \(Operations\)\. La arquitectura debe soportar agregar más en el futuro\. El usuario con permisos de super\-admin en v1 es María \(CEO\)\.
- __Sin 2FA: __No se requiere autenticación de doble factor en la versión inicial\.
- __Sin SSO corporativo: __No se integrará con Google Workspace SSO en la versión inicial\.
- __Representantes — vista diferenciada: __Los representantes \(group leaders\) son externos a JUK y tendrán acceso a una vista diferenciada del portal\. Su módulo se documenta por separado\.
- __Activación de credenciales del Representante: __Las credenciales del Representante se activan en el momento en que es asignado al viaje\. El viaje puede estar en estado 'Inscripción abierta' y el Representante ya puede tener acceso a su vista del portal\. No hay ventana de días previos al inicio del viaje: el acceso es desde la asignación\.
- __Log de auditoría: __Todos los accesos quedan registrados \(usuario, fecha/hora, acción\)\.
- __Expiración de sesión: __La sesión expira automáticamente después de 8 horas de inactividad\.

## __1\.4 Preguntas abiertas__

__Preguntas cerradas — Módulo 1__

- ¿Cuál es el rol de super\-admin inicial? → CERRADO \(Felix\): María \(CEO\)\.
- ¿Se contempla integrar Google Workspace SSO en el futuro? → CERRADO \(Felix\): descartado\. No hay utilidad clara para el equipo en este momento\.

# __Módulo 2 — Dashboard__

## __2\.1 Objetivo del módulo__

El Dashboard es la pantalla principal a la que llega el administrador JUK al iniciar sesión\. Su función es dar visibilidad operativa inmediata: qué alumnos requieren atención urgente hoy, qué viajes se aproximan, cuáles son las alertas críticas activas y cuál es el estado general del año\. Elimina la necesidad de recorrer módulo a módulo para detectar problemas\.

## __2\.2 Secciones del Dashboard__

__Panel de alertas críticas__

Alertas de alta prioridad: ETAs rechazados o con primer pago registrado y ETA aún Pendiente, pasaportes vencidos o que vencen dentro de los 6 meses posteriores a la fecha de inicio del viaje, alumnos con mora >7 días, documentos faltantes con viaje a menos de 3 meses\.__  ★ Requerido__

__Viajes próximos \(90 días\)__

Lista de viajes en los próximos 90 días con: nombre, fechas, colegio, inscriptos/capacidad, % de trámites completados\.__  ★ Requerido__

__Alumnos con acción urgente__

Listado de alumnos ordenados por urgencia \(viaje más próximo \+ pasos bloqueados\)\. Click directo a su perfil\.__  ★ Requerido__

__Resumen del año en curso__

Métricas: alumnos activos, viajes confirmados, viajes en curso, alumnos viajando ahora\.__  ★ Requerido__

__Accesos rápidos__

Botones a las secciones más usadas: nuevo alumno, nuevo viaje, panel de pagos en mora\.  ◇ Opcional

__Indicador de pagos en mora__

Contador de alumnos con al menos una cuota vencida sin pagar\. Link al panel de pagos\.__  ★ Requerido__

__Viajes del próximo año \(>6 meses\)__

Lista de viajes Grupales con fecha de inicio a más de 6 meses\. Muestra dos indicadores visuales: alerta naranja si el viaje tiene menos de 5 alumnos \(mínimo no alcanzado\), e indicador azul si el viaje está próximo o llegó a su capacidad máxima\. Los viajes Individuales NO aparecen en esta sección\.__  ★ Requerido__

__NPS — Resultados post\-viaje__

Vista de sólo lectura con el NPS promedio de los viajes finalizados en tres dimensiones: JUK general, Representante, Colegio UK\. También muestra el NPS acumulado por representante\.__  ★ Requerido__

__Calendario visual de viajes__

Vista de calendario con todos los viajes activos y próximos distribuidos en sus fechas de inicio y fin\. Permite identificar de forma rápida solapamientos, temporadas y viajes sin alumnos suficientes\.__  ★ Requerido__

__Métricas históricas__

Panel con comparativas anuales: alumnos enviados por año, viajes por año, NPS promedio histórico\. Base de datos para análisis y proyecciones futuras\.__  ★ Requerido__

## __2\.3 User Stories y Criterios de Aceptación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-DX\-01__

*Como administrador JUK,*

quiero ver un panel de alertas críticas al iniciar sesión

*para identificar en segundos qué problemas requieren mi atención inmediata hoy\.*

- El dashboard carga automáticamente al hacer login exitoso\.
- El panel de alertas muestra: ETA rechazados, pasaportes vencidos antes del viaje, pagos en mora >7 días, documentos con fecha límite inminente\.
- Cada alerta tiene un link directo al alumno o viaje afectado\.
- Las alertas se ordenan por urgencia \(prioridad crítica > alta > media\)\.
- Se puede descartar temporalmente una alerta \(sólo para la sesión actual; vuelve al día siguiente si no fue resuelta\)\.

__US\-DX\-02__

*Como administrador JUK,*

quiero ver el estado de los viajes de los próximos 90 días con un indicador de completitud

*para detectar qué viajes están bien encaminados y cuáles tienen brechas críticas antes de que sea tarde\.*

- Los viajes próximos se muestran ordenados por fecha de inicio\.
- Cada viaje muestra: nombre, fechas, colegio destino, inscriptos/capacidad máxima\.
- Hay un indicador visual \(barra de progreso o porcentaje\) de cuántos alumnos del viaje tienen todos sus pasos Completados\.
- Al hacer click en un viaje, se navega al detalle del viaje\.

__US\-DX\-03__

*Como administrador JUK,*

quiero ver de un vistazo la lista de alumnos que requieren acción urgente

*para priorizar mi trabajo diario sin tener que revisar cada alumno individualmente\.*

- La lista muestra alumnos con al menos un paso en estado Bloqueado o con alerta activa\.
- Se ordena por: \(1\) alumnos cuyo viaje es en los próximos 30 días, \(2\) alumnos con alertas críticas\.
- Muestra por alumno: nombre, viaje asignado, días hasta el viaje, tipo de alerta\.
- Click en un alumno lleva directo a su tablero de seguimiento\.

__US\-DX\-04__

*Como administrador JUK,*

quiero ver las métricas generales del año en curso en el dashboard

*para tener contexto rápido del volumen total de la operación sin consultar reportes\.*

- El dashboard muestra: total de alumnos activos en el año, total de viajes confirmados, viajes actualmente en curso, alumnos actualmente viajando\.
- Las métricas se actualizan en tiempo real\.
- Hay un indicador de pagos en mora: número de alumnos con al menos una cuota vencida\.

__US\-DX\-05__

*Como administrador JUK,*

quiero ver en el dashboard los viajes planificados para el año siguiente \(más de 6 meses en el futuro\) con su estado de inscripción

*para detectar con anticipación qué viajes del año próximo todavía no tienen suficientes alumnos para ser viables\.*

- La sección 'Viajes del próximo año' muestra SÓLO viajes Grupales con fecha de inicio > 6 meses desde hoy\. Los viajes Individuales no aparecen aquí\.
- Cada viaje muestra: nombre, fecha, colegio destino, inscriptos actuales y un indicador visual si superó los 5 alumnos mínimos\.
- Un viaje Grupal con menos de 5 alumnos se señaliza con alerta visual \(naranja\)\.
- Un viaje Grupal que alcanzó o está próximo a su capacidad máxima se señaliza con indicador visual diferenciado \(ej: azul\) para identificar viajes con alta demanda\.
- Al hacer clic en un viaje, se navega al detalle del viaje\.

__US\-DX\-06__

*Como administrador JUK,*

quiero ver el NPS de los viajes finalizados y el NPS acumulado de cada representante

*para evaluar la calidad del servicio en las tres dimensiones que mide el Portal de Familias y tomar decisiones sobre representantes y colegios UK\.*

- Para cada viaje finalizado, el dashboard muestra el NPS promedio en tres dimensiones: JUK general, Representante y Colegio UK\.
- El NPS del viaje es el promedio de las respuestas individuales de todos los alumnos que respondieron la encuesta post\-viaje en el Portal de Familias\.
- Se muestra cuántos alumnos respondieron sobre el total del viaje \(ej: '12 de 15 respuestas recibidas'\)\.
- El NPS acumulado de un representante es el promedio de todos los viajes en los que fue GL, visible en su perfil\.
- La vista de NPS es de sólo lectura para el admin JUK — los datos son ingresados exclusivamente desde el Portal de Familias\.
- Los viajes sin respuestas NPS muestran 'Sin datos' \(no cero, para no distorsionar promedios\)\.

## __2\.4 Reglas de negocio__

- __Definición de alerta crítica: __Una alerta es crítica cuando: \(1\) ETA rechazado, \(2\) pasaporte vence dentro de los 6 meses posteriores a la fecha de inicio del viaje \(criterio de alerta conservador; la validación legal es ≥ fecha de fin del viaje para UK\), \(3\) mora >7 días en una cuota, \(4\) viaje en <7 días con algún paso obligatorio en Pendiente\.
- __Definición de alerta alta: __Una alerta es alta cuando: \(1\) primer pago pendiente con ETA en Pendiente, \(2\) viaje en <21 días con paso en Bloqueado, \(3\) pasaporte vence dentro de los 30 días siguientes a la fecha del viaje\.
- __Indicador de completitud del viaje: __El % de completitud de un viaje = alumnos con todos los pasos aplicables en Completado / total de alumnos activos del viaje\.
- __Indicador de viajes salientes — mínimo viable: __Un viaje Grupal del próximo año se considera 'en riesgo' si tiene menos de 5 alumnos inscriptos\. El dashboard lo señaliza visualmente \(naranja\) para que el equipo tome acción comercial con anticipación\. Los viajes Individuales NO aparecen en esta sección ni tienen indicador de riesgo — un viaje individual de 1 alumno es válido por definición\.
- __Resumen semanal por email: __El sistema envía automáticamente un resumen semanal a los 4 admins JUK \(info@jovenesenuk\.com o los emails individuales de cada admin\) con: alertas activas, viajes próximos en los 90 días, viajes del próximo año con menos de 5 alumnos y pagos en mora\. El día y horario del envío es configurable\.
- __Modelo de datos NPS: __El NPS de un viaje es el promedio de las respuestas individuales de sus alumnos\. El NPS de un representante es el promedio acumulado de todos sus viajes\. La fuente de datos es siempre el Portal de Familias — el portal interno sólo consume y muestra esos datos, nunca los modifica\.

## __2\.5 Preguntas abiertas__

__Preguntas cerradas — Módulo 2__

- ¿El dashboard debe incluir un calendario visual? → CERRADO \(Felix\): sí, debe incluir calendario visual — ayuda a ver la distribución de viajes de forma rápida\.
- ¿Se necesitan métricas históricas? → CERRADO \(Felix\): sí, son ideales para tener una base de datos real y poder hacer comparativas entre años\.
- ¿El resumen semanal debe enviarse también al resto de los admins? → CERRADO \(Felix\): sí, va a los 4 admins JUK\.

# __Módulo 3 — ABM de Colegios Destino__

## __3\.1 Objetivo del módulo__

Mantener un registro centralizado de los colegios destino con los que JUK opera: instituciones educativas en UK u otros países anglófonos donde los alumnos estudian durante el viaje\. Este módulo cubre exclusivamente los colegios destino\. Los colegios clientes \(ej: NEA Argentina\) son tratados como tipo de representante y se gestionan dentro del ABM de Viajes \(Módulo 4\)\.

__Alcance del módulo — sólo colegios destino__

- Colegio destino: institución educativa en UK u otro país anglófono\. Gestiona: Application Form, Parental Consent, Confirmation Letter, VISA/Immigration Letter \(template\), cursos y tipos de alojamiento\.
- Nota: la Immigration Letter por alumno individual \(con datos del pasaporte\) se gestiona en el Módulo 6 \(Paso 3\)\. Aquí se almacena el template o instrucciones generales del colegio\.
- Colegio cliente \(ej: NEA Argentina\): institución argentina que opera como representante\. NO tiene módulo propio — se gestiona como atributo del viaje en el Módulo 4\.
- La agencia de excursiones que consigue actividades para el grupo NO cobra comisión de JUK\. Su costo va al precio del programa\.

## __3\.2 Campos del formulario — Colegio destino__

### __Campos requeridos \(★\) y opcionales \(◇\)__

__Nombre del colegio__

Ej: London School of English__  ★ Requerido__

__País__

Dropdown: Reino Unido, Irlanda, Canadá, Malta, Australia, otro__  ★ Requerido__

__Ciudad / Ubicación__

Texto libre__  ★ Requerido__

__Tipo__

Colegio destino \(selección por defecto\) / Colegio cliente__  ★ Requerido__

__Contacto Académico / Principal__

Nombre \+ email \+ teléfono del interlocutor académico__  ★ Requerido__

__Contacto Administrativo / Documentos__

Nombre \+ email \+ teléfono para gestión de documentos__  ★ Requerido__

__Contacto de Alojamientos__

Nombre \+ email \+ teléfono del responsable de alojamientos  ◇ Opcional

__Contacto Programas Juniors__

Nombre \+ email \+ teléfono \(aplica a algunos colegios\)  ◇ Opcional

__Comisión del colegio destino \(%\)__

Porcentaje que cobra el colegio destino sobre el programa\. Visible sólo para admins JUK\.  ◇ Opcional

__Sitio web__

URL del colegio  ◇ Opcional

__Application Form \(archivo\)__

PDF/DOCX descargable\. Se puede actualizar\. Ver configuración de requisitos documentales \(sección 3\.3\)\.__  ★ Requerido__

__Parental Consent \(archivo\)__

PDF/DOCX\. Se actualiza año a año\. Sólo la versión vigente es accesible\. Requerido/Opcional/N/A según configuración del colegio\.  ◇ Opcional

__Año vigente del Parental Consent__

Año al que corresponde la versión activa\. Ej: 2026\. Visible sólo si Parental Consent ≠ N/A\.  ◇ Opcional

__Confirmation Letter \(template/instructivo\)__

Documento o instrucciones que el colegio envía para confirmar la inscripción\. PDF/DOCX\. Requerido/Opcional/N/A según configuración\.  ◇ Opcional

__VISA / Immigration Letter \(instrucciones\)__

Instrucciones o template del colegio para visado/ETA\. La letter personalizada por alumno se tramita en Módulo 6 \(Paso 3\)\. Requerido/Opcional/N/A según configuración\.  ◇ Opcional

__Cursos disponibles__

Lista múltiple: ej\. General English, Exam Prep, Academic Year__  ★ Requerido__

__Tipos de alojamiento__

Lista múltiple: Familia anfitriona, Residencia, otro__  ★ Requerido__

__Notas adicionales__

Texto libre para información extra  ◇ Opcional

__Estado__

Activo / Inactivo\. Default: Activo__  ★ Requerido__

### __Configuración de requisitos documentales por colegio__

Al crear o editar un colegio destino, el administrador JUK configura qué documentos son requeridos, opcionales o no aplican para ese colegio específico\. Esta configuración determina automáticamente los pasos activos en el tablero de seguimiento del alumno \(Módulo 6\) cuando se le asigna un viaje a ese colegio — sin reglas hardcodeadas en el sistema\.

__Documento estándar__

__Estados posibles__

__Impacto en Módulo 6__

__Application Form__

Requerido / Opcional / N/A

Paso 1 activo o N/A automático al asignar alumno al viaje\.

__Test de Nivel__

Requerido / Opcional / N/A

Paso 4 activo o N/A automático\.

__Parental Consent__

Requerido / Opcional / N/A

Paso 5 activo o N/A automático \(además de la regla N/A por mayoría de edad ≥18\)\.

__Confirmation Letter__

Requerido / Opcional / N/A

Visible como campo de control en el tablero del alumno\.

__VISA / Immigration Letter \(instrucciones\)__

Requerido / Opcional / N/A

Visible como campo de control en el tablero del alumno\.

__📌 Nota para desarrollo — modelo de datos extensible__

- Aunque en v1 sólo se configuran los 5 documentos estándar, la tabla de configuración documental debe diseñarse como una entidad independiente \(ej: colegio\_documento\_config\) con filas por documento, no como columnas fijas en la tabla de colegios\.
- Esto permite agregar nuevos tipos de documentos en v2 \(documentos personalizados por colegio\) sin cambiar el esquema de la base de datos ni la lógica core del Módulo 6\.
- En v2: se agregará un botón '\+ Agregar documento' que permitirá definir documentos personalizados por colegio, con su propio paso en el tablero de seguimiento del alumno\.

__Modelo de comisiones — dos capas \(colegio destino\)__

- Capa 1 — Comisión del colegio destino: porcentaje que cobra la institución de destino sobre el programa\. Se registra aquí, en el colegio destino\. Visible sólo para admins JUK\.
- La comisión de la agencia externa y el fee del representante se registran en el viaje \(Módulo 4\), no en el colegio\.
- La agencia que consigue excursiones para el grupo NO cobra comisión de JUK\. Su costo se incluye en el precio del programa\.

## __3\.3 User Stories y Criterios de Aceptación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-05__

*Como administrador JUK,*

quiero crear un nuevo colegio con todos sus datos, múltiples contactos y documentos

*para tener centralizada la información de cada institución antes de asignarla a un viaje\.*

- El formulario tiene secciones diferenciadas para cada tipo de contacto \(Académico, Administrativo, Alojamientos, Juniors\)\.
- Al menos el contacto Académico/Principal es requerido; los demás son opcionales\.
- Se pueden cargar archivos PDF o DOCX para Application Form y Parental Consent \(máx\. 10 MB cada uno\)\.
- El campo 'Comisión de agencia' sólo es visible para usuarios con rol Admin\.
- Al guardar, el colegio aparece disponible en los dropdowns del ABM de Viajes\.
- Se registra quién creó el colegio y en qué fecha\.

__US\-05b__

*Como administrador JUK,*

quiero configurar qué documentos son requeridos, opcionales o no aplican para cada colegio destino

*para que el tablero de seguimiento del alumno refleje automáticamente los requisitos reales de cada colegio, sin configuración manual por alumno\.*

- Al crear o editar un colegio, hay una sección 'Documentos del programa' con los 5 documentos estándar: Application Form, Test de Nivel, Parental Consent, Confirmation Letter y VISA/Immigration Letter\.
- Cada documento tiene un selector de tres estados: Requerido / Opcional / N/A\. El valor por defecto es Opcional\.
- Al asignar un alumno a un viaje de ese colegio, el sistema activa automáticamente los pasos del Módulo 6 que corresponden a documentos Requeridos u Opcionales, y marca como N/A los documentos configurados como N/A\.
- Si se modifica la configuración de un colegio que ya tiene alumnos activos, el sistema aplica los cambios sólo a los alumnos nuevos que se asignen desde ese momento\. Los tableros existentes no se modifican automáticamente\.
- La configuración de documentos queda registrada con fecha y usuario de última modificación\.

__US\-06__

*Como administrador JUK,*

quiero actualizar el Parental Consent de un colegio al inicio de cada ciclo anual

*para asegurar que los alumnos siempre descarguen la versión vigente del documento\.*

- Al subir un nuevo Parental Consent, el anterior se reemplaza \(no se conserva historial de versiones caducas\)\.
- El año vigente se actualiza al año del archivo subido o de forma manual\.
- El sistema muestra un aviso si el Parental Consent tiene más de 12 meses sin actualizar\.
- Los links de descarga siempre apuntan a la versión vigente\.

__US\-08__

*Como administrador JUK,*

quiero desactivar un colegio que JUK ya no opera

*para limpiar el catálogo activo sin perder el historial de viajes anteriores\.*

- Un colegio desactivado no aparece en los dropdowns de creación de viajes\.
- Los viajes y alumnos históricos conservan su referencia al colegio\.
- Se puede reactivar un colegio desactivado\.
- No se permite eliminar un colegio que tenga viajes asociados\.

__US\-09__

*Como administrador JUK,*

quiero buscar y filtrar colegios por nombre, tipo, país o estado

*para encontrar rápidamente un colegio en el catálogo\.*

- Hay un buscador de texto libre que filtra por nombre\.
- Se puede filtrar por: tipo \(destino/cliente\), país y estado \(activo/inactivo\)\.
- Los resultados muestran nombre, tipo, país, ciudad y estado\.

## __3\.4 Estados del colegio__

__Activo__

Disponible para crear viajes\.

__Inactivo__

Ya no opera con JUK\. No aparece en dropdowns\.

## __3\.5 Alertas y notificaciones__

- __Alerta interna: __El sistema avisa cuando un Parental Consent tiene más de 12 meses sin actualizarse\.
- __Alerta interna: __Si se modifica el Application Form o Parental Consent de un colegio con alumnos activos, se notifica al equipo\.

## __3\.6 Reglas de negocio — Relación colegio destino / viaje__

__Reglas de uso del colegio destino__

- Un viaje tiene SIEMPRE un colegio destino\. El tipo de representante \(Independiente, Instituto o Colegio cliente\) es un atributo del viaje \(Módulo 4\), no del colegio destino\.
- El proceso documental \(Application Form, Parental Consent, Immigration Letter, Accommodation Letter\) ocurre SIEMPRE en el colegio DESTINO, independientemente del tipo de representante\.
- Viaje con dos colegios destino: fuera del alcance de v1\. No ocurre en la operación actual de JUK\.

## __3\.7 Preguntas abiertas__

__Preguntas cerradas — Módulo 3__

- ¿NEA tiene su propio Application Form? → CERRADO \(María\): NEA usa el mismo formulario JUK\. No hay AF diferenciado\.
- ¿Se necesita campo de precio por semana? → CERRADO: sí, para viajes Individuales \(que pueden tener duraciones variables: 2, 3 o más semanas\)\. Los viajes Grupales suelen ser 2 o 3 semanas fijas\. Ver campo en ABM de Viajes \(pendiente de incluir en próxima versión\)\.
- ¿Se incluye un modelo de precios o presupuesto por alumno en v1? → CERRADO \(Felix\): no\. Los precios son difíciles de calcular automáticamente\. El presupuesto del viaje se hace aparte\. Las comisiones de colegios y representantes son sólo referencia interna — el portal no calcula ni muestra precio final al alumno en v1\.

__Roadmap v2 — Gestión de contratos con colegios destino \(Delfina\)__

- Contrato de representación: adjuntar archivo del contrato firmado con el colegio destino y registrar fecha de vigencia \(inicio y vencimiento\)\.
- Alerta de vencimiento: notificación interna cuando un contrato esté próximo a vencer \(ej: 30 días antes\), para que el equipo JUK gestione la renovación a tiempo\.
- Vacantes pedidas al colegio: campo para registrar la cantidad de plazas solicitadas formalmente al colegio destino por temporada o año\.
- Estos campos y flujos quedan fuera del alcance de v1\. Se incorporarán en una versión futura del módulo\.

# __Módulo 4 — ABM de Viajes / Salidas__

## __4\.1 Objetivo del módulo__

Registrar y gestionar cada salida grupal organizada por JUK\. Un viaje agrupa a un conjunto de alumnos que viajan juntos con uno o más group leaders a un colegio destino\. El módulo controla la capacidad, las fechas, el destino y el ciclo de vida de cada salida\. El estado del viaje determina qué acciones son posibles \(ej: sólo se pueden inscribir alumnos cuando el viaje está en Inscripción abierta\)\.

## __4\.2 Campos del formulario__

__Nombre / código del viaje__

Identificador legible\. Ej: UK\-2026\-JUL\-LONDON__  ★ Requerido__

__Tipo de viaje__

ENUM requerido: Grupal | Individual\. Condiciona campos y comportamientos del viaje\.__  ★ Requerido__

__Tipo de representante__

Dropdown: Representante Independiente / Instituto / Colegio cliente / JUK \(directo\)\. Determina el flujo de pago\. 'JUK \(directo\)' aplica cuando el alumno llega sin intermediario externo\.__  ★ Requerido__

__Representante \(group leader principal\)__

Dropdown de usuarios con rol representante\. Para 'JUK \(directo\)' no hay persona externa — JUK opera como representante de facto\. Se oculta / fija automáticamente para viajes Individuales\.__  ★ Requerido__

__Cantidad de group leaders__

Número entero ≥ 1\. Sólo visible para viajes Grupales\. Para viajes Individuales: fijo en 0 \(sin GL\)\.__  ★ Requerido__

__Capacidad máxima de alumnos__

Para viajes Grupales: calculado como GL × 12, editable sólo hacia abajo\. Para viajes Individuales: fijo en 1, no editable\.__  ★ Requerido__

__Fecha de inicio__

Fecha de salida desde Argentina__  ★ Requerido__

__Fecha de fin__

Fecha de regreso a Argentina__  ★ Requerido__

__Semanas de duración__

Calculado automáticamente: \(fecha fin − inicio\) / 7\. Sólo lectura\.__  ★ Requerido__

__País destino__

Dropdown: Reino Unido, Irlanda, Canadá, Malta, Australia, otro__  ★ Requerido__

__Colegio destino__

Dropdown filtrado por país\. Sólo colegios activos de tipo destino\.__  ★ Requerido__

__Colegio cliente \(origen\)__

Dropdown de colegios activos de tipo cliente\. Opcional si el origen es un representante independiente\.  ◇ Opcional

__Tipo de curso__

Dropdown con los cursos del colegio destino seleccionado__  ★ Requerido__

__Tipo de alojamiento__

Dropdown con los alojamientos del colegio destino seleccionado__  ★ Requerido__

__Flujo de pago__

Calculado automáticamente\. 'Vía agencia' para Independiente, Instituto y Colegio cliente\. 'Directo JUK' sólo cuando tipo = 'JUK \(directo\)'\. La diferencia entre Independiente/Instituto y Colegio cliente es si el último pago tiene excepción presencial \(ver Grupo B / B2 en Módulo 6\)\.__  ★ Requerido__

__Comisión de la agencia externa \(%\)__

Porcentaje que cobra la agencia al procesar los pagos\. Visible sólo para admins JUK\. Aplica para viajes 'Vía agencia'\. N/A automático para 'JUK \(directo\)'\.  ◇ Opcional

__Fee del representante__

Monto fijo o porcentaje que el representante suma al precio base del alumno\. Visible sólo para admins JUK\. Aplica para Representante Independiente e Instituto\.  ◇ Opcional

__Cantidad de alumnos inscriptos__

Calculado automáticamente\. Sólo lectura\.  ◇ Opcional

__Estado del viaje__

Ver sección 4\.4__  ★ Requerido__

__Notas internas__

Texto libre para el equipo JUK  ◇ Opcional

## __4\.3 User Stories y Criterios de Aceptación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-10__

*Como administrador JUK,*

quiero crear un nuevo viaje con todos sus datos, incluyendo si el origen es un representante o un colegio cliente

*para tener registrada cada salida como unidad de gestión independiente y con el flujo de pago correcto\.*

- Al seleccionar colegio destino, el dropdown de cursos y alojamientos se filtra a su oferta\.
- El campo 'Semanas' se calcula automáticamente al ingresar fechas\.
- La capacidad máxima se calcula como GL × 12 y puede ajustarse sólo hacia abajo\.
- El sistema impide crear un viaje con fecha de fin anterior a fecha de inicio\.
- Al seleccionar el tipo de representante, el campo 'Flujo de pago' se calcula automáticamente \('Directo JUK' para Colegio cliente / 'Vía agencia' para los demás\)\.
- Al guardar, el viaje queda directamente en estado 'Inscripción abierta' \(no existe estado Borrador\)\.

__US\-11__

*Como administrador JUK,*

quiero agregar y quitar alumnos de un viaje en Inscripción abierta o Confirmado

*para mantener la lista de inscriptos actualizada incluso después de que el viaje se confirmó\.*

- Se pueden agregar y quitar alumnos en estado 'Inscripción abierta' Y en estado 'Confirmado'\.
- Al vincular un alumno, el contador de inscriptos se actualiza en tiempo real\.
- Si se intenta agregar un alumno que lleva el total sobre la capacidad máxima, el sistema advierte pero no bloquea \(requiere confirmación explícita\)\.
- Cuando el viaje alcanza 5 alumnos inscriptos, el sistema genera una notificación interna indicando que puede confirmarse\.
- El detalle del viaje muestra siempre: inscriptos / capacidad máxima / vacantes disponibles\.

__US\-10b__

*Como administrador JUK,*

quiero crear un viaje de tipo Individual para un alumno que contrata el servicio de colegio destino sin grupo

*para gestionar alumnos individuales dentro del mismo portal sin necesidad de workarounds ni planillas paralelas\.*

- Al seleccionar tipo\_viaje = 'Individual', el formulario oculta los campos de group leaders y fija la capacidad en 1\.
- El viaje Individual se crea directamente en estado 'Confirmado' \(no pasa por 'Inscripción abierta'\)\.
- Se puede seleccionar 'JUK \(directo\)' como representante si el alumno llegó sin intermediario externo\.
- En el tablero de seguimiento del viaje \(Módulo 7\): Paso 1 \(Pasajes\) se activa con una nota 'El alumno gestiona sus propios pasajes — JUK registra los datos del vuelo'\. Paso 5 \(Police checks\) se marca N/A automáticamente \(sin GL\)\. Pasos 2, 3 y 4 aplican normalmente\.
- La lista de viajes muestra un badge visual 'Individual' para diferenciarlo de salidas grupales\.

__US\-12__

*Como administrador JUK,*

quiero ver el listado de todos los viajes con sus fechas, estado y ocupación

*para tener una vista global del pipeline de salidas del año\.*

- La lista muestra: código del viaje, colegio destino, fechas, estado, inscriptos/capacidad, y badge 'Individual' para viajes individuales\.
- Se puede filtrar por: año, país, colegio destino, tipo de viaje \(Grupal / Individual\) y estado\.
- Los viajes se ordenan por fecha de inicio de forma descendente por defecto\.

__US\-13__

*Como administrador JUK,*

quiero avanzar el estado de un viaje a lo largo de su ciclo de vida

*para comunicar al equipo en qué etapa se encuentra cada salida y habilitar/bloquear acciones correspondientes\.*

- Los estados siguen el flujo definido \(ver sección 4\.4\)\. No se puede saltar pasos\.
- Cada cambio de estado queda registrado con fecha, hora y usuario\.
- Al cancelar un viaje, el sistema pregunta si se debe notificar a los alumnos inscriptos\.
- Si se editan las fechas de un viaje con alumnos inscriptos, el sistema muestra una advertencia y verifica si la fecha de vencimiento de pasaporte de algún alumno quedaría comprometida\.

__US\-14__

*Como administrador JUK,*

quiero ver el detalle completo de un viaje incluyendo todos sus alumnos y estado de trámites

*para tener una vista 360° del viaje sin necesidad de consultar múltiples módulos\.*

- El detalle del viaje incluye la lista de alumnos con su estado de seguimiento resumido\.
- Se puede hacer clic en cada alumno para ir al detalle de su seguimiento\.
- El detalle muestra alertas activas del viaje \(pagos atrasados, documentos pendientes, ETAs rechazados\)\.

## __4\.4 Estados del viaje y ciclo de vida__

__Ciclo de vida del viaje__

- Grupal: Inscripción abierta → Confirmado \(automático al llegar a 5 alumnos\) → En curso → Finalizado
- Individual: nace directamente en Confirmado \(capacidad = 1; la regla de 5 alumnos no aplica\)\.
- Desde cualquier estado \(excepto Finalizado\) → Cancelado
- Nota: NO existe estado 'Borrador' en ningún tipo de viaje\.

__Inscripción abierta__

Estado inicial\. Habilitado para agregar/quitar inscriptos\.

__Confirmado__

Se alcanzaron 5\+ alumnos\. Confirmado con el colegio\. Se pueden seguir agregando/quitando alumnos\.

__En curso__

Alumnos ya viajaron, programa activo en destino\.

__Finalizado__

Viaje completado, todos los alumnos regresaron\.

__Cancelado__

Viaje cancelado\. Los alumnos se liberan\.

__Reglas de transición de estado__

- Viaje Grupal — creación → Inscripción abierta: el viaje grupal se crea directamente en este estado\. No hay Borrador\.
- Viaje Grupal — Inscripción abierta → Confirmado: AUTOMÁTICO al llegar a 5 alumnos inscriptos\. También puede activarse manualmente\.
- Viaje Individual — creación → Confirmado: el viaje individual nace directamente en Confirmado\. No pasa por Inscripción abierta ni requiere 5 alumnos\.
- En estados Inscripción abierta y Confirmado \(Grupal\): se pueden agregar y quitar alumnos\.
- Confirmado → En curso: activación manual o automática en la fecha de inicio del viaje \(aplica a ambos tipos\)\.
- En curso → Finalizado: activación manual o automática en la fecha de fin del viaje \(aplica a ambos tipos\)\.
- Cualquier estado → Cancelado: acción manual con confirmación\. Ofrece notificar al alumno inscripto\.

## __4\.5 Reglas de negocio__

- __Tipo de viaje — Individual vs\. Grupal: __El campo tipo\_viaje determina el comportamiento del viaje\. Grupal: flujo estándar \(GL, capacidad variable, estado inicial 'Inscripción abierta', regla de 5 alumnos para auto\-Confirmado\)\. Individual: sin GL, capacidad fija 1, estado inicial 'Confirmado', pasos de viaje ajustados \(ver Módulo 7\)\.
- __Viaje Individual — pasajes: __El alumno individual gestiona sus propios pasajes\. JUK sólo registra los datos del vuelo que el alumno provee \(número de vuelo, fechas, horarios\)\. No hay coordinación grupal ni emisión de tickets por parte de JUK\.
- __Representante JUK \(directo\): __Cuando el alumno llega sin intermediario externo, se selecciona 'JUK \(directo\)' como tipo de representante\. Esto fija automáticamente el flujo de pago en Directo JUK, la comisión de agencia externa = N/A y no se generan credenciales de portal para un representante externo \(no existe persona física externa\)\. Puede aplicar tanto a viajes Individuales como a viajes Grupales coordinados directamente por JUK\.
- __Proporción GL/Alumnos: __Sólo para viajes Grupales: 1 group leader cada 12 alumnos máximo\. Capacidad máxima = cantidad de GL × 12\.
- __Agregar/quitar en Inscripción abierta Y Confirmado: __Se pueden agregar y quitar alumnos en ambos estados\. En estados posteriores \(En curso, Finalizado\) sólo se puede dar de baja un alumno por razones extraordinarias con confirmación explícita\.
- __Confirmado automático al llegar a 5 alumnos: __Cuando el viaje alcanza 5 alumnos inscriptos, el estado pasa automáticamente a 'Confirmado'\. El admin puede confirmar manualmente antes si lo necesita\.
- __Representante siempre externo: __Los representantes son siempre externos a JUK, funcionan como agentes de un modelo de venta directa\.
- __Representante vs\. Group Leader físico: __El representante registrado en el sistema es el contacto responsable del viaje\. El o los group leaders que físicamente acompañan al grupo pueden ser la misma persona o personas distintas\. Hasta ahora ambos roles siempre coincidieron en la misma persona, pero la arquitectura debe soportar que difieran\. En v1, el campo 'Representante \(group leader principal\)' registra al contacto responsable; si el GL físico es distinto, queda documentado en el campo de notas internas del viaje\.
- __Multi\-viaje por alumno: __Un alumno puede estar inscripto en más de un viaje en el mismo año \(ej: un viaje en enero y otro en julio\)\.
- __Edición de fechas: __Si el viaje está en Inscripción abierta o posterior, editar fechas genera una validación automática de pasaportes de todos los alumnos inscriptos\.
- __Flujo de pago según tipo de representante: __Representante Independiente e Instituto → 'Vía agencia': todos los pagos por agencia, EXCEPTO el último que se cobra presencialmente con JUK \(paso B2 activo en Módulo 6\)\. Colegio cliente → 'Vía agencia' SIN excepción presencial: todos los pagos incluido el último van a través de la agencia \(B2 = N/A\)\. JUK \(directo\) → 'Directo JUK': sin agencia externa, comisión = N/A, fee = N/A, B2 = N/A\.
- __Activación del tablero de seguimiento del alumno: __Los pasos del Módulo 6 \(Paso 0 \+ Grupos A/B/C/D\) se activan en el momento en que el alumno es asignado a un viaje, independientemente del estado del viaje\. Esto garantiza que el seguimiento puede iniciarse de inmediato sin esperar a que el viaje pase a Confirmado\.
- __Viaje con dos colegios destino: __Fuera del alcance de la versión 1\. No ocurre en la operación actual de JUK\. Si ocurre en el futuro, se creará un viaje por colegio destino\.

## __4\.6 Preguntas abiertas__

__❓ Preguntas abiertas — Módulo 4__

- ¿El sistema debe manejar un campo de precio o costo por alumno a nivel de viaje \(para calcular el total que paga el alumno a partir de las tres capas de comisión\)? Felix indicó que varía según cantidad de alumnos\. Definir si se incluye en v1 o es futuro\.
- ¿Los campos de comisión se usan para referencia interna o para calcular el precio final? → CERRADO \(María\): en algunos casos sí son el precio final al alumno, en otros no\. Requiere definir por tipo de viaje si el portal calcula o sólo muestra referencia\.

# __Módulo 5 — ABM de Estudiantes__

## __5\.1 Objetivo del módulo__

Gestionar el alta, visualización y edición de los datos de cada estudiante\. El proceso de alta se inicia externamente a través del Application Form JUK \(Google Form\), y el equipo opera sobre esos datos desde el portal\. La integración es por webhook\.

## __5\.2 Flujo de alta de estudiantes__

__Flujo de alta__

Familia completa el Application Form JUK \(Google Form\) → Webhook dispara la creación del registro en el portal → Estado: Pre\-inscripto → Equipo JUK revisa y completa datos → Asignación a viaje → Estado: Inscripto

El Google Form actual ya está creado\. Se explorará en el futuro si el formulario puede estar embebido en una landing page asociada al portal\.

## __5\.3 Campos del estudiante__

### __Datos personales \(del alumno\)__

__Nombre \(como figura en pasaporte\)__

Debe coincidir exactamente con el pasaporte__  ★ Requerido__

__Apellido \(como figura en pasaporte\)__

Debe coincidir exactamente con el pasaporte__  ★ Requerido__

__Fecha de nacimiento__

Formato DD/MM/AAAA__  ★ Requerido__

__DNI__

Documento de identidad argentino__  ★ Requerido__

__Número de pasaporte__

Se usa para verificar la Immigration Letter__  ★ Requerido__

__Fecha de vencimiento del pasaporte__

Validación automática: debe ser ≥ fecha de fin del viaje \(para UK\)\. Ver regla de negocio\.__  ★ Requerido__

__Número de teléfono del alumno__

WhatsApp preferentemente  ◇ Opcional

__Email del alumno__

Email propio del estudiante  ◇ Opcional

__Alergias / dietas / problemas de salud__

Texto libre\. Confidencial\.  ◇ Opcional

### __Datos de contacto familiar__

__Nombre completo Tutor 1__

Padre / madre / tutor principal__  ★ Requerido__

__Celular Tutor 1__

WhatsApp preferentemente__  ★ Requerido__

__Email Tutor 1__

Email principal para comunicaciones__  ★ Requerido__

__Nombre completo Tutor 2__

Opcional  ◇ Opcional

__Celular Tutor 2__

Opcional  ◇ Opcional

__Email Tutor 2__

Opcional  ◇ Opcional

### __Datos del programa__

__Viaje asignado__

Dropdown con viajes en estado 'Inscripción abierta'\. Se puede asignar luego del alta\.  ◇ Opcional

__Tipo de alojamiento solicitado__

Familia anfitriona / residencia / otro  ◇ Opcional

__Preferencias de alojamiento__

Texto libre \(ej: no fumadores, mascotas, etc\.\)  ◇ Opcional

__Nivel de inglés \(autoevaluación\)__

Dropdown o texto  ◇ Opcional

### __Datos de seguimiento \(generados internamente\)__

__Estado general del alumno__

Ver sección 5\.5__  ★ Requerido__

__Fecha de alta en el sistema__

Automático \(fecha del webhook\)__  ★ Requerido__

__Usuario que procesó el alta__

Automático__  ★ Requerido__

__Notas internas__

Campo libre para el equipo JUK\. Visible para representantes \(excepto datos fiscales\)\.  ◇ Opcional

## __5\.4 User Stories y Criterios de Aceptación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-15__

*Como administrador JUK,*

quiero recibir automáticamente un nuevo registro de alumno cuando se completa el Application Form JUK

*para eliminar el trabajo manual de cargar datos desde una planilla externa\.*

- Al completar el Google Form, un webhook crea automáticamente el registro del alumno en el portal\.
- Todos los campos del form se mapean a los campos del sistema\.
- El alumno aparece en la lista con estado 'Pre\-inscripto' y una notificación al equipo\.
- El equipo puede editar cualquier campo desde el portal\.
- Los datos de facturación son visibles sólo para admins JUK, no para representantes\.

__US\-16__

*Como administrador JUK,*

quiero asignar un alumno a un viaje en estado 'Inscripción abierta'

*para vincular al estudiante con su grupo y habilitar el seguimiento de trámites\.*

- El dropdown de viajes muestra sólo los viajes en estado 'Inscripción abierta' con vacantes disponibles\.
- Al asignar, el contador de inscriptos del viaje se actualiza\.
- Si el viaje está al límite de capacidad, el sistema advierte antes de confirmar\.
- Al asignar, el sistema activa automáticamente el tablero de seguimiento del alumno \(Módulo 6\)\.
- El sistema valida automáticamente si la fecha de vencimiento del pasaporte del alumno es válida para el viaje asignado\.

__US\-17__

*Como administrador JUK,*

quiero buscar y filtrar alumnos por nombre, viaje, estado o alertas activas

*para identificar rápidamente los alumnos que necesitan atención prioritaria\.*

- Hay un buscador por nombre, apellido o número de pasaporte\.
- Se puede filtrar por: viaje asignado, estado general, alertas activas, paso de trámite pendiente\.
- La vista de lista muestra un indicador visual de alertas activas por alumno\.

__US\-18__

*Como administrador JUK,*

quiero editar los datos de un alumno en cualquier momento

*para corregir errores del formulario original o actualizar datos del pasaporte renovado\.*

- Todos los campos son editables desde el portal\.
- Los cambios en datos de pasaporte \(nombre, número, fecha de nacimiento, vencimiento\) quedan marcados con fecha del cambio — impactan la verificación de Immigration Letter\.
- Si se actualiza la fecha de vencimiento del pasaporte, el sistema re\-valida automáticamente contra la fecha del viaje\.
- No se puede eliminar un alumno con documentos generados; sólo se puede dar de baja\.

__US\-19__

*Como administrador JUK,*

quiero dar de baja a un alumno que cancela su participación

*para reflejar con precisión la ocupación del viaje sin perder el historial\.*

- Al dar de baja, el alumno pasa a estado 'Baja' y el contador del viaje se actualiza\.
- Se registra la fecha y el motivo de la baja \(campo opcional\)\.
- El alumno dado de baja sigue visible en el historial pero no aparece en vistas activas\.

__US\-19b__

*Como administrador JUK,*

quiero que el sistema genere automáticamente las credenciales del Portal de Familias en el momento en que se da de alta el alumno, para que el acceso esté listo cuando JUK decida compartirlo

*para separar la preparación del acceso \(automática\) del momento de compartirlo con la familia \(a criterio del admin\), sin bloquear ni precipitar ninguna de las dos acciones\.*

- Al crear el registro del alumno \(vía webhook desde el Google Form o manualmente\), el sistema genera automáticamente usuario y contraseña temporal para el Portal de Familias, usando el email del Tutor 1 como usuario\.
- Las credenciales se crean pero NO se envían automáticamente — el envío es una acción deliberada del admin JUK\.
- En el perfil del alumno se muestra claramente si las credenciales del Portal de Familias ya fueron enviadas o no \(estado: 'Acceso no enviado' / 'Acceso enviado — fecha'\)\.
- El admin puede enviar o reenviar las credenciales desde el perfil del alumno con un botón 'Enviar acceso al Portal de Familias'\.
- Al hacer clic en 'Enviar acceso', el padre/tutor recibe un email desde info@jovenesenuk\.com con: su email como usuario, contraseña temporal y link al portal\.
- El acceso al Portal de Familias queda activo desde el momento en que el admin envía las credenciales, independientemente del estado del viaje\.
- Si el alumno es dado de baja, las credenciales del Portal de Familias se desactivan automáticamente\.

## __5\.5 Estados del estudiante__

__Pre\-inscripto__

Llenó el form JUK, pendiente de procesamiento\.

__Inscripto__

Procesado y asignado a un viaje activo\.

__Activo__

Trámites en curso, viaje próximo\.

__Viajando__

Actualmente en el destino\.

__Finalizado__

Regresó de su viaje\.

__Baja__

Canceló su participación\.

## __5\.6 Reglas de negocio__

- __Validación de pasaporte — UK: __Para viajes al Reino Unido: el pasaporte debe ser válido durante toda la estadía, es decir, la fecha de vencimiento del pasaporte debe ser igual o posterior a la fecha de fin del viaje\. UK NO exige los 6 meses adicionales típicos de otros países\. El sistema valida esto automáticamente al asignar el alumno y muestra una alerta si el pasaporte vence antes del fin del viaje\.
- __Validación de pasaporte — otros países: __Para viajes a países distintos de UK, el sistema debe alertar si el pasaporte vence dentro de los 6 meses posteriores a la fecha de fin del viaje\. Esto es configurable por país\.
- __Visibilidad de datos: __El representante del viaje puede ver los datos personales y de contacto del alumno y la familia\. Los datos internos \(notas de salud, observaciones del equipo\) son sólo para admins JUK\.
- __Multi\-viaje: __Un alumno puede participar en más de un viaje en distintas temporadas del año\. Cada asignación genera un tablero de seguimiento independiente\.
- __Identificación de alumno de colegio cliente: __El alumno NO tiene un campo propio que lo identifique como perteneciente a un colegio cliente\. La asociación se deduce del viaje asignado \(el viaje tiene el tipo de representante 'Colegio cliente'\) y se origina desde el link del Application Form JUK que fue enviado a ese grupo\. Cada salida de colegio cliente tiene su propio link de Application Form — al completarlo, el webhook asocia automáticamente al alumno al viaje correspondiente y, por extensión, al colegio cliente\.

## __5\.7 Preguntas abiertas__

__Preguntas cerradas — Módulo 5__

- ¿El alumno puede editar sus propios datos \(ej: actualizar número de pasaporte renovado\) desde el portal de familias, o sólo puede hacerlo el admin JUK? → CERRADO \(María\): sólo puede hacerlo el admin JUK\. Si la familia pudiera editarlo directamente, no quedaría registro de quién realizó el cambio ni cuál es la versión vigente\. La edición de datos del alumno es acción exclusiva del equipo interno\.
- ¿Cómo se identifica si el alumno pertenece a un colegio cliente \(ej: NEA\)? ¿Es un campo del alumno o se deduce del viaje asignado? → CERRADO \(Tomas\): se deduce del viaje asignado\. La asociación se origina por el link de Application Form JUK enviado a ese grupo — cada salida de colegio cliente tiene su propio link, y al completarlo el webhook vincula al alumno al viaje \(y por tanto al colegio cliente\) automáticamente\.
- ¿Las familias tendrán acceso a ver el estado de los pasos de su alumno desde el portal? → CERRADO: sí\. Se implementa en el Portal de Familias \(PRD separado, actualmente en v1\.7\)\. El Portal Interno no duplica esa funcionalidad\.

# __Módulo 6 — Gestión de Estudiantes: Seguimiento__

## __6\.1 Objetivo del módulo__

Centralizar el seguimiento de todos los trámites individuales que cada alumno debe completar antes de su viaje\. El sistema provee visibilidad de estado, registro de documentos, recordatorios automáticos y alertas de demora\.

## __6\.2 Estructura general del tablero__

El tablero de cada alumno se organiza en un Paso 0 de referencia y cuatro grupos temáticos \(A, B, C, D\)\. Los pasos dentro de cada grupo son mayormente paralelos entre sí; las dependencias entre grupos son explícitas y se detallan a continuación\.

__Paso 0 — Origen del alumno en JUK \(referencia, sólo lectura\)__

- Registra cuándo y cómo el alumno ingresó al sistema JUK\. No requiere acción\.
- Si ingresó vía Google Form → se marca automáticamente Completado con fecha y hora del envío\.
- Si fue dado de alta manualmente → se registra como 'Alta manual' con fecha y usuario responsable\.

__Grupo A — Inscripción y programa__

- A1 · Application Form del colegio
- A2 · Test de Nivel \(N/A si el colegio no lo requiere\)
- A3 · Parental Consent \(N/A si el alumno es ≥ 18 años al inicio del viaje o el colegio no lo requiere\)

__Grupo B — Pagos__

- B1 · Plan de cuotas
- B2 · Último pago presencial \(N/A para Colegio cliente y JUK directo\)

__Grupo C — Documentación de viaje__

- C1 · ETA — se recomienda tramitar antes del primer pago\.
- C2 · Immigration Letter — requiere B1 Completado\.
- C3 · Accommodation Letter

__Grupo D — Documentación legal argentina__

- D1 · Autorización de viaje ante escribano \(N/A si el alumno es ≥ 18 años al inicio del viaje\)
- D2 · Certificado de aptitud psicofísica \(N/A para viajes Individuales sin GL\)

__Activación del tablero__

- Todos los pasos se activan cuando el alumno es asignado a un viaje, independientemente del estado del viaje\.
- Los pasos con lógica condicional se marcan N/A automáticamente en el momento de la activación según la configuración del colegio \(Módulo 3, US\-05b\) y las reglas del viaje\.
- Si el alumno es reasignado a otro viaje, todos los pasos se resetean al estado inicial del nuevo viaje\.

__Dependencias entre grupos__

- C2 \(Immigration Letter\) requiere B1 \(Plan de cuotas\) Completado\.
- El resto de los grupos son paralelos entre sí\.
- C1 \(ETA\) no tiene dependencia formal, pero se recomienda antes del primer pago de B1\.

## __6\.3 Paso 0 — Application Form JUK__

El Paso 0 es el punto de entrada del alumno al sistema JUK\. Es de sólo lectura: no puede modificarse ni marcarse manualmente como Completado\. Su función es registrar el canal de ingreso y la fecha exacta de la primera interacción del alumno con JUK\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-00__

*Como administrador JUK,*

quiero ver el estado del Application Form JUK de cada alumno como punto de partida del tablero

*para tener visibilidad del canal de ingreso del alumno al sistema y la fecha exacta de su primera interacción con JUK\.*

- Cuando el alumno es creado vía webhook \(Google Form\), el Paso 0 se marca automáticamente Completado con fecha y hora del envío\.
- Cuando el alumno es creado manualmente, el Paso 0 se registra como 'Alta manual' con fecha y usuario responsable\.
- El Paso 0 es de sólo lectura — no puede modificarse ni marcarse manualmente como Completado\.
- El Portal de Familias muestra el Paso 0 como el primer evento del timeline del alumno\.

## __6\.4 Grupo A — Inscripción y programa__

Los pasos del Grupo A gestionan los documentos requeridos por el colegio destino para formalizar la inscripción del alumno\. Los pasos son paralelos entre sí\.

### __A1 — Application Form del colegio__

Cada colegio tiene su propio Application Form \(PDF\) que el alumno debe completar y devolver\. El paso cuenta con fecha límite definida por el colegio y recordatorios automáticos escalonados\.

### __Flujo del paso__

1. JUK descarga el Application Form del colegio desde el portal \(Módulo 3\)\.
2. JUK envía el form al alumno/familia por email\.
3. La familia lo completa, firma y devuelve a JUK\.
4. JUK verifica y carga el form completado en el portal\.
5. Paso marcado como Completado\.

### __User Stories__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-20__

*Como administrador JUK,*

quiero registrar la fecha límite del Application Form y que el sistema envíe recordatorios automáticos escalonados

*para reducir la carga manual de hacer seguimiento sin perder el control de los plazos\.*

- Se puede ingresar una fecha límite de entrega del Application Form por alumno \(el valor por defecto se hereda del viaje y puede sobreescribirse por alumno\)\.
- El sistema envía recordatorios automáticos a la familia del alumno a los 14, 7, 3 días antes y el día anterior a la fecha límite\.
- Al vencerse la fecha límite sin entrega, el sistema NO bloquea el paso: registra el estado como 'Vencido' y mantiene la alerta activa\.
- Se puede cargar el archivo del form completado en el perfil del alumno\.
- Al marcar como Completado, se registra la fecha de entrega\.
- La vista del viaje muestra cuántos alumnos completaron este paso vs\. total\.

### __Alertas__

- Recordatorio automático a la familia: 14, 7, 3 días antes y el día anterior a la fecha límite\.
- Alerta interna al equipo JUK si el viaje está a menos de 30 días y el paso sigue Pendiente\.

### __A2 — Test de Nivel__

El Test de Nivel depende del colegio destino\. La activación de este paso es automática: si el Test de Nivel está configurado como N/A para el colegio destino \(Módulo 3, US\-05b\), el paso se marca N/A al activar el tablero del alumno\. En algunos colegios el resultado viene incluido en la Immigration Letter\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-27__

*Como administrador JUK,*

quiero registrar el estado del test de nivel y su resultado cuando está disponible

*para tener visibilidad del nivel asignado a cada alumno, que puede afectar al programa\.*

- Si el Test de Nivel está configurado como N/A para el colegio \(US\-05b\), el paso se marca N/A automáticamente al activar el tablero\.
- Si el nivel ya viene en la Immigration Letter, se puede registrar desde ese paso\.
- Se puede anotar el resultado \(nivel asignado\) como campo de texto\.

### __Alertas__

- Alerta si el paso es requerido \(no N/A\) y el viaje está a menos de 30 días sin completar\.

### __A3 — Parental Consent__

El colegio destino envía el Parental Consent a JUK\. Existen dos versiones según la edad del alumno al inicio del viaje: menores de 16 años y alumnos de 16–17 años\. La activación combina dos reglas: \(1\) si el Parental Consent está configurado como N/A para ese colegio \(US\-05b\), el paso es N/A automáticamente; \(2\) si el alumno tiene 18 años o más al inicio del viaje, el paso es N/A independientemente de la configuración del colegio\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-28__

*Como administrador JUK,*

quiero identificar automáticamente qué versión del Parental Consent corresponde a cada alumno

*para evitar enviar el documento incorrecto a una familia\.*

- El sistema calcula la edad del alumno al inicio del viaje\.
- Muestra automáticamente qué versión aplica \(< 16 años / 16\-17 años\)\.
- Si el alumno cumple 16 entre la fecha de alta y la de inicio, el sistema advierte\.

__US\-29__

*Como administrador JUK,*

quiero registrar el ciclo completo del Parental Consent: enviado, firmado y recibido

*para tener trazabilidad del estado de este documento crítico por alumno\.*

- El paso tiene sub\-estados: Enviado a familia / Firmado por familia / Recibido y archivado\.
- Se puede cargar el documento firmado escaneado\.
- Al cargar el firmado, el paso pasa a Completado\.

### __Alertas__

- Alerta si el alumno es menor de 18 y el Parental Consent no fue devuelto 3 meses antes del viaje\.

## __6\.5 Grupo B — Pagos__

Los pagos no son online y se realizan en cuotas\. La agencia externa \(o JUK directamente\) informa quién pagó; JUK registra los pagos en el portal\.

### __B1 — Plan de cuotas__

Registro cuota a cuota del plan de pagos del alumno\. El canal de pago \('Vía agencia' o 'Presencial JUK'\) se asigna automáticamente según el tipo de representante del viaje\.

### __Campos del registro de pagos por alumno__

__Plan de pagos__

Número de cuotas y montos acordados__  ★ Requerido__

__Cuota N°__

Número de la cuota__  ★ Requerido__

__Monto de la cuota__

Monto en moneda acordada__  ★ Requerido__

__Fecha de vencimiento__

Fecha en que debía pagarse__  ★ Requerido__

__Fecha de pago efectivo__

Cuándo se confirmó el pago  ◇ Opcional

__Canal de pago__

'Vía agencia' o 'Presencial JUK' \(calculado automáticamente según flujo del viaje\)\.__  ★ Requerido__

__Observaciones__

Texto libre  ◇ Opcional

__ID__

__User Story__

__Criterios de Aceptación__

__US\-22__

*Como administrador JUK,*

quiero registrar los pagos de cada alumno cuota por cuota y ver el saldo pendiente actualizado

*para tener el historial de pagos centralizado en el portal sin depender de planillas\.*

- Se puede ingresar cada cuota con su fecha de vencimiento y monto\.
- Al confirmar un pago, se registra la fecha de pago efectivo y el canal\.
- El sistema calcula automáticamente el saldo pendiente\.
- El paso se marca Completado cuando todas las cuotas están saldadas\.

__US\-23__

*Como administrador JUK,*

quiero recibir alertas cuando un alumno tiene una cuota vencida sin pagar

*para actuar a tiempo antes de que la deuda se acumule\.*

- El sistema genera una alerta interna al día siguiente del vencimiento impago\.
- Las alertas se agrupan en el panel de 'Pagos en mora' del Dashboard\.
- La alerta muestra: nombre del alumno, viaje, número de cuota, monto y días de mora\.
- Si la mora supera 7 días, se envía alerta por email a los admins JUK desde info@jovenesenuk\.com\.

__US\-24__

*Como administrador JUK,*

quiero ver el estado de pagos de todos los alumnos de un viaje en una sola vista

*para identificar rápidamente cuántos alumnos tienen pagos al día vs\. en mora\.*

- Dentro del detalle de un viaje hay una sección de 'Pagos'\.
- Muestra un resumen por alumno: cuotas pagas / total, monto abonado, saldo pendiente, días de mora\.
- Se puede ordenar por: mora, saldo pendiente, nombre\.

### __Alertas__

- Alerta interna en el portal al día siguiente de un vencimiento impago\.
- Email a admins JUK \(info@jovenesenuk\.com\) si la mora supera 7 días\.

### __B2 — Último pago presencial__

Para alumnos de viajes con Representante Independiente o Instituto, el último pago se realiza presencialmente en JUK\. Para alumnos de Colegio cliente o JUK directo, este paso es N/A automáticamente\. B2 no es un pago adicional: es la confirmación de que la última cuota de B1 fue recibida presencialmente por JUK\.

__Relación B1 / B2__

- B2 es una vista especializada sobre la ÚLTIMA CUOTA de B1\. No existe un registro de pago duplicado\.
- Al confirmar B2, se actualiza automáticamente el canal de la última cuota de B1 a 'Presencial JUK' con la fecha de pago\.
- B2 se marca Completado cuando la última cuota de B1 está marcada como pagada con canal 'Presencial JUK'\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-35__

*Como administrador JUK,*

quiero confirmar que el último pago presencial fue recibido por JUK para los alumnos de Representante Independiente e Instituto

*para cerrar el ciclo de pagos con el canal correcto para estos alumnos\.*

- El paso aparece activo sólo para alumnos de viajes con tipo de representante 'Independiente' o 'Instituto'\.
- Para viajes con tipo 'Colegio cliente' \(flujo 'Vía agencia' sin excepción presencial\), el paso es N/A automáticamente\.
- Para viajes con tipo 'JUK \(directo\)', el paso es N/A automáticamente\.
- Al confirmar la recepción presencial, se actualiza la última cuota de B1 con el canal 'Presencial JUK' y la fecha de pago\.
- B2 se marca Completado cuando la última cuota de B1 está marcada como pagada con canal 'Presencial JUK'\.
- No hay doble contabilización: el monto registrado aquí es el mismo que figura en B1\.

### __Alertas__

- Alerta si el viaje está a menos de 14 días y B2 sigue Pendiente para alumnos que lo requieren\.

## __6\.6 Grupo C — Documentación de viaje__

El Grupo C cubre la documentación emitida por el colegio destino o tramitada ante organismos externos\. C2 \(Immigration Letter\) tiene dependencia formal con B1\.

### __C1 — ETA__

Documentación para entrar a UK\. El alumno lo tramita vía app con escaneo de pasaporte\. Se recomienda hacerlo antes del primer pago \(no es una dependencia bloqueante, pero el ETA rechazado puede afectar todo el proceso\)\. JUK tiene un instructivo propio\.

__Regla de negocio — ETA y documentación de entrada por país destino__

- ETA: aplica ÚNICAMENTE a viajes con destino Reino Unido\. Si el ETA es rechazado, se debe gestionar la VISA de turista de UK como alternativa\.
- USA y Canadá: requieren VISA obligatoria para argentinos\. El ETA no aplica — el paso C1 se marca N/A automáticamente para estos destinos y se activa un paso específico de gestión de VISA \(v2\)\.
- Irlanda: los ciudadanos argentinos no requieren ETA ni VISA para estadías de corta duración\. El paso C1 se marca N/A automáticamente para Irlanda\.
- En v1, el campo 'país destino' del viaje determina si C1 \(ETA\) está activo o N/A\. Los destinos que requieren VISA obligatoria quedan documentados como nota; el flujo de gestión de VISA se especificará en una versión futura\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-31__

*Como administrador JUK,*

quiero registrar el estado del ETA de cada alumno y alertar si está pendiente antes del primer pago

*para evitar que una familia pague cuotas si luego el ETA es rechazado\.*

- El ETA tiene estados: Pendiente / En trámite / Aprobado / Rechazado\.
- Al pasar a Aprobado, el sistema puede solicitar el número de autorización ETA \(campo opcional\)\.
- Si el ETA es rechazado, el paso queda 'Bloqueado' y se genera una alerta crítica\.
- El sistema advierte al equipo si un alumno va a registrar el primer pago y el ETA sigue Pendiente\.

__US\-32__

*Como administrador JUK,*

quiero enviar el instructivo de ETA a la familia del alumno desde el portal

*para agilizar la comunicación sin tener que buscar el instructivo externamente\.*

- El instructivo de ETA de JUK está subido en el portal como recurso descargable\.
- Hay un botón 'Enviar instructivo' que genera un email con el link al instructivo desde info@jovenesenuk\.com\.

### __Alertas__

- Alerta CRÍTICA si el ETA fue rechazado\.
- Alerta si se va a registrar el primer pago y el ETA sigue en Pendiente\.

### __C2 — Immigration Letter__

El colegio destino envía a JUK un documento Word por alumno\. JUK verifica datos críticos antes de enviarlo al alumno\. Este paso sólo se habilita una vez que B1 \(Plan de cuotas\) está Completado\.

### __Verificaciones obligatorias__

- __Número de pasaporte: __Debe coincidir exactamente con el del sistema\.
- __Nombre completo: __Debe coincidir con el nombre del pasaporte \(tal como figura en el sistema\)\.
- __Fecha de nacimiento: __Debe coincidir con el registro del alumno\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-25__

*Como administrador JUK,*

quiero cargar la Immigration Letter y verificar sus datos contra el pasaporte del alumno antes de enviársela

*para detectar errores del colegio antes de que el alumno reciba el documento\.*

- Este paso sólo está disponible una vez que B1 \(Plan de cuotas\) está Completado\.
- Se puede cargar el archivo Word de la Immigration Letter\.
- El sistema muestra los datos clave del alumno junto al archivo para verificación manual\.
- Si se detecta un error, el paso se marca 'Bloqueado' con una nota de observación\.
- Al confirmar que los datos son correctos, el paso pasa a Completado\.

### __Alertas__

- Alerta si todos los pagos del alumno están completados pero la Immigration Letter lleva más de 15 días sin tramitarse\.
- Alerta si el viaje está a menos de 45 días y algún alumno no tiene Immigration Letter\.

### __C3 — Accommodation Letter__

El colegio informa al alumno los datos de su alojamiento\. Las familias validan que sus preferencias del Application Form estén reflejadas correctamente\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-30__

*Como administrador JUK,*

quiero registrar que un alumno recibió y validó su Accommodation Letter

*para confirmar que no hay discrepancias entre lo solicitado y lo asignado\.*

- Se puede cargar el archivo de la Accommodation Letter\.
- Se registra si la familia validó la información \(Sí / No / Con observaciones\)\.
- Si hay observaciones, el paso queda 'Bloqueado' hasta resolver con el colegio\.

### __Alertas__

- Alerta si el viaje está a menos de 3 meses y algún alumno no tiene Accommodation Letter confirmada\.

## __6\.7 Grupo D — Documentación legal argentina__

El Grupo D cubre la documentación legal requerida en Argentina antes del viaje\. Los pasos D1 y D2 son paralelos entre sí\.

### __D1 — Autorización de viaje \(escribano\)__

Los padres deben realizar la autorización de viaje ante escribano para menores de edad \(< 18 años al inicio del viaje\)\. El documento se lleva el día del viaje\. Si el alumno es mayor de 18, D1 es N/A automáticamente\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-33__

*Como administrador JUK,*

quiero enviar recordatorios automáticos a las familias para que tramiten la autorización ante escribano

*para evitar que lleguen al aeropuerto sin este documento crítico\.*

- El sistema envía recordatorios automáticos a los 90, 60 y 30 días antes del viaje desde info@jovenesenuk\.com\.
- Se registra cuando la familia confirma que ya lo tramitó\.
- Si el alumno es mayor de 18 años al inicio del viaje, el paso se marca automáticamente como N/A\.

### __Alertas__

- Alerta si el viaje está a menos de 30 días y la familia no confirmó la autorización\.
- Alerta CRÍTICA si el viaje está a menos de 7 días y el paso sigue Pendiente\.

### __D2 — Certificado de aptitud psicofísica__

Aplica a viajes de tipo GRUPAL con adulto acompañante \(group leader\)\. El certificado acredita aptitud física y psicológica del alumno\. Para viajes de tipo Individual \(sin GL\), D2 es N/A automáticamente\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-34__

*Como administrador JUK,*

quiero gestionar el certificado psicofísico de los alumnos de viajes grupales con adulto acompañante

*para garantizar que todos los alumnos de viajes grupales presentan la aptitud requerida antes de viajar\.*

- Si el viaje es de tipo Individual \(sin GL\) → D2 = N/A automáticamente al activar el tablero\.
- Si el viaje es de tipo Grupal con al menos un GL asignado → D2 queda Pendiente hasta que se cargue el certificado de cada alumno\.
- Se puede cargar el PDF o foto del certificado médico\.
- La verificación del contenido \(aptitud física Y psicológica\) es manual por JUK; el sistema no valida el texto del documento\.

### __Alertas__

- Para alumnos que requieren certificado: alerta si está pendiente y el viaje está a menos de 3 meses\.

## __6\.8 Roadmap v2 — Pasos configurables dinámicamente__

__Roadmap v2 — Pasos dinámicos por colegio \(Opción C\)__

- La estructura actual \(Paso 0 \+ Grupos A/B/C/D\) cubre todos los documentos existentes con lógica configurable por colegio \(US\-05b\)\. Es el modelo correcto para v1\.
- En v2, el Administrador JUK podrá definir pasos adicionales o completamente nuevos por colegio destino, más allá de los 5 documentos estándar: nombre del paso, descripción, orden de visualización, dependencias y comportamiento de activación\.
- Este modelo dinámico requiere un diseño de motor de reglas más complejo y queda fuera del alcance de v1 para no arriesgar el timeline\.
- Referencia de diseño v2: tabla 'pasos\_dinamicos\_colegio' con campos: colegio\_id, nombre\_paso, descripcion, orden, bloqueado\_por \(FK a otro paso\), aplica\_si \(expresión condicional\)\.

## __6\.9 Estados de los pasos__

## __6\.10 Preguntas abiertas — Módulo 6__

__Preguntas cerradas — Módulo 6__

- C1 \(ETA\): ¿El número de autorización ETA es requerido u opcional para marcar como Aprobado? → CERRADO \(Felix\): OPCIONAL\. El sistema puede solicitarlo pero no lo bloquea\.
- A1 \(Application Form\): ¿La fecha límite se configura por alumno o se hereda del viaje? → CERRADO \(Felix\): se hereda del viaje como valor por defecto y puede sobreescribirse por alumno\.
- ¿Cómo se identifica si el alumno pertenece a un colegio cliente? → CERRADO: se deduce del tipo de representante del viaje asignado, asociado al link de Application Form JUK enviado al grupo\.
- ¿Los grupos B, C, D son paralelos entre sí? → CERRADO: sí\. Sólo C2 \(Immigration Letter\) tiene dependencia formal con B1 \(Plan de cuotas Completado\)\.

__Preguntas cerradas — Módulo 6 \(adicionales\)__

¿El tablero de seguimiento del alumno \(Paso 0 \+ Grupos A/B/C/D\) será visible para las familias? → CERRADO: sí\. El Portal de Familias v1\.7 \(Módulo 1\) implementa la vista de trámites con la estructura A/B/C/D, incluyendo identificador de paso, nombre y estado\.

__❓ Preguntas abiertas — Módulo 6__

¿Los recordatorios automáticos deben salir desde info@jovenesenuk\.com o noreply@jovenesenuk\.com? Pendiente definición técnica\.

# __Módulo 7 — Gestión de Viajes: Seguimiento__

## __7\.1 Objetivo del módulo__

Gestionar los 5 trámites que se coordinan a nivel de viaje \(no por alumno individual\)\. Estos pasos son responsabilidad del equipo JUK y/o del representante del viaje\. Incluye la coordinación de pasajes, excursiones, transfers, tarjetas de transporte y los police checks de los group leaders\.

## __7\.2 Paso 1 — Pasajes__

Para viajes Grupales: JUK coordina los pasajes con la agencia de viajes \(cantidad de alumnos, fechas, presupuesto, emisión de e\-tickets\)\. Para viajes Individuales: el alumno gestiona sus propios pasajes — JUK sólo registra los datos del vuelo que el alumno comunica\.

__Comportamiento según tipo de viaje — Paso 1__

- Viaje Grupal: JUK coordina y emite los pasajes\. Flujo completo: Pendiente cotización → Cotizado → Confirmado → Emitido\.
- Viaje Individual: el alumno compra sus pasajes de forma autónoma\. JUK registra los datos del vuelo \(número, aerolínea, horarios\) cuando el alumno los comunica\. Los sub\-estados de coordinación grupal \(cotización, emisión\) no aplican\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-37__

*Como administrador JUK,*

quiero registrar el estado de la gestión de pasajes y cargar los datos del vuelo confirmado

*para centralizar los datos del vuelo para coordinar transfers y comunicar a las familias\.*

- Para viajes Grupales: el paso tiene estados: Pendiente cotización / Cotizado / Confirmado / Emitido\.
- Para viajes Individuales: el paso tiene estados simplificados: Pendiente datos / Datos recibidos\. No hay cotización ni emisión por parte de JUK\.
- En ambos tipos: se puede registrar número de vuelo, aerolínea, aeropuerto de salida, hora de salida, hora de llegada estimada\.
- Al registrar el vuelo \(Grupal: Confirmado; Individual: Datos recibidos\), el sistema puede notificar al alumno/familia con los datos desde info@jovenesenuk\.com\.
- Para viajes Grupales: se puede cargar el archivo de los e\-tickets\.

### __Alertas__

- Alerta si el viaje está a menos de 60 días y los pasajes siguen en Pendiente cotización\.
- Alerta si el viaje está a menos de 30 días y los pasajes no están Emitidos\.

## __7\.3 Paso 2 — Excursiones__

El representante aprueba las actividades del viaje desde su portal diferenciado\. JUK carga las propuestas\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-38__

*Como administrador JUK,*

quiero registrar las excursiones propuestas y su estado de aprobación por el representante

*para tener documentada la agenda de actividades del viaje aprobada antes de confirmarse\.*

- Se puede crear una lista de excursiones con: nombre, fecha, proveedor, costo estimado\.
- Cada excursión tiene un estado: Propuesta / Aprobada por representante / Confirmada / Cancelada\.
- El representante puede aprobar o rechazar excursiones desde su vista del viaje \(portal diferenciado\)\. Un admin JUK también puede aprobar excursiones en nombre del representante cuando éste envía aprobación por email\.
- Al confirmar todas las excursiones, el paso se marca como Completado\.

## __7\.4 Paso 3 — Transfers__

JUK contrata los transfers aeropuerto ↔ casas de familia a través del colegio destino\. Depende del horario del vuelo\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-39__

*Como administrador JUK,*

quiero registrar y asignar los transfers de llegada una vez confirmado el vuelo

*para asegurar que cada alumno tenga transporte desde el aeropuerto a su alojamiento\.*

- Este paso sólo está disponible una vez que el Paso 1 \(Pasajes\) está al menos en estado Confirmado\.
- Se puede registrar: proveedor de transfer \(el colegio\), horarios y costo por alumno\.
- Se puede asignar un transfer a cada alumno según su alojamiento\.
- El paso queda Completado cuando todos los alumnos activos tienen transfer asignado\.
- Si un alumno es dado de baja, su transfer se libera y genera una alerta para revisión\.

### __Regla de negocio__

- __Dependencia con Paso 1: __El Paso 3 \(Transfers\) no puede iniciarse hasta que el Paso 1 \(Pasajes\) esté al menos en Confirmado\. Se necesita la hora de llegada del vuelo para coordinar los transfers\.

## __7\.5 Paso 4 — Tarjeta de transporte público__

JUK gestiona y distribuye las tarjetas de transporte público \(ej: Oyster Card en UK\) a través del colegio destino\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-40__

*Como administrador JUK,*

quiero registrar la gestión y distribución de las tarjetas de transporte para cada viaje

*para tener controlado que todos los alumnos cuenten con su tarjeta antes de salir\.*

- Se registra: tipo de tarjeta, cantidad solicitada, costo y proveedor \(el colegio\)\.
- Se puede marcar por alumno si recibió su tarjeta\.
- El paso se marca Completado cuando todos los alumnos activos tienen tarjeta asignada\.
- Se puede cargar el comprobante de compra de las tarjetas\.

## __7\.6 Paso 5 — Police checks de group leaders__

Los group leaders que acompañan a menores de 18 años deben tener police checks vigentes\. El colegio destino los requiere para garantizar la seguridad de los alumnos\. Este paso se gestiona a nivel de viaje, sobre los group leaders asignados — no sobre los alumnos individuales\. Para viajes de tipo Individual \(sin GL\), este paso se marca automáticamente como N/A al crear el viaje\. Los police checks se tramitan en argentina\.gob\.ar\.

__Nota de alcance correcto__

Este paso fue incorrectamente incluido en el módulo de seguimiento de estudiantes en la versión anterior del PRD\. Se corrige aquí: los police checks son un trámite de los GROUP LEADERS \(no de los alumnos\) y por lo tanto pertenecen al seguimiento del viaje\.

__ID__

__User Story__

__Criterios de Aceptación__

__US\-41__

*Como administrador JUK,*

quiero registrar el estado del police check de cada group leader asignado a un viaje

*para garantizar que ningún GL viaje sin cumplir el requisito del colegio\.*

- Para viajes Individuales: el paso se marca automáticamente N/A al crear el viaje \(no hay GL\)\. No requiere acción del admin\.
- Para viajes Grupales: este paso es por GL, no por alumno\. Se gestiona en el tablero del viaje\.
- Se registra el estado por cada GL: Pendiente / En trámite / Aprobado / Vencido\.
- Se puede cargar el documento del police check aprobado\.
- Se registra la fecha de emisión y la fecha de vencimiento del certificado\.
- El paso del viaje se marca Completado cuando todos los GLs del viaje tienen police check Aprobado vigente\.

### __Alertas__

- Alerta si un GL tiene el police check vencido o próximo a vencer \(menos de 30 días de vigencia\)\.
- Alerta si el viaje está a menos de 30 días y algún GL no tiene el police check Aprobado\. El plazo mínimo recomendado es contar con el police check aprobado 30 días antes de la fecha de inicio del viaje\.

## __7\.7 Estados de los pasos del viaje__

__Pendiente__

No iniciado\.

__En progreso__

Acción en curso\.

__Completado__

Trámite finalizado\.

__Bloqueado__

Problema que impide avanzar\.

## __7\.8 Preguntas abiertas — Módulo 7__

__Preguntas cerradas — Módulo 7__

- ¿El representante aprueba excursiones sólo desde su portal diferenciado, o también puede hacerlo un admin JUK en su nombre? → CERRADO \(María\): un admin JUK puede aprobar excursiones en nombre del representante cuando éste comunica su aprobación por email\. Esto debe quedar registrado en el portal con una nota\.
- ¿Los police checks tienen un formato/entidad específica que los emite? → CERRADO \(María\): los police checks se tramitan en argentina\.gob\.ar\. No hay un formato específico adicional\.
- ¿Hay un plazo mínimo de anticipación para tener los police checks aprobados? → CERRADO \(María\): el plazo mínimo es 30 días antes de la fecha de inicio del viaje\.

# __Apéndice — Resumen de Preguntas Abiertas__

Este apéndice consolida las preguntas que aún no tienen respuesta definitiva al cierre de v1\.13\. Las preguntas que Felix y María respondieron en sus respectivas revisiones fueron incorporadas como reglas de negocio en el cuerpo del documento y en las secciones de 'Preguntas cerradas' de cada módulo\.

__Módulo__

__Área__

__Pregunta abierta__

__M4__

Multi\-destino

¿Puede un viaje tener dos colegios destino \(ej: una semana en dos ciudades\)? ¿Se contempla en futuras versiones?

__M6__

Email sistema

¿Los recordatorios automáticos deben salir desde info@jovenesenuk\.com o noreply@jovenesenuk\.com? Pendiente decisión técnica del equipo\.

__M6/C1__

ETA destinos con VISA

En v1 el paso C1 se marca N/A para USA, Canadá e Irlanda\. ¿Se incorpora un paso específico de gestión de VISA para USA/Canadá en v2 o se documenta en PRD separado?

## __Cambios incorporados en v1\.1__

__Resumen de cambios v1\.0 → v1\.1__

- NUEVO: Módulo 2 — Dashboard \(pantalla principal post\-login con alertas, viajes próximos y métricas\)\.
- CORREGIDO: Ciclo de estados del viaje: se agrega 'Inscripción abierta' entre Borrador y Confirmado\.
- MOVIDO: Police Checks de líderes: del Módulo de Estudiantes al Módulo de Viajes \(Paso 5 del M7\)\.
- CORREGIDO: Regla de validación de pasaporte para UK: fecha vencimiento ≥ fecha fin del viaje\. UK no exige 6 meses adicionales\.
- NUEVO: Nota explícita de fuera de alcance para Vista del Representante y Portal de Familias\.
- CORREGIDO: Relación Paso 2 / Paso 10: el Paso 10 es una etiqueta en la última cuota del Paso 2, no un pago separado\.
- INCORPORADO: Respuestas de Felix Mir ronda 1 convertidas en reglas de negocio\.
- NUEVO: Distinción explícita entre Colegio destino y Colegio cliente\.
- ACTUALIZADO: Lógica de recordatorios del Paso 1: 14/7/3/1 días antes de la fecha límite\.

## __Cambios incorporados en v1\.2__

__Resumen de cambios v1\.1 → v1\.2 \(correcciones Felix ronda 2\)__

- ELIMINADO: Estado 'Borrador' del ciclo de vida del viaje\. Los viajes se crean directamente en 'Inscripción abierta'\.
- NUEVO: 'Confirmado' ahora es AUTOMÁTICO cuando el viaje alcanza 5 alumnos inscriptos \(ya no es acción manual exclusiva\)\.
- CORREGIDO: Se pueden agregar y quitar alumnos tanto en 'Inscripción abierta' como en 'Confirmado' \(antes sólo en 'Inscripción abierta'\)\.
- NUEVO: Campo 'Tipo de representante' en ABM de Viajes: Representante Independiente / Instituto / Colegio cliente\.
- CORREGIDO: Flujo de pago — 'Vía agencia' aplica a Representante Independiente E Instituto\. 'Directo JUK' aplica sólo a Colegio cliente\.
- CORREGIDO: Paso 10 \(último pago presencial\) aplica a Representante Independiente e Instituto\. Es N/A automático para Colegio cliente\.
- ELIMINADO: Sección 'Datos de facturación' del perfil del alumno \(no requerida per Felix\)\.
- ELIMINADO: Módulo de 'Colegio cliente' como entidad independiente\. Tratado como tipo de representante\.
- SIMPLIFICADO: Módulo 3 ahora cubre sólo Colegios Destino\. Se elimina sección 3\.2b y US\-07\.
- NUEVO: Tabla de clasificación de tipos de representante en el Resumen Ejecutivo\.
- NUEVO: Sección 'Viajes del próximo año \(>6 meses\)' en el Dashboard con indicador de mínimo 5 alumnos\.
- NUEVO: US\-DX\-05 — visualización de viajes futuros con alerta si tienen menos de 5 alumnos\.
- NUEVO: Regla de negocio 'Resumen semanal' — envío automático a maria@jovenesenuk\.com\.
- ACLARADO: Fecha límite del Application Form se hereda del viaje \(configurable por alumno\)\.
- ACLARADO: Número de ETA es opcional para marcar el paso como Aprobado\.
- ACLARADO: La agencia de excursiones NO cobra comisión de JUK; su costo va al precio del programa\.
- NUEVO \(US\-19b\): User story para generación y envío de credenciales del Portal de Familias desde el portal interno al confirmar la inscripción de un alumno\. Incorporado a partir de la integración con el PRD del Portal de Familias\.

## __Cambios incorporados en v1\.3__

__Resumen de cambios v1\.2 → v1\.3 \(correcciones Felix ronda 2 — segunda parte\)__

- CORREGIDO \(M6\): Eliminada la referencia a estado 'Borrador' en la regla de activación del tablero de seguimiento del alumno\. Se reemplazó por 'Inscripción abierta, Confirmado o cualquier otro estado', consistente con la eliminación del Borrador en v1\.2\.
- CORREGIDO \(M5 / US\-19b\): La lógica de credenciales del Portal de Familias fue revisada\. Las credenciales se generan al CREAR el alumno \(no al asignarlo al viaje\)\. El ENVÍO es una acción separada y manual del admin JUK, disponible desde el perfil del alumno con el botón 'Enviar acceso al Portal de Familias'\.
- NUEVO \(M2 / US\-DX\-06\): User story y regla de negocio para visualización de NPS en el Dashboard\. NPS post\-viaje en tres dimensiones \(JUK general, Representante, Colegio UK\)\. Vista de sólo lectura\. NPS acumulado por representante visible en su perfil\.
- NUEVO \(M1 / Regla de negocio\): Activación de credenciales del Representante — se activan en el momento de ser asignado al viaje, independientemente del estado del viaje\. No existe ventana de días previos\.

## __Cambios incorporados en v1\.4__

__Resumen de cambios v1\.3 → v1\.4 — soporte a alumnos individuales__

- NUEVO \(M4\): Campo tipo\_viaje \(ENUM: Grupal | Individual\) requerido en el formulario de creación de viaje\. Condiciona campos \(GL, capacidad\) y ciclo de vida\.
- NUEVO \(M4 / US\-10b\): User story para creación de viaje Individual\. Sin GL, capacidad fija 1, estado inicial Confirmado, Paso 5 del viaje N/A automático\.
- NUEVO \(M4\): Opción 'JUK \(directo\)' en el dropdown de tipo de representante\. Fija flujo Directo JUK, comisión agencia = N/A, sin credenciales de portal para representante externo\. Aplica a viajes Individuales y Grupales\.
- CORREGIDO \(M4\): Ciclo de vida diferenciado: viajes Grupales nacen en 'Inscripción abierta'; viajes Individuales nacen directamente en 'Confirmado'\.
- CORREGIDO \(M4 / US\-12\): Listado de viajes muestra badge 'Individual'\. Filtro por tipo\_viaje agregado\.
- ACTUALIZADO \(M7 / Paso 1\): Comportamiento diferenciado para pasajes: Grupal = coordinación y emisión JUK; Individual = registro de datos del vuelo aportados por el alumno\.
- ACTUALIZADO \(M7 / Paso 5\): Police checks = N/A automático para viajes Individuales \(sin GL\)\.
- NUEVO \(M6 / Regla de negocio\): N/A automático por edad adulta: si el alumno tiene 18\+ años al inicio del viaje → Paso 5 \(Parental Consent\) y Paso 8 \(Autorización escribano\) = N/A\. Aplica a viajes Individuales y Grupales\.
- ACTUALIZADO \(M2 / US\-DX\-05\): La sección 'Viajes del próximo año' excluye viajes Individuales\. El indicador de riesgo \(<5 alumnos\) no aplica a viajes Individuales\.

## __Cambios incorporados en v1\.13__

__Resumen de cambios v1\.12 → v1\.13 — revisión Delfina v1\.6 \(comentarios 1 y 2\)__

- ACTUALIZADO \(M2 / Dashboard — Panel de alertas críticas\): Se precisó la descripción del panel incorporando los casos exactos: ETAs rechazados o con primer pago registrado y ETA aún Pendiente, pasaportes vencidos o que vencen dentro de los 6 meses posteriores al inicio del viaje, alumnos con mora >7 días, documentos faltantes con viaje a menos de 3 meses\. \(Delfina: comentario 1\)\.
- ACTUALIZADO \(M2 / US\-DX\-05 — Viajes del próximo año\): Se agrega criterio de aceptación para el caso en que un viaje Grupal alcanzó o está próximo a su capacidad máxima — se señaliza con indicador visual diferenciado \(ej: azul\)\. Complementa el indicador naranja de mínimo no alcanzado\. \(Delfina: comentario 2\)\.
- ACTUALIZADO \(M2 / Dashboard — tabla secciones\): La descripción del panel 'Viajes del próximo año \(>6 meses\)' se actualizó para reflejar ambos indicadores visuales\.
- NUEVO \(M3 / Roadmap v2 — contratos con colegios destino\): Se documenta como backlog v2 el pedido de Delfina: contrato de representación \(archivo \+ fecha de vigencia\), alerta de vencimiento de contrato y campo de vacantes pedidas al colegio destino\. Fuera del alcance de v1\. \(Delfina: comentarios 3 y 4, diferidos a v2\)\.
- SIN CAMBIOS DE LÓGICA en user stories existentes\.

## __Cambios incorporados en v1\.12__

__Resumen de cambios v1\.11 → v1\.12 — umbrales de alerta C3 y D2 a 3 meses__

- ACTUALIZADO \(M6 / C3 — Accommodation Letter\): Umbral de alerta actualizado de 21 días a 3 meses, alineado con el principio operativo de JUK de tener todos los trámites resueltos 3 meses antes del viaje\.
- ACTUALIZADO \(M6 / D2 — Certificado psicofísico\): Ídem — umbral de alerta actualizado de 21 días a 3 meses\.
- SIN CAMBIOS DE LÓGICA ni de user stories\.

## __Cambios incorporados en v1\.11__

__Resumen de cambios v1\.10 → v1\.11 — cierre preguntas Portal de Familias__

- CERRADO \(M5 / Preguntas cerradas\): '¿El acceso de familias al estado del alumno está en scope de este PRD o de un portal separado?' → Sí, se implementa en el Portal de Familias \(PRD separado, actualmente en v1\.7\)\. El Portal Interno no duplica esa funcionalidad\.
- CERRADO \(M6 / Preguntas cerradas\): '¿El tablero de seguimiento del alumno será visible para las familias?' → Sí\. El Portal de Familias v1\.7 \(Módulo 1\) implementa la vista de trámites con la estructura A/B/C/D, incluyendo identificador de paso, nombre y estado\.
- ACTUALIZADO \(Apéndice\): Se eliminaron las dos entradas M5 y M6 sobre Portal de Familias — ya estaban resueltas e implementadas en Portal Familias v1\.7\.
- SIN CAMBIOS DE LÓGICA ni de user stories\.

## __Cambios incorporados en v1\.10__

__Resumen de cambios v1\.9 → v1\.10 — correcciones Felix \(revisión v1\.3\)__

- CERRADO \(M1 / Preguntas abiertas\): Super\-admin en v1 = María \(CEO\)\. Google Workspace SSO descartado por falta de utilidad en la operación actual\.
- ACTUALIZADO \(M1 / Regla de negocio\): Regla 'Usuarios administradores' ahora especifica que el usuario con permisos de super\-admin en v1 es María \(CEO\)\.
- NUEVO \(M2 / Dashboard — Calendario visual\): Se agrega sección 'Calendario visual de viajes' al Dashboard\. Felix confirmó que es necesario para visualizar la distribución de viajes de forma rápida\.
- NUEVO \(M2 / Dashboard — Métricas históricas\): Se agrega sección de métricas históricas comparativas por año \(alumnos, viajes, NPS\)\. Base para análisis y proyecciones\.
- ACTUALIZADO \(M2 / Regla de negocio — Resumen semanal\): El resumen semanal automático ahora va a los 4 admins JUK \(no sólo a María\)\.
- CERRADO \(M2 / Preguntas abiertas\): Las 3 preguntas de M2 cerradas con respuestas de Felix \(calendario: sí; métricas históricas: sí; resumen semanal a todos: sí\)\.
- CERRADO \(M3 / Pregunta abierta — precios\): Felix confirma que los precios no se incluyen en v1\. El presupuesto del viaje se hace aparte\. Las comisiones son sólo referencia interna\.
- NUEVO \(M4 / Regla de negocio — Representante vs\. GL físico\): Se documenta la distinción entre el representante registrado en el sistema y el group leader que acompaña físicamente al grupo\. Hasta ahora siempre coincidieron, pero la arquitectura debe soportar que difieran\.
- NUEVO \(M6 / C1 — ETA / Callout por país\): ETA aplica sólo a UK\. Rechazo → gestionar VISA de turista UK\. USA y Canadá requieren VISA obligatoria \(C1 = N/A, flujo VISA en v2\)\. Irlanda no requiere nada para argentinos \(C1 = N/A\)\.
- ACTUALIZADO \(Apéndice\): Se eliminaron preguntas ya cerradas \(M1 Google Workspace, M1 Super\-admin, M4 Presupuesto/precio\)\. Se agrega nueva pregunta abierta sobre gestión de VISA en USA/Canadá para v2\.

## __Cambios incorporados en v1\.9__

__Resumen de cambios v1\.8 → v1\.9 — ENUM rol Admin\_JUK → Admin, reserva SuperAdmin v2__

- ACTUALIZADO \(Intro / Roles del sistema\): La tabla de roles refleja el renombre del ENUM: 'Admin\_JUK' → 'Admin'\. Se agrega fila 'SuperAdmin \(ENUM: SuperAdmin\)' como rol reservado para v2 — no se asigna en v1\.
- NUEVO \(Intro / Nota de arquitectura — ENUM de rol\): Callout que documenta la motivación del cambio: preparar arquitectura multi\-tenant para v2, donde el sistema podrá ser operado por organizaciones externas\. En v1, todos los Admin son el equipo JUK\.
- ACTUALIZADO \(M4 / US\-05 criterios\): La referencia técnica al rol en el criterio de visibilidad del campo 'Comisión de agencia' cambió de 'rol administrador JUK' a 'rol Admin'\.
- SIN CAMBIOS DE LÓGICA: Las user stories, criterios de aceptación y flujos no se modificaron\. El lenguaje organizacional \('equipo JUK', 'administrador JUK', 'el admin'\) se mantiene tal cual\.

## __Cambios incorporados en v1\.8__

__Resumen de cambios v1\.7 → v1\.8 — restructura Módulo 6 \(Paso 0 \+ Grupos A/B/C/D\)__

- RESTRUCTURADO \(M6\): Se reemplazó la estructura de 10 pasos lineales por Paso 0 \(referencia de origen\) \+ cuatro grupos temáticos: A \(Inscripción y programa\), B \(Pagos\), C \(Documentación de viaje\), D \(Documentación legal argentina\)\. Los grupos son mayormente paralelos entre sí — sólo C2 \(Immigration Letter\) tiene dependencia formal con B1 \(Plan de cuotas Completado\)\.
- NUEVO \(M6 / Paso 0 — Application Form JUK / US\-00\): Se incorpora el Application Form JUK como Paso 0, punto de entrada de sólo lectura\. Si el alumno ingresó vía Google Form → Completado automático con timestamp del envío\. Si fue dado de alta manualmente → 'Alta manual' con fecha y usuario responsable\.
- RENOMBRADO \(M6\): Los pasos anteriores se renombraron con nomenclatura de grupo: A1 \(ex Paso 1 — AF colegio\), A2 \(ex Paso 4 — Test de Nivel\), A3 \(ex Paso 5 — Parental Consent\), B1 \(ex Paso 2 — Pagos\), B2 \(ex Paso 10 — último pago presencial\), C1 \(ex Paso 7 — ETA\), C2 \(ex Paso 3 — Immigration Letter\), C3 \(ex Paso 6 — Accommodation Letter\), D1 \(ex Paso 8 — Autorización escribano\), D2 \(ex Paso 9 — Certificado psicofísico\)\.
- CORREGIDO \(M6 / B2 — Último pago presencial / US\-35\): Se eliminó toda referencia a la 'comisión del 6%' del paso B2\. El criterio del paso se reformuló en términos de canal de pago \(presencial vs\. vía agencia\), que es lo relevante para la operación\. La racionalidad comercial \(evitar la comisión\) queda fuera del PRD\.
- ACTUALIZADO \(M6 / Sección 6\.9\): La tabla de estados incorpora el estado 'Vencido' \(aplica a A1 — Application Form del colegio cuando se supera la fecha límite sin completar\)\.
- CERRADO \(M6 / Pregunta abierta — grupos paralelos\): B, C, D son paralelos entre sí\. Sólo C2 requiere B1 Completado\.
- ACTUALIZADO \(M4 / Reglas de negocio\): Referencias a 'Paso 10' y 'Los 10 pasos del Módulo 6' actualizadas con la nueva nomenclatura\.
- ACTUALIZADO \(Apéndice / Tabla de preguntas abiertas\): Entrada M6/Portal familias actualizada con la nueva estructura del tablero y coordinación pendiente con agente 3\.
- ROADMAP v2 documentado \(M6 / Sección 6\.8\): En v2 se podrán definir pasos dinámicos adicionales por colegio destino, más allá de los grupos estándar\.

## __Cambios incorporados en v1\.7__

__Resumen de cambios v1\.6 → v1\.7 — configuración de documentos por colegio destino__

- NUEVO \(M3 / Sección 3\.2\): Se agregó subsección 'Configuración de requisitos documentales por colegio'\. Los 5 documentos estándar \(Application Form, Test de Nivel, Parental Consent, Confirmation Letter, VISA/Immigration Letter\) ahora son configurables por colegio con tres estados: Requerido / Opcional / N/A\.
- NUEVO \(M3 / US\-05b\): User story para configurar los documentos del programa al crear o editar un colegio destino\. La configuración activa automáticamente los pasos correspondientes en el tablero de seguimiento del alumno \(Módulo 6\) al asignarlo a un viaje\.
- ACTUALIZADO \(M3 / Campos\): Las descripciones de los campos de documentos en el formulario del colegio ya no referencian reglas hardcodeadas — apuntan a la configuración de documentos\.
- ACTUALIZADO \(M6 / Paso 4 — Test de Nivel\): La regla de activación ahora referencia la configuración del colegio \(US\-05b\) en lugar de la excepción hardcodeada 'solo Wimbledon'\.
- ACTUALIZADO \(M6 / Paso 5 — Parental Consent\): Ídem\. La activación combina dos reglas: configuración del colegio \+ edad del alumno \(≥18 = N/A independientemente del colegio\)\.
- NOTA DE ARQUITECTURA \(M3\): Se agregó callout para el equipo de desarrollo indicando que la tabla de configuración documental debe diseñarse como entidad independiente \(colegio\_documento\_config\) para facilitar la extensión a documentos personalizados en v2 sin cambios de esquema\.
- ROADMAP v2 documentado: en v2 se agregará botón '\+ Agregar documento' en el colegio destino para definir documentos personalizados que generarán pasos adicionales en el tablero del alumno\.

## __Cambios incorporados en v1\.6__

__Resumen de cambios v1\.5 → v1\.6 — corrección puntual US\-35__

CORREGIDO \(M6 / US\-35 / Paso 10\): En los criterios de aceptación de US\-35, el parentético que describe el flujo de Colegio cliente decía incorrectamente '\(flujo Directo JUK\)'\. Colegio cliente usa el flujo 'Vía agencia sin excepción presencial' — 'Directo JUK' es exclusivo del tipo de representante 'JUK \(directo\)'\. Texto corregido: 'Para viajes con tipo Colegio cliente \(flujo Vía agencia sin excepción presencial\), el paso es N/A automáticamente\.' La lógica del paso \(N/A para Colegio cliente\) era correcta; sólo se corrigió el nombre del flujo\.

## __Cambios incorporados en v1\.5 \(correcciones María — CEO\)__

__Resumen de cambios v1\.4 → v1\.5 — correcciones María \(CEO\)__

- ACTUALIZADO \(Portada / Resumen ejecutivo\): Quinta revisión\. El resumen ejecutivo menciona explícitamente alumnos individuales como parte de la operación\.
- CORREGIDO \(M2 / Regla alerta pasaporte\): El umbral de alerta conservadora de pasaporte cambió de '30 días después del fin del viaje' a '6 meses después de la fecha de inicio del viaje'\. Se alinea con los criterios reales de verificación de JUK\.
- NUEVO \(M3 / Campos colegio destino\): Se agregaron campos para Confirmation Letter \(template/instructivo que el colegio envía al confirmar inscripción\) y VISA/Immigration Letter \(instrucciones del colegio para gestión del visado/ETA\)\. Los campos de Parental Consent y Año vigente se marcaron como opcionales, explicitando que aplican sólo a Wimbledon School of English\.
- NUEVO \(M3 / Callout\): Aclaración de que la Immigration Letter por alumno individual \(con datos de pasaporte\) se gestiona en el Módulo 6 \(Paso 3\)\. En el Módulo 3 sólo se almacena el template o instrucciones generales\.
- CORREGIDO \(M4 / Tabla representantes\): El flujo de pago de 'Colegio cliente' se cambió de 'Directo JUK' a 'Vía agencia sin excepción presencial'\. TODOS los pagos de Colegio cliente — incluido el último — van a través de la agencia externa \(sin pago presencial con JUK\)\. Paso 10 = N/A automático\.
- CORREGIDO \(M4 / Campo flujo de pago\): El campo 'Flujo de pago' fue actualizado para reflejar correctamente la distinción: Independiente/Instituto → vía agencia con excepción presencial en Paso 10; Colegio cliente → vía agencia sin excepción presencial \(Paso 10 = N/A\); JUK directo → directo JUK\.
- CORREGIDO \(M4 / Regla de negocio\): Regla 'Flujo de pago según tipo de representante' actualizada con la distinción clara entre los tres casos\.
- CORREGIDO \(M6 / Paso 2 callout\): El Paso 2 describe correctamente que para Colegio cliente todos los pagos — incluido el último — van a través de la agencia\. No hay pago presencial JUK\.
- CERRADO \(M5 / Pregunta edición familia\): Solo el admin JUK puede editar los datos del alumno\. Si la familia lo editara directamente, no quedaría registro del cambio ni certeza sobre cuál es la versión vigente\.
- ACTUALIZADO \(M6 / Paso 4 — Test de Nivel\): Se aclaró que el test de nivel aplica únicamente a Wimbledon School of English\. Para otros colegios destino, el paso es N/A automático\.
- ACTUALIZADO \(M6 / Paso 5 — Parental Consent\): Se aclaró que el Parental Consent aplica únicamente a Wimbledon School of English\. Para otros colegios destino, el paso es N/A automático \(además de la regla N/A por mayoría de edad\)\.
- CORREGIDO \(M6 / Paso 9 — Certificado psicofísico\): Se cambió el criterio de activación\. Antes: sólo para viajes con colegio cliente que tuvieran el flag activo\. Ahora: aplica a TODOS los viajes Grupales con adulto acompañante \(GL\)\. Para viajes Individuales \(sin GL\), el paso es N/A automático\.
- ACTUALIZADO \(M7 / Paso 5 — Police checks\): Se aclaró que los police checks aplican para los líderes que acompañan a menores de 18 años\. Se incorporó que se tramitan en argentina\.gob\.ar y que el plazo mínimo es 30 días antes del inicio del viaje\.
- CERRADO \(M7 / Preguntas abiertas\): Se cerraron las tres preguntas abiertas del Módulo 7 con las respuestas de María \(excursiones, police checks entidad, plazo police checks\)\.
- ACTUALIZADO \(Apéndice\): Tabla de preguntas abiertas depurada — se eliminaron las preguntas ya respondidas e incorporadas al documento\. Sólo quedan las que permanecen sin respuesta definitiva al cierre de v1\.13\.

