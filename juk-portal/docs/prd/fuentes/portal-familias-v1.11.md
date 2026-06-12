__JUK__

*Study Travel Agency*

__PORTAL DE FAMILIAS__

__Product Requirements Document \(PRD\)__

*Versión 1\.11  |  Mayo 2026*

Preparado por el equipo de Producto JUK

# __Historial de Versiones__

__Versión__

__Fecha__

__Autor__

__Descripción del cambio__

v1\.0

Mayo 2026

Equipo Producto JUK

Versión inicial\. 10 módulos: documentación, resumen de docs, pagos, requisitos de viaje, test de nivel \(fuera de alcance\), itinerario, diario, certificado, NPS y soporte\.

v1\.1

Mayo 2026

Equipo Producto JUK

Gaps incorporados: flujo de ETA rechazada \(US 1\.6–1\.8\), flujo de Application Form del Colegio en PDF \(US 1\.9–1\.11\), política de acceso post\-viaje\.

v1\.2

Mayo 2026

Equipo Producto JUK

7 casos borde incorporados \(CB\-1 a CB\-7\): cumpleaños 16 durante viaje, cambio de alojamiento, dos tutores firmando, padre sin WhatsApp, pagos vencidos, corrección urgente de datos, seguro independiente\. Addendums v1\.1 y v1\.2 integrados en módulos correspondientes\.

v1\.3

Mayo 2026

Equipo Producto JUK

3 correcciones: \(1\) modelo de cuenta — generación automática al crear registro, envío de credenciales como acción separada; \(2\) Módulo 11\.3 Próximas Salidas marcado fuera de alcance v1; \(3\) modelo de datos NPS — respuesta por alumno, NPS del viaje como promedio, acumulación por representante\.

v1\.4

Mayo 2026

Equipo Producto JUK

Soporte para alumno adulto \(18\+\) como titular de cuenta\. Dos perfiles de usuario \(padre/tutor y alumno adulto\)\. Comportamiento diferenciado en Módulos 1 \(sin Parental Consent ni autorización escribano\), 4 \(sin autorización notarial\) y 9 \(NPS adaptado al alumno\)\. Principio de lenguaje contextual en sección 1\.6\.

v1\.5

Mayo 2026

Equipo Producto JUK

Visibilidad condicional del Parental Consent según flag requiere\_parental\_consent del colegio destino \(actualmente solo Wimbledon School of English\)\. Combinatoria completa de condiciones N/A documentada\.

v1\.6

Mayo 2026

Equipo Producto JUK

Módulo 7 — Diario de Viaje: reacciones con emoji \(US 7\.5\) y comentarios de texto con aprobación de Representante \(US 7\.6\)\. Eliminada restricción de solo lectura de US\-7\.3\. Reglas de moderación y notificaciones actualizadas\. Alineado con PRD Vista Representante v1\.5\.

v1\.7

Mayo 2026

Equipo Producto JUK

Nueva estructura de pasos A/B/C/D alineada con Portal Interno v1\.9\. Tabla 1\.2 reestructurada en 4 grupos: Inscripción \(A\), Pagos \(B\), Documentación de viaje \(C\), Documentación legal \(D\)\. Vista de familias ahora muestra identificador \+ nombre del trámite en lugar de "Paso N de 10"\. Nuevo trámite D2 \(Psicofísico\) incorporado \(US 1\.12\)\. Referencias a Paso 5 y Paso 8 actualizadas a A3 y D1 en todas las reglas\.

v1\.8

Mayo 2026

Equipo Producto JUK

Regla de visibilidad de C1 \(ETA\) por país de destino, alineada con Portal Interno v1\.10\. Destino UK: C1 activo\. Destino USA/Canadá: N/A \(requiere VISA, fuera de scope v1\)\. Destino Irlanda: N/A \(argentinos sin requisito de entrada\)\. Actualizado US\-1\.5, tabla 1\.2, reglas de negocio 1\.6 y referencia en Módulo 4\.

v1\.9

Mayo 2026

Equipo Producto JUK

Corrección de actores: US\-1\.6, US\-1\.9, US\-1\.10, US\-4\.2, US\-8\.1, US\-11\.1 y US\-11\.2 actualizadas de padre/tutor a padre/tutor o alumno adulto\. Ambos perfiles tienen las mismas capacidades operativas para subir y descargar documentos\. US\-4\.2 agrega nota de que el seguro lo firma el propio alumno adulto\. Modelo de datos: config\_parental\_consent reemplaza al booleano requiere\_parental\_consent; ahora usa ENUM: Requerido, Opcional o NA\.

v1\.10

Mayo 2026

Equipo Producto JUK

3 correcciones menores: \(1\) US\-1\.5, US\-1\.7 y US\-1\.8 actualizadas a actor padre/tutor o alumno adulto para consistencia con US\-1\.6 en el flujo ETA; \(2\) notificacion D2 \(Psicofisico\) con threshold de 3 meses agregada a tabla Modulo 1, alineada con Portal Interno v1\.13 y Vista Representante v1\.9; \(3\) referencia Portal de Representante actualizada de v1\.5 a v1\.9 en reglas Modulo 7\.

v1\.11

Mayo 2026

Equipo Producto JUK

Modulo 7: comentarios sin moderacion previa\. US\-7\.6 reescrita: publicacion inmediata, limite 280 caracteres, titular puede borrar el propio comentario, Representante puede borrar cualquiera desde su panel sin notificar al autor\. Eliminadas reglas y notificaciones de aprobacion/rechazo\. Pregunta sobre limite de comentarios y notificacion a Representante marcadas como resueltas\.

# __Tabla de Contenidos__

# __1\. Introducción y Contexto__

## __1\.1 Sobre JUK__

JUK es una agencia argentina especializada en la organización de viajes de estudio al Reino Unido \(UK\)\. Acompaña a alumnos de nivel secundario y sus familias en toda la experiencia: desde la inscripción hasta la vuelta al país\.

## __1\.2 Propósito del Portal de Familias__

El Portal de Familias es un canal digital de autoservicio exclusivo para padres y tutores\. Centraliza la comunicación, la documentación, el seguimiento del viaje y la post\-experiencia en un único acceso, reduciendo la carga operativa de JUK y mejorando la experiencia de las familias\.

## __1\.3 Usuario Principal__

El portal tiene dos perfiles de titular de cuenta, determinados automáticamente según la fecha de nacimiento del alumno y la fecha de inicio del viaje:

__Perfil__

__Condición__

__Descripción__

__a\) Padre / Tutor__

Alumno menor de 18 años

El titular de la cuenta es el padre o tutor legal\. El portal usa lenguaje en tercera persona \("tu hijo/a", "el alumno"\)\. La cuenta la gestiona el adulto responsable\.

__b\) Alumno adulto__

Alumno de 18 años o más que viaja de forma individual

El titular de la cuenta es el propio alumno\. El portal usa lenguaje en primera persona \("tu documentación", "tu viaje"\)\. El alumno gestiona su cuenta de forma autónoma\.

__Atributo__

__Aplica a ambos perfiles__

__Acceso__

DNI del alumno \(usuario\) \+ contraseña

__Perfil tecnológico__

Nivel variado\. UX debe ser simple, visual y guiada\. Mobile\-first\.

__Idioma__

Español \(Argentina\)

__Email de contacto__

Email del tutor \(perfil a\) o email del propio alumno \(perfil b\)\. Usado para el envío de credenciales y notificaciones\.

## __1\.4 Modelo de Cuenta y Acceso__

__✅ Decisión tomada — Modelo de cuenta__

El modelo es 1 alumno = 1 cuenta, identificada con el DNI del alumno\. El perfil del titular \(padre/tutor o alumno adulto\) se determina automáticamente según la fecha de nacimiento del alumno y la fecha de inicio del viaje: si el alumno es menor de 18 al inicio del viaje, el titular es el padre/tutor; si tiene 18 años o más, el titular es el propio alumno\. Los padres y tutores del mismo alumno menor de edad comparten la cuenta\. JUK no gestiona usuarios múltiples por alumno en el portal de familias\.

*La cuenta se genera automáticamente en el momento en que el registro del alumno existe en el sistema — no al confirmar la inscripción, sino al crear el registro\. El envío de las credenciales es una acción separada que JUK ejecuta cuando lo considera oportuno, desde el perfil del alumno en el Portal Interno\. El titular \(padre/tutor o alumno adulto\) no puede acceder al portal hasta que JUK le envíe las credenciales\. El titular puede cambiar la contraseña en el primer acceso\.*

__❓ Preguntas abiertas para el negocio__

__• __¿En qué momento exacto del proceso de inscripción crea JUK la cuenta del alumno en el portal de familias? ¿Hay una integración con el sistema de CRM/gestión interna, o es un paso manual del operador?

__• __¿Qué sucede si ambos padres cambian la contraseña simultáneamente desde dispositivos distintos? ¿Hay un mecanismo de resolución de conflicto?

## __1\.5 Estructura General del Portal__

__Instancia__

__Módulos__

__Pre\-viaje__

Documentación requerida · Resumen de documentación · Resumen de pagos · Requisitos del viaje · Test de nivel \(fuera de alcance v1\)

__Durante el viaje__

Itinerario final · Itinerario diario / Diario de viaje

__Post\-viaje__

Certificado del curso · Encuesta NPS · Políticas de acceso y próximas salidas

__Cross\-instancia__

Soporte y canal de comunicación

## __1\.6 Principios de Diseño__

- Claridad ante todo: sin jerga técnica\. Cada acción explicada en lenguaje cotidiano\.
- Progresividad: mostrar el estado de avance en todo momento \(barras de progreso, íconos\)\.
- Visual y guiado: íconos, colores de estado y mensajes de orientación en cada paso\.
- Mobile\-first: la mayoría de los titulares accede desde su celular\.
- Notificaciones proactivas: el portal avisa antes de que el titular tenga que preguntar\.
- Accesibilidad: tipografía grande, contraste adecuado, flujos de máximo 3 clics\.
- Lenguaje contextual: el portal detecta si el titular es un padre/tutor o el propio alumno adulto, y adapta los textos de navegación, encabezados y mensajes en consecuencia\. No existe una versión "genérica" del portal; cada cuenta tiene un perfil definido al momento de su creación\.

## __1\.7 Política de Canales de Notificación__

__✅ Decisión tomada — Email y WhatsApp son complementarios, no equivalentes__

Email es el canal obligatorio y siempre activo\. Todas las notificaciones llegan por email\. WhatsApp es opcional: el padre lo configura en su perfil y se usa exclusivamente para comunicaciones urgentes o de alta prioridad \(ETA rechazada, cambio de alojamiento, alertas críticas\)\. Si el padre no tiene WhatsApp configurado, todas las notificaciones van por email\. Las notificaciones marcadas como urgentes por WhatsApp siempre tienen respaldo en email\.

__Canal__

__Uso y configuración__

__Email__

Obligatorio\. Se configura al crear la cuenta\. Canal primario para confirmaciones, documentos formales, recordatorios e historial\.

__WhatsApp__

Opcional\. El padre ingresa su número en el perfil\. Se usa solo para urgencias y alertas críticas\. Si no está configurado, esas alertas van por email\.

__▸  INSTANCIA 1: PRE\-VIAJE__

# __Módulo 1 · Documentación Requerida__

## __1\.1 Objetivo del módulo__

Proveer a los padres/tutores un espacio centralizado donde puedan descargar, completar, firmar y subir cada documento necesario antes del viaje\. Funciona como una checklist visual e interactiva que reduce la incertidumbre sobre qué falta completar, minimizando la necesidad de contactar a JUK para consultar estados\.

## __1\.2 Documentos incluidos__

*Los documentos se organizan en cuatro grupos\. La vista del portal muestra el grupo y el nombre del trámite en lugar de un número de paso\.*

__ID__

__Grupo__

__Documento__

__Tipo__

__Flujo del padre__

__Paso 0__

—

Application Form JUK

Formulario en portal

Solo lectura desde el portal\. Completado en instancia anterior\.

__A1__

Inscripción

Application Form del Colegio

PDF externo

Descargar PDF → completar/firmar offline → subir al portal

__A2__

Inscripción

Test de Nivel

⛔ Fuera de alcance v1

—

__A3__

Inscripción

Parental Consent \(< 16 / 16\-17 años\)

Formulario PDF

Descargar PDF → firmar manuscrito → escanear/fotografiar → subir\. ⚠ Solo visible si colegio requiere \(flag activo\) AND alumno menor de 18\.

__B1__

Pagos

Plan de cuotas

Vista en portal

Lectura del plan y estado de pagos\. Gestión en Módulo 3\.

__B2__

Pagos

Último pago presencial

Confirmación

JUK registra el pago presencial\. El padre ve el estado en Módulo 3\.

__C1__

Doc\. viaje

ETA \(Electronic Travel Authorisation\)

Gestión externa \(solo UK\)

Destino UK: Seguir instructivo JUK → gestionar en app UK → reportar estado en portal\. Destino USA/Canadá/Irlanda: N/A automático — ver regla de negocio\.

__C2__

Doc\. viaje

Immigration Letter

Informativo

Solo lectura y descarga

__C3__

Doc\. viaje

Accommodation Letter

Informativo

Solo lectura y descarga \+ ver mapa casa/colegio

__D1__

Doc\. legal

Autorización escribano \(salida del país\)

Confirmación \+ foto opcional

El padre confirma que obtuvo la autorización notarial\. Foto/scan opcional\. N/A para mayores de 18\. Gestión en Módulo 4\.

__D2__

Doc\. legal

Psicofísico

Confirmación \+ carga

El padre confirma que el alumno cuenta con el psicofísico requerido y puede subir el documento en formato PDF/imagen\.

## __1\.3 User Stories__

__US 1\.1 — Ver el panel de documentación__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.1__

Como padre/tutor, quiero ver en una sola pantalla todos los documentos requeridos con su estado actual, para entender qué tengo pendiente y qué ya completé\.

__1\. __La pantalla muestra todos los documentos agrupados en cuatro secciones: Inscripción \(A\), Pagos \(B\), Documentación de viaje \(C\) y Documentación legal \(D\)\.

__2\. __Cada trámite muestra su identificador \(A1, B2, C1…\), su nombre y su estado \(completado / pendiente / no aplica\) con ícono de color\.

__3\. __Un indicador de completitud global aparece en la parte superior \("5 de 9 trámites completos"\)\. Los ítems N/A no suman al total\.

__4\. __Cada trámite lleva directamente a su acción \(formulario, descarga, instructivo\)\.

__5\. __El estado se actualiza en tiempo real tras cada acción del padre\.

__6\. __La vista es completamente usable en móvil sin scroll horizontal\.

__US 1\.2 — Completar el Application Form JUK__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.2__

Como padre/tutor, quiero completar el Application Form JUK en el portal, en mi propio tiempo, sin necesidad de imprimirlo\.

__1\. __El formulario se puede completar en múltiples sesiones con guardado automático\.

__2\. __Los campos obligatorios están marcados visualmente\.

__3\. __El formulario valida los datos antes del envío \(fecha de nacimiento, DNI, etc\.\)\.

__4\. __Al enviar, el estado cambia a "Completado" y el padre recibe confirmación en pantalla\.

__5\. __JUK recibe una notificación interna al recibir el formulario enviado\.

__US 1\.3 — Descargar y firmar el Parental Consent__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.3__

Como padre/tutor, quiero descargar la versión correcta del Parental Consent, firmarlo físicamente y subir la copia al portal, para cumplir con el requisito sin ir a ninguna oficina\.

__1\. __El sistema muestra la versión correcta según la edad del alumno al momento de la descarga \(menor de 16 / 16\-17 años\)\. La versión no se recalcula retroactivamente\.

__2\. __El padre descarga el PDF, lo firma manuscritamente \(puede firmarlo uno o ambos tutores en el mismo documento descargado\), lo escanea o fotografía y lo sube al portal\.

__3\. __El portal acepta archivos JPG, PNG y PDF \(máx\. 15MB\)\. Se muestra previsualización antes de confirmar\.

__4\. __Al subir, el estado cambia a "Enviado — pendiente revisión JUK"\. JUK recibe el archivo para su verificación\.

__5\. __Con la firma de un solo tutor es suficiente para cumplir el requisito\. La firma de ambos tutores es válida si se incluyen en el mismo documento subido\.

__6\. __El portal registra internamente la edad del alumno y la versión del documento al momento de la descarga \(para trazabilidad de JUK, no visible para el padre\)\.

__US 1\.4 — Leer y descargar la Accommodation Letter__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.4__

Como padre/tutor, quiero ver la dirección de la casa de familia y del colegio en un mapa integrado, con sugerencias de transporte, para estar tranquilo sobre el entorno de mi hijo/a\.

__1\. __La Accommodation Letter es el documento fuente\. Al habilitarse, el portal extrae las dos direcciones \(casa y colegio\) y las muestra en un mapa integrado con dos puntos diferenciados\.

__2\. __Al tocar cada punto se muestra la dirección completa en texto y el nombre de la institución \(para el colegio\)\.

__3\. __El mapa funciona sin necesidad de que el padre tenga una app instalada\.

__4\. __El padre puede descargar la Accommodation Letter en PDF\.

__5\. __Hay un botón de acceso directo a Google Maps con la ruta prefijada entre los dos puntos\.

__US 1\.5 — Gestionar el ETA__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.5__

Como padre/tutor o alumno adulto, quiero acceder al instructivo del ETA y reportar su estado en el portal, para cumplir con el requisito de ingreso al Reino Unido\.

__1\. __Este trámite \(C1\) solo aparece activo si el viaje es al Reino Unido\. Para viajes a USA, Canadá, Irlanda u otros destinos no\-UK, el trámite se muestra como N/A con la etiqueta "No aplica para este destino"\.

__2\. __El portal muestra un instructivo paso a paso en español, incluyendo el escaneo de pasaporte en la app del gobierno UK, con link al sitio oficial\.

__3\. __El padre puede marcar el ETA como "En procesamiento" \(solicitud enviada\) y luego como "Aprobado" cuando recibe confirmación\.

__4\. __JUK puede verificar y corregir el estado del ETA desde el panel interno\.

__5\. __Si el ETA está pendiente a 30 días del viaje, se envía un recordatorio automático\.

__US 1\.6 — Reportar rechazo o error del ETA__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.6__

Como padre/tutor o alumno adulto, quiero poder indicar en el portal que el ETA fue rechazado o tuvo un error, para que JUK me ayude a resolverlo lo antes posible\.

__1\. __Esta US aplica únicamente cuando el destino es UK \(C1 es N/A para otros destinos\)\.

__2\. __Dentro de la sección ETA existe un botón "Tuve un problema con el ETA" junto al de "Marcar como aprobado"\.

__3\. __Al presionarlo, el titular indica el tipo de problema: rechazo por gobierno UK, error en los datos, o problema técnico con la app\.

__4\. __El titular puede adjuntar una captura de pantalla del error o rechazo\.

__5\. __JUK recibe una alerta crítica inmediata \(marcada como urgente\) en el panel interno\.

__6\. __El estado del ETA cambia a "Rechazado / Con error" con visibilidad destacada en rojo\.

__US 1\.7 — Recibir instrucciones tras un rechazo de ETA__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.7__

Como padre/tutor o alumno adulto, quiero recibir instrucciones claras en español sobre qué hacer si el ETA fue rechazado, para no perder tiempo buscando información por mi cuenta\.

__1\. __Al cambiar el estado a "Rechazado / Con error", el portal muestra una pantalla de orientación con: causas comunes de rechazo, pasos para reintentar o apelar, link oficial al gobierno UK, y contacto directo con JUK\.

__2\. __Si el rechazo implica solicitar una visa \(proceso que puede llevar hasta 3 semanas\), la pantalla lo indica claramente con el plazo estimado y pasos a seguir\.

__3\. __JUK puede actualizar el contenido de orientación desde el panel interno\.

__4\. __El padre recibe la misma información por email y WhatsApp en forma inmediata\.

__5\. __Si el viaje está a menos de 30 días, la alerta incluye un aviso de urgencia adicional\.

__US 1\.8 — Confirmar reintento exitoso del ETA__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.8__

Como padre/tutor o alumno adulto, quiero actualizar el estado del ETA una vez resuelto el problema, para que JUK sepa que ya está todo en orden\.

__1\. __Tras un rechazo, el padre puede cambiar el estado a "En procesamiento" \(reintento iniciado\) y luego a "Aprobado"\.

__2\. __Cada cambio de estado genera una notificación interna a JUK\.

__3\. __El historial de estados \(incluyendo rechazo y reintento\) queda registrado para JUK, no visible para el padre\.

__4\. __Si el padre no actualiza el estado dentro de 48 horas del rechazo, el portal envía un recordatorio\.

__US 1\.9 — Descargar el Application Form del Colegio__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.9__

Como padre/tutor o alumno adulto, quiero descargar el Application Form del Colegio, para completarlo offline y devolverlo a JUK\.

__1\. __El portal muestra el documento como descargable en PDF, con instrucciones en español preparadas por JUK\.

__2\. __El titular \(padre/tutor o alumno adulto\) puede descargarlo cuantas veces necesite\.

__3\. __La primera descarga registra la fecha y cambia el estado a "Descargado — pendiente devolución"\.

__US 1\.10 — Subir el Application Form del Colegio completado__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.10__

Como padre/tutor o alumno adulto, quiero subir el formulario del colegio completado y firmado, para que JUK lo reciba sin enviarlo por email\.

__1\. __Existe un botón "Subir formulario completado" en la sección del Application Form del Colegio\.

__2\. __El portal acepta PDF y JPG/PNG \(máx\. 15MB\) y muestra previsualización para confirmar antes de enviar\.

__3\. __Al confirmar, el estado cambia a "Enviado — pendiente revisión JUK" y JUK recibe el archivo\.

__4\. __El titular \(padre/tutor o alumno adulto\) recibe confirmación por email\.

__5\. __JUK puede aprobar o rechazar\. Si rechaza, el titular recibe notificación con el motivo y puede volver a subir\.

__US 1\.11 — Recibir feedback si el formulario del colegio fue rechazado__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.11__

Como padre/tutor, quiero saber si el formulario que subí fue rechazado y por qué, para corregirlo sin perder tiempo\.

__1\. __Si JUK rechaza el formulario, el estado cambia a "Rechazado — requiere corrección" y el padre recibe notificación inmediata con el motivo\.

__2\. __El padre puede subir una versión corregida desde el portal\.

__3\. __El historial de versiones subidas queda disponible para JUK \(no para el padre\)\.

__US 1\.12 — Confirmar el Psicofísico \(D2\)__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-1\.12__

Como padre/tutor \(o alumno adulto\), quiero confirmar que el alumno cuenta con el psicofísico requerido y opcionalmente adjuntar el documento, para que JUK tenga registro del cumplimiento\.

__1\. __El trámite D2 muestra un checkbox "Confirmo que el alumno tiene el psicofísico requerido" y un botón de carga opcional\.

__2\. __El padre puede subir el documento en PDF o imagen \(JPG/PNG, máx\. 10 MB\)\.

__3\. __Al confirmar, el estado cambia a "Cumplido"\. JUK puede revertir el estado desde el panel interno si detecta inconsistencia\.

__4\. __Si el alumno es adulto \(18\+\), el trámite aplica normalmente — no es N/A automático\.

## __1\.4 Estados posibles de los documentos__

__Estados comunes a todos los documentos:__

__Estado__

__Descripción__

__✅ Completado / Aprobado__

El documento fue completado, firmado o subido y JUK lo aprobó\.

__🕐 Pendiente__

El documento está disponible pero el padre aún no inició la acción\.

__⏳ Enviado — Pendiente revisión__

El padre subió el documento\. JUK está verificando\.

__🔴 Rechazado / Con error__

JUK rechazó el documento o hay un error reportado\. Requiere corrección y reenvío\.

__⚠️ Vencido__

El plazo de entrega fue superado y el documento sigue sin completarse\.

__🔒 No disponible aún__

JUK todavía no habilitó este documento \(ej: Accommodation Letter sin alojamiento confirmado\)\.

__➖ No aplica__

El documento no corresponde a este alumno según edad u otro criterio\.

__Estados específicos del ETA:__

__Estado__

__Descripción__

__🕐 Pendiente__

El padre no ha iniciado el trámite o no reportó el estado\.

__⏳ En procesamiento__

El padre envió la solicitud\. El gobierno UK está procesando \(plazo típico: hasta 72 hs\)\.

__✅ Aprobado__

El ETA fue aprobado\. El padre confirmó el estado en el portal\.

__🔴 Rechazado / Con error__

El ETA fue rechazado o hubo un error\. Requiere acción urgente\. Puede implicar solicitar visa \(hasta 3 semanas\)\.

__🔄 Reintento en curso__

El padre está siguiendo el protocolo de reintento o tramitando la visa\.

__Estados específicos del Application Form del Colegio \(PDF\):__

__Estado__

__Descripción__

__🔒 No disponible aún__

JUK no subió el PDF del formulario al portal\.

__🕐 Disponible — Pendiente descarga__

El PDF está listo para descargar pero el padre no lo hizo\.

__📥 Descargado — Pendiente devolución__

El padre descargó el formulario pero todavía no lo devolvió completado\.

__⏳ Enviado — Pendiente revisión__

El padre subió el formulario\. JUK lo está revisando\.

__🔴 Rechazado — Requiere corrección__

JUK rechazó el formulario\. El padre debe corregir y volver a subir\.

__✅ Aprobado por JUK__

JUK aprobó el formulario\. No se requiere ninguna acción adicional\.

## __1\.5 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

JUK habilita un nuevo documento \(ej: Accommodation Letter disponible\)

__Email \+ WhatsApp\*__

Una vez al habilitarse

Documento pendiente a 30 días del viaje

__Email \+ WhatsApp\*__

Una vez\. Recordatorio a los 7 días si sigue pendiente\.

Documento pendiente a 7 días del viaje

__Email \+ WhatsApp\*__

Diariamente hasta que se complete

ETA pendiente a 30 días del viaje

__Email \+ WhatsApp\*__

Una vez\. Recordatorio a los 15 y 7 días\.

Padre reporta rechazo o error del ETA

__Email \+ WhatsApp\* \(URGENTE\)__

Inmediato — alerta urgente al equipo JUK

ETA rechazado con viaje a menos de 30 días

__Email \+ WhatsApp\*__

Inmediato con pantalla de orientación

Padre no actualiza el ETA 48 hs después de marcar "Rechazado"

__Email__

Recordatorio único

Application Form JUK enviado exitosamente

__Email__

Una vez \(confirmación\)

Parental Consent o App Form del Colegio subido por el padre

__Email__

Una vez \(confirmación\)

JUK rechaza un documento subido por el padre

__Email \+ WhatsApp\*__

Una vez por rechazo, con motivo incluido

App Form del Colegio descargado pero no devuelto en 5 días

__Email__

Recordatorio único

JUK sube una nueva Accommodation Letter \(cambio de alojamiento\)

__Email \+ WhatsApp\* \(URGENTE\)__

Inmediato — una vez por cambio

Psicofísico \(D2\) pendiente con viaje a menos de 3 meses

__Email \+ WhatsApp\*__

Una vez\. Recordatorio a los 30 días si sigue pendiente\.

*\* WhatsApp solo si el padre configuró su número en el perfil\. Todas las notificaciones tienen respaldo en Email\. Ver sección 1\.7\.*

## __1\.6 Reglas de negocio__

- El Parental Consent tiene dos versiones excluyentes \(< 16 años / 16\-17 años\)\. La versión se determina una sola vez al momento en que el padre descarga el formulario\. No se recalcula retroactivamente\.
- Un alumno que firma el Parental Consent "menor de 16 años" y cumple 16 años durante el viaje no necesita refirmar\. El documento tiene validez jurídica al momento de su suscripción\.
- La firma del Parental Consent es manuscrita: el padre descarga el PDF, firma físicamente, escanea o fotografía y sube al portal\. No se admite firma digital embebida por el momento\.
- Con la firma de un solo tutor es suficiente para marcar el Parental Consent como "Completado"\. Si ambos tutores firman el mismo documento descargado, ambas firmas son válidas\. JUK puede requerir dos firmas para un alumno específico configurándolo desde el panel interno\.
- Visibilidad del Parental Consent — el Parental Consent se muestra en el portal exclusivamente cuando el colegio destino del alumno tiene config\_parental\_consent = 'Requerido' \(gestionado por JUK en el ABM de Colegios Destino del Portal Interno, usando los valores del ENUM: Requerido | Opcional | NA\)\. Actualmente solo Wimbledon School of English tiene ese valor\. Para alumnos de colegios con config\_parental\_consent = 'NA' u 'Opcional', el módulo de Parental Consent no aparece en el portal y el paso correspondiente queda marcado como N/A automáticamente desde el inicio\.
- Combinatoria de condiciones N/A para A3 \(Parental Consent\): \(1\) N/A si el colegio destino tiene config\_parental\_consent = 'NA' u 'Opcional'\. \(2\) N/A si el alumno tiene 18 años o más al inicio del viaje\. \(3\) Si ambas condiciones aplican simultáneamente, el resultado es igualmente N/A\. \(4\) El trámite A3 solo aparece activo cuando se cumplen ambas condiciones: colegio con config\_parental\_consent = 'Requerido' AND alumno menor de 18 al inicio del viaje\.
- Alumno adulto \(18\+\): el trámite D1 \(Autorización por Escribano\) tampoco aparece en el módulo de documentación\. Los demás documentos aplican normalmente\.
- D2 \(Psicofísico\): aplica tanto para alumnos menores como adultos\. El padre o el propio alumno confirma el cumplimiento y puede subir el documento de forma opcional\. No hay integración automática con sistemas de salud\.
- La Accommodation Letter se habilita cuando JUK confirma el alojamiento\. Si el alojamiento cambia, JUK sube una nueva versión; el mapa y la información de transporte se actualizan automáticamente\. El historial de versiones anteriores queda disponible solo para JUK\.
- Los formularios \(Application Form JUK, Parental Consent, Application Form del Colegio\) solo pueden reemplazarse mientras el estado sea "Pendiente" o "Rechazado"\. Una vez aprobados por JUK, quedan en modo solo lectura para el padre\.
- El Application Form del Colegio puede variar por colegio/destino\. JUK sube el PDF correcto para cada grupo/viaje desde el panel interno\. El padre ve siempre el formulario correspondiente a su alumno\.
- Visibilidad de C1 \(ETA\) por país de destino: el trámite C1 se muestra activo \(Pendiente → Completado\) únicamente cuando el colegio destino está en el Reino Unido\. Para viajes a USA o Canadá, el ETA no aplica porque esos destinos requieren VISA \(gestión fuera de scope v1\); el trámite se marca N/A automáticamente\. Para viajes a Irlanda, los ciudadanos argentinos no requieren documentación de entrada; el trámite también se marca N/A automáticamente\. Para cualquier otro destino no\-UK, C1 se marca N/A con la etiqueta "No aplica para este destino"\.
- El estado del ETA es autoreportado por el padre\. JUK puede corregirlo desde el panel interno\. JUK recuerda activamente al padre de gestionar el ETA; no hay integración automática con el sistema del gobierno UK\.
- Las sugerencias de transporte público desde la casa hasta el colegio son orientativas\. Se implementan en una segunda iteración del portal, no en v1\.

## __1\.7 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿En qué momento exacto del proceso de inscripción crea JUK la cuenta del alumno? ¿Es manual o integrado con el sistema interno?

__• __¿El Application Form del Colegio varía por destino? ¿Cómo gestiona JUK internamente que el portal muestre el formulario correcto para cada alumno?

__• __¿Hay colegios que aceptan el formulario completado digitalmente, sin firma manuscrita?

__• __¿JUK tiene experiencia previa con rechazos de ETA? ¿Cuáles son las causas más frecuentes para incluir en la pantalla de orientación?

__• __¿JUK ofrece asistencia activa en el reintento del ETA \(llamada, videollamada\) o solo orientación escrita?

__• __¿El rechazo de ETA activa un proceso de devolución o reprogramación del viaje? Si es así, ¿cómo se comunica al padre desde el portal?

__• __¿Existe algún escenario legal \(ej: padres separados con tenencia compartida\) donde JUK requiera obligatoriamente las dos firmas del Parental Consent?

# __Módulo 2 · Resumen de Documentación__

## __2\.1 Objetivo del módulo__

Vista consolidada de solo lectura con los datos clave del alumno, extraídos automáticamente de los formularios completados\. Funciona como "ficha del alumno" para que los padres verifiquen la información en cualquier momento y para que JUK tenga los datos validados de forma centralizada\.

## __2\.2 Información consolidada__

__Campo__

__Fuente de datos__

Nombre y Apellido del alumno

Application Form JUK

Número de pasaporte

Application Form JUK

Fecha de nacimiento

Application Form JUK

Alergias / Problemas de salud

Application Form JUK — visible solo para padre, representante y JUK

Teléfono de emergencias del seguro

Cargado por el padre en Módulo 4 \(opcional\)

Dirección de la casa de familia

Accommodation Letter \(cargado por JUK\)

Dirección y nombre del colegio

Accommodation Letter \(cargado por JUK\)

## __2\.3 User Stories__

__US 2\.1 — Ver la ficha del alumno__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-2\.1__

Como padre/tutor, quiero ver todos los datos registrados de mi hijo/a en una sola pantalla, para verificar que la información es correcta antes del viaje\.

__1\. __Muestra todos los campos de la ficha\. Si un campo está vacío, aparece "Sin información registrada" \(nunca campo en blanco\)\.

__2\. __Los datos se generan automáticamente desde los formularios\. El padre no puede editarlos desde esta vista\.

__3\. __La pantalla está disponible en las tres instancias del portal \(pre, durante y post viaje\)\.

__4\. __Si hay una solicitud de corrección pendiente, se muestra una etiqueta "En revisión" junto al campo afectado\.

__US 2\.2 — Visualizar el mapa casa\-colegio__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-2\.2__

Como padre/tutor, quiero ver en un mapa dónde está la casa de familia y el colegio, para entender el entorno de mi hijo/a\.

__1\. __El mapa muestra simultáneamente los dos puntos con íconos diferenciados\.

__2\. __Al tocar cada punto se muestra la dirección completa y el nombre del lugar\.

__3\. __El mapa funciona sin app instalada\. Es legible en celular\.

__4\. __Si el alojamiento cambia, el mapa se actualiza automáticamente con las nuevas coordenadas\.

__5\. __Hay un botón de acceso directo a Google Maps con la ruta entre los dos puntos\.

__US 2\.3 — Solicitar corrección de datos__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-2\.3__

Como padre/tutor, quiero indicarle a JUK que hay un dato incorrecto en la ficha de mi hijo/a, para que lo corrijan antes de que sea un problema\.

__1\. __Existe un botón "Reportar dato incorrecto" dentro de cada campo de la ficha \(ícono de lápiz o bandera junto al dato\)\.

__2\. __Al presionarlo, el padre indica qué campo tiene error y puede agregar un comentario\.

__3\. __JUK recibe una notificación interna por email con el alumno, el campo reportado y el comentario del padre\.

__4\. __El padre recibe confirmación de que su reporte fue recibido\.

__5\. __Los reportes de datos críticos \(pasaporte, fecha de nacimiento\) a menos de 7 días del viaje se marcan automáticamente como urgentes en el panel interno de JUK\.

## __2\.4 Categorías de corrección de datos__

__Categoría__

__Campos incluidos__

__Comportamiento del sistema__

__Categoría A — Críticos__

Número de pasaporte, fecha de nacimiento, nombre completo

Si se reportan a menos de 7 días del viaje, se marcan como URGENTE y JUK recibe alerta de alta prioridad\. JUK valida estos datos activamente con anticipación\.

__Categoría B — No bloqueantes__

Alergias, condiciones de salud, teléfono de emergencias, contacto del seguro

Se pueden reportar y corregir en cualquier momento, incluso durante el viaje, sin restricción temporal\.

## __2\.5 Estados posibles__

__Estado__

__Descripción__

__✅ Completo__

Todos los campos de la ficha tienen información registrada\.

__⚠️ Incompleto__

Uno o más campos vacíos porque el formulario fuente aún no fue completado\.

__🔄 En revisión__

El padre reportó un dato incorrecto y JUK está verificando\. El campo afectado muestra etiqueta "En revisión"\.

## __2\.6 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

La ficha del alumno se completa por primera vez \(todos los datos disponibles\)

__Email__

Una sola vez

JUK corrige un dato reportado por el padre

__Email__

Una sola vez por corrección

Corrección de Categoría A reportada a menos de 7 días del viaje

__Email \(alerta interna JUK\)__

Inmediato — marcada como urgente

## __2\.7 Reglas de negocio__

- La ficha es de solo lectura para el padre\. Las correcciones se solicitan via el botón de reporte y son aplicadas por JUK desde el panel interno\.
- Los campos del resumen se pueblan automáticamente desde los formularios correspondientes\.
- La información de alojamiento \(casa y colegio\) aparece solo cuando JUK la confirma\. Si el alojamiento cambia, la ficha se actualiza automáticamente\.
- Los datos de salud \(alergias, condiciones\) son visibles únicamente para el padre, la representante y el equipo de JUK\. No se comparten con terceros fuera de esos roles\.
- El teléfono de emergencias del seguro \(si el padre lo cargó\) aparece visible en la ficha para facilitar su consulta durante el viaje\.

## __2\.8 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿Las sugerencias de transporte público se muestran en v1 o se difieren a una segunda iteración?

__• __¿Las correcciones de Categoría B \(salud\) se comunican automáticamente a la familia anfitriona o al colegio UK, o solo quedan en el sistema JUK?

# __Módulo 3 · Resumen de Pagos__

## __3\.1 Objetivo del módulo__

Ofrecer a los padres una vista transparente del estado de cada cuota\. El portal actúa como canal de información, no de pago\. JUK actualiza los estados manualmente a partir de la información que recibe de la agencia\.

__✅ Decisión tomada — Moneda y actualización de pagos__

Los montos se muestran en dólares \(USD\)\. No existe integración automática con ningún sistema de cobro\. La agencia comunica los estados de pago a JUK periódicamente \(frecuencia a definir\), y el operador de JUK los actualiza manualmente en el sistema\.

## __3\.2 User Stories__

__US 3\.1 — Ver el estado de cada cuota__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-3\.1__

Como padre/tutor, quiero ver el estado de cada cuota del programa, para saber cuánto debo, qué pagué y qué está vencido\.

__1\. __Cada cuota se muestra con: número, descripción, monto en USD, fecha de vencimiento y estado con color diferenciado\.

__2\. __Resumen en la parte superior con total pagado y saldo restante\.

__3\. __Si hay una o más cuotas vencidas, se muestra un banner de alerta en la parte superior de todas las pantallas del portal \(no bloqueante\)\. Texto: "Tenés una cuota vencida\. Regularizá tu situación para asegurar el viaje de \[Nombre\]\." El banner incluye acceso directo a esta pantalla\.

__4\. __La vista es usable en móvil sin scroll horizontal\.

__US 3\.2 — Recibir recordatorio de cuota próxima a vencer__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-3\.2__

Como padre/tutor, quiero recibir un aviso cuando una cuota está próxima a vencer, para no olvidarme de pagar\.

__1\. __Se envía un recordatorio 5 días hábiles antes del vencimiento\.

__2\. __El mensaje incluye el monto en USD, la fecha y los medios de pago disponibles\.

__3\. __Si la cuota vence sin pago registrado, el estado cambia a "Vencida" y se envía nueva notificación\.

__US 3\.3 — Ver historial de pagos__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-3\.3__

Como padre/tutor, quiero ver el historial de las cuotas que ya pagué, para tener un registro\.

__1\. __Sección "Historial de pagos" con todas las cuotas pagadas: número, monto en USD, fecha de registro por JUK\.

__2\. __El padre puede descargar el historial en PDF\.

__US 3\.4 — Consultar medios de pago__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-3\.4__

Como padre/tutor, quiero ver qué medios de pago acepta JUK, para saber cómo abonar\.

__1\. __Sección visible con los métodos de pago aceptados\.

__2\. __JUK puede actualizarla desde el panel interno sin cambios de desarrollo\.

## __3\.3 Estados posibles de cada cuota__

__Estado__

__Descripción__

__✅ Pagada__

JUK registró el pago\. Se muestra la fecha de registro\.

__🕐 Pendiente__

La cuota no vence aún y no hay registro de pago\.

__🔴 Vencida__

La fecha de vencimiento fue superada sin pago registrado\. El banner de alerta es visible en todo el portal\.

*Nota: el estado "En proceso" \(verificación de pago en curso\) queda fuera de alcance en v1, pending alineación con la agencia sobre la frecuencia y mecanismo de actualización de estados\.*

## __3\.4 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

Cuota próxima a vencer \(5 días hábiles antes\)

__Email \+ WhatsApp\*__

Una sola vez por cuota

Cuota vencida sin pago registrado

__Email \+ WhatsApp\*__

Al vencer \+ recordatorio a los 3 días

JUK registra el pago de una cuota

__Email__

Una vez \(confirmación\)

## __3\.5 Reglas de negocio__

- El portal no procesa pagos\. Es un canal de visualización de estado\.
- El estado de cada cuota es actualizado exclusivamente por JUK desde el panel interno\. El padre no puede modificar el estado de sus pagos\.
- Una cuota vencida no bloquea el acceso a ningún módulo del portal\. El padre puede continuar completando documentación normalmente\.
- El banner de cuota vencida es el único mecanismo automático de restricción visible\. Bloqueos específicos \(ej: no habilitar Accommodation Letter\) son configurables manualmente por JUK caso por caso, no es un comportamiento automático general\.
- JUK define el número de cuotas, montos en USD y fechas de vencimiento para cada alumno al momento de la inscripción\.

## __3\.6 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿Con qué frecuencia la agencia comunica los estados de pago a JUK? ¿Existe la posibilidad de un Google Sheet compartido o similar?

__• __¿Cuántas cuotas tiene el programa en promedio? ¿Varía por destino o fecha?

__• __¿Existe la posibilidad de pago anticipado o en cuotas distintas a las predefinidas?

__• __¿Qué sucede con el estado de pagos si un alumno cancela su inscripción?

# __Módulo 4 · Requisitos para el Viaje__

## __4\.1 Objetivo del módulo__

Centralizar los requisitos pre\-viaje que complementan la documentación: seguro de viaje, autorización notarial, información del destino y checklist de equipaje\. La meta es que los padres lleguen al día del viaje sin sorpresas\.

## __4\.2 Requisitos incluidos__

__Requisito__

__Responsable__

__Tipo de acción en portal__

ETA

Padre/Alumno

Ver estado \(enlazado al Módulo 1\)

Seguro de viaje

Padre \(cada familia contrata el suyo\)

Confirmar \+ cargar datos opcionales de la póliza

Autorización de salida del menor por escribano

Padre

Confirmar obtención \(recordatorio\)\. Subir foto/scan es opcional\.

Información sobre el destino

JUK

Solo lectura / descarga PDF

Sugerencias pre\-viaje

JUK

Solo lectura

Checklist de equipaje

JUK \(a modo de sugerencia\)

Vista interactiva \+ imprimible

## __4\.3 User Stories__

__US 4\.1 — Ver el estado de todos los requisitos__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-4\.1__

Como padre/tutor, quiero ver todos los requisitos pre\-viaje con su estado, para saber qué me falta gestionar\.

__1\. __Cada requisito con ícono de estado \(cumplido / pendiente / no aplica\)\.

__2\. __Indicador de progreso general \(ej: "6 de 7 requisitos cumplidos"\)\.

__3\. __Cada requisito tiene un botón de acción contextual\.

__4\. __Los requisitos gestionados por JUK aparecen bloqueados hasta que JUK los habilite\.

__US 4\.2 — Registrar el seguro de viaje__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-4\.2__

Como padre/tutor o alumno adulto, quiero registrar el seguro de viaje en el portal, para que JUK tenga los datos del seguro disponibles ante una emergencia\.

__1\. __El titular elige entre dos opciones: \(A\) "JUK incluyó el seguro en mi paquete" o \(B\) "Contraté el seguro de forma independiente"\.

__2\. __Para el alumno adulto, el seguro lo firma y contrata el propio alumno \(no un tutor\)\.

__3\. __Si elige B, puede cargar de forma opcional: nombre de la aseguradora, número de póliza, teléfono de emergencias 24 hs y fechas de vigencia\.

__4\. __El portal valida que la vigencia cubra el período del viaje\. Si no lo cubre, muestra advertencia visible pero no bloqueante\.

__5\. __Si elige B pero no carga datos, el estado queda en "Confirmado sin datos"\. JUK puede ver este estado\.

__6\. __El teléfono de emergencias aparece en el Resumen de Documentación \(Módulo 2\) para consulta de la representante\.

__US 4\.3 — Confirmar autorización notarial de salida__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-4\.3__

Como padre/tutor, quiero confirmar que obtuve la autorización de salida del menor por escribano, para cumplir con este recordatorio antes del viaje\.

__1\. __Este módulo funciona principalmente como recordatorio\. No es un requisito de verificación formal: la confirmación del padre alcanza\.

__2\. __El padre confirma que tiene la autorización con un tilde/checkbox\.

__3\. __Opcionalmente puede subir foto o scan del documento \(JPG, PNG, PDF, máx\. 10MB\)\.

__4\. __Si el alumno tiene 18 años o más, este requisito se marca automáticamente como "No aplica"\.

__US 4\.4 — Acceder al checklist de equipaje__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-4\.4__

Como padre/tutor, quiero ver una lista de equipaje sugerida y poder marcar lo que ya preparé, para no olvidar nada antes del viaje\.

__1\. __Lista interactiva donde el padre puede tildar cada ítem\. Las marcas se guardan\.

__2\. __Ítems agrupados por categoría \(ropa, documentos, higiene, electrónica, etc\.\)\.

__3\. __Lista imprimible con botón dedicado\.

__4\. __JUK puede actualizar los ítems desde el panel interno\.

__5\. __Completar el checklist no afecta el estado de cumplimiento del viaje\. Es orientativo\.

__US 4\.5 — Leer información sobre el destino__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-4\.5__

Como padre/tutor, quiero leer información útil sobre el destino y las sugerencias pre\-viaje de JUK, para preparar mejor a mi hijo/a\.

__1\. __Sección con información del destino: clima, moneda, cultura, tips de seguridad\.

__2\. __Sugerencias pre\-viaje actualizables por JUK desde el panel interno\.

__3\. __El padre puede descargar el material en PDF\.

__4\. __Contenido en secciones colapsables para facilitar la lectura en celular\.

## __4\.4 Estados posibles__

__Estado__

__Descripción__

__✅ Cumplido__

El requisito fue confirmado por el padre o verificado por JUK\.

__🕐 Pendiente__

El requisito aún no fue gestionado\.

__🔴 Urgente__

El requisito está pendiente y faltan menos de 14 días para el viaje\.

__✅ Confirmado sin datos__

Para el seguro: el padre declaró que tiene seguro pero no cargó los datos de la póliza\.

__➖ No aplica__

El requisito no corresponde \(ej: autorización notarial para mayores de 18\)\.

__🔒 Pendiente de JUK__

Contenido no habilitado aún por JUK \(ej: guía del destino sin cargar\)\.

## __4\.5 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

JUK habilita nuevo contenido \(ej: guía del destino disponible\)

__Email \+ WhatsApp\*__

Una sola vez

Requisito pendiente a 21 días del viaje

__Email \+ WhatsApp\*__

Una vez\. Recordatorio a los 7 días\.

Requisito pendiente a 7 días del viaje

__Email \+ WhatsApp\*__

Diariamente hasta completar

Padre registra seguro o autorización notarial

__Email__

Confirmación única

## __4\.6 Reglas de negocio__

- El ETA \(C1\) aparece en este módulo como referencia, con el mismo estado que en el Módulo 1\. Solo es visible si el viaje es al Reino Unido; para otros destinos figura como N/A \(ver regla de visibilidad en sección 1\.6\)\.
- La autorización notarial funciona como recordatorio, no como requisito de verificación formal\. La confirmación del padre es suficiente; JUK no audita el documento\.
- El seguro de viaje es contratado de forma independiente por cada familia\. JUK no provee póliza grupal\. Los datos de la póliza son opcionales\.
- JUK no verifica ni valida el seguro contratado por el padre\. La responsabilidad de tener cobertura adecuada es exclusivamente de la familia\.
- El checklist de equipaje es orientativo\. Completarlo o no completarlo no afecta el estado de cumplimiento del viaje\.
- Alumno adulto \(18\+\): la sección de Autorización Notarial \(US 4\.3\) no aparece en el módulo\. El sistema la omite completamente basándose en el perfil de la cuenta\. El seguro, el checklist y la información del destino aplican normalmente\.

## __4\.7 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿Qué sucede con los requisitos si el alumno viaja acompañado por un adulto responsable \(ej: grupo escolar con docente\)?

__• __¿La representante tiene acceso a los datos del seguro de todos los alumnos del grupo desde su panel, para consultarlos ante una emergencia?

__• __¿El checklist de equipaje varía por destino, época del año o es siempre el mismo?

# __Módulo 5 · Test de Nivel / Aprendizaje__

__🚧 Fuera de alcance — v1__

*Este módulo ha sido diferido para una versión futura del portal\. No forma parte del alcance de desarrollo de v1\. Se registra aquí la conceptualización inicial para que quede documentada de cara a iteraciones futuras\.*

## __Concepto general \(para iteración futura\)__

Herramienta de autoevaluación del nivel de inglés previa al viaje\. Permite a los alumnos conocer su nivel \(A2, B1, B2\) y recibir sugerencias de preparación adaptadas\. JUK decide si lo desarrolla internamente o integra una plataforma externa\.

## __Preguntas a resolver antes de retomar__

__❓ Preguntas abiertas para el negocio__

__• __¿El test lo desarrolla JUK internamente o se integra con una plataforma externa \(Cambridge, Duolingo, etc\.\)?

__• __¿El resultado tiene impacto en la asignación de grupo en el colegio UK?

__• __¿El test lo completa el alumno directamente o el padre en su nombre?

__• __¿Es de un solo intento o se puede repetir?

__▸  INSTANCIA 2: DURANTE EL VIAJE__

# __Módulo 6 · Itinerario Final__

## __6\.1 Objetivo del módulo__

Proveer a los padres el itinerario oficial y aprobado del programa de viaje, en formato de solo lectura\. Reduce la cantidad de consultas al equipo de JUK y da tranquilidad a las familias\.

## __6\.2 User Stories__

__US 6\.1 — Ver el itinerario completo__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-6\.1__

Como padre/tutor, quiero ver el itinerario completo y aprobado del viaje, para saber qué va a hacer mi hijo/a cada día\.

__1\. __Vista de calendario o lista cronológica con fecha, actividad, horario estimado y ubicación\.

__2\. __Solo lectura para el padre\. Descargable en PDF\.

__3\. __Visible desde el primer día del viaje hasta el regreso\.

__US 6\.2 — Ser notificado cuando el itinerario esté disponible__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-6\.2__

Como padre/tutor, quiero recibir una notificación cuando JUK publique el itinerario oficial\.

__1\. __Al publicar, el portal notifica a todos los padres del grupo con link directo\.

__2\. __Si el itinerario se actualiza, se envía nueva notificación indicando los cambios\.

__3\. __Los cambios se marcan visualmente en el día afectado \(etiqueta "Modificado"\)\.

## __6\.3 Estados posibles__

__Estado__

__Descripción__

__🔒 No disponible__

JUK no publicó el itinerario aún\.

__✅ Publicado__

Disponible para consulta\.

__🔄 Actualizado__

Modificado tras su publicación original\. Se indica fecha de última actualización\.

## __6\.4 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

JUK publica el itinerario por primera vez

__Email \+ WhatsApp\*__

Una sola vez

JUK modifica el itinerario publicado

__WhatsApp\* \+ Email__

Una vez por modificación

## __6\.5 Reglas de negocio__

- El itinerario es cargado y publicado únicamente por JUK desde el panel interno\.
- Cada padre ve solo el itinerario del grupo al que pertenece su hijo/a\.
- El itinerario puede publicarse antes del inicio del viaje o durante el mismo\.

## __6\.6 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿El itinerario es por grupo o puede individualizarse por alumno para actividades optativas?

__• __¿Quién aprueba el itinerario final: JUK, la representante, el colegio UK, o una combinación?

# __Módulo 7 · Itinerario Diario / Diario de Viaje__

## __7\.1 Objetivo del módulo__

Brindar a los padres una ventana en tiempo real al día a día del viaje: el plan del día, fotos y videos del grupo, novedades de la representante, y un canal de mensajes asíncrono para consultas puntuales\. Los padres pueden reaccionar con emojis a las entradas del diario y dejar comentarios de texto sujetos a aprobación de la representante\.

## __7\.2 User Stories__

__US 7\.1 — Ver el itinerario del día__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.1__

Como padre/tutor, quiero ver qué tiene planificado mi hijo/a para hoy, sin necesidad de llamarlo\.

__1\. __Al ingresar durante el viaje, la pantalla principal muestra el plan del día actual destacado\.

__2\. __El plan incluye actividades, horarios y lugares\.

__3\. __El padre puede navegar a días anteriores y futuros\.

__US 7\.2 — Ver fotos y videos del viaje__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.2__

Como padre/tutor, quiero ver las fotos y videos del viaje de mi hijo/a, para sentirme cerca aunque esté lejos\.

__1\. __Galería organizada por día, accesible en móvil\.

__2\. __Cada ítem indica fecha y puede tener pie de foto\.

__3\. __Los padres pueden descargar fotos individualmente\.

__4\. __El portal notifica cuando se suben nuevas fotos o videos\.

__US 7\.3 — Leer novedades de la representante__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.3__

Como padre/tutor, quiero leer los comentarios y novedades de la representante, para saber cómo está el grupo\.

__1\. __La representante publica actualizaciones de texto \(novedades, anécdotas\)\.

__2\. __Las novedades aparecen ordenadas cronológicamente con fecha y hora\.

__3\. __Los padres reciben notificación al publicarse una novedad\.

__4\. __Cada novedad muestra un selector de emojis y una sección de comentarios \(ver US 7\.5 y US 7\.6\)\.

__US 7\.4 — Contactar a la representante__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.4__

Como padre/tutor, quiero escribirle a la representante desde el portal, para hacer consultas sin buscar su número\.

__1\. __Botón "Escribir a la representante" visible en el diario de viaje\.

__2\. __El padre envía un mensaje de texto\. La representante lo recibe en su panel o por email\.

__3\. __El sistema guarda el historial de mensajes enviados\.

__4\. __La representante puede responder y el padre recibe la respuesta en el portal y/o por email\.

__US 7\.5 — Reaccionar a entradas del Diario__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.5__

Como padre/tutor \(o alumno adulto\), quiero reaccionar con un emoji a una entrada del Diario de Viaje, para expresar mi reacción de forma rápida sin escribir texto\.

__1\. __Cada entrada publicada muestra un selector de emojis con al menos 5 opciones\.

__2\. __El padre puede agregar o quitar su propia reacción en cualquier momento\.

__3\. __El conteo de reacciones por emoji es visible para todos los padres del mismo viaje\.

__4\. __Las reacciones no requieren aprobación de la representante\. Se publican de forma inmediata\.

__US 7\.6 — Comentar entradas del Diario__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-7\.6__

Como padre/tutor o alumno adulto, quiero dejar un comentario de texto en una entrada del Diario de Viaje, para compartir una reacción con la Representante y los demás padres del grupo\.

__1\. __Campo de texto bajo cada entrada publicada con botón "Comentar"\. Límite de 280 caracteres con contador visible en tiempo real\.

__2\. __Al enviar, el comentario se publica de forma inmediata y es visible para todos los padres del mismo viaje, con nombre del autor y fecha/hora\.

__3\. __No se requiere aprobación previa de la Representante\.

__4\. __La Representante puede eliminar cualquier comentario desde su panel\. El comentario desaparece del feed sin notificación al autor\.

__5\. __El titular puede eliminar su propio comentario en cualquier momento\.

## __7\.3 Reglas de negocio__

- La carga de fotos, videos y novedades es responsabilidad de la representante\. Los padres no pueden subir contenido\.
- Las fotos y videos son visibles solo para padres del mismo grupo\. No hay galerías compartidas entre grupos\.
- El portal soporta visualización de videos sin descarga \(streaming embebido\)\.
- El canal de mensajes con la representante es asíncrono, no un chat en tiempo real\.
- Las reacciones con emoji son públicas dentro del grupo del viaje y no requieren moderación\.
- Los comentarios de texto se publican de forma inmediata\. No hay flujo de moderación previa\.
- Los comentarios tienen un límite de 280 caracteres\. El portal muestra un contador en tiempo real al escribir\.
- La Representante puede eliminar comentarios ya publicados desde su panel\. El autor no recibe notificación\.
- El titular \(padre/tutor o alumno adulto\) puede eliminar sus propios comentarios en cualquier momento\.

## __7\.4 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

La representante sube nuevas fotos o videos

__WhatsApp\* \+ Email__

Una vez por carga

La representante publica una novedad del día

__WhatsApp\* \+ Email__

Una vez por novedad

La representante responde un mensaje del padre

__Email \+ Notificación en portal__

Una vez por respuesta

Padre publica un comentario en el Diario

__Notificación en portal a la Representante__

Una vez por comentario

## __7\.5 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿Quién sube las fotos y videos: la representante, un docente acompañante, o ambos?

__• __¿El canal de mensajes con la representante es individual \(padre\-representante\) o grupal \(todos los padres\)?

__• __¿Qué sucede si la representante no tiene acceso a internet durante parte del viaje? ¿Hay protocolo de contingencia?

__• __✅ RESUELTO — ¿Hay un límite de longitud para los comentarios? → 280 caracteres\.

__• __✅ RESUELTO — ¿La Representante recibe notificación cuando un padre comenta? → Los comentarios se publican directo sin moderación; la Representante recibe notificación en portal\.

__▸  INSTANCIA 3: POST\-VIAJE__

# __Módulo 8 · Certificado del Curso__

## __8\.1 Objetivo__

Permitir la descarga del certificado oficial del curso de inglés, una vez que JUK lo sube al portal\. Es un activo valioso para el alumno y su disponibilidad digital evita el riesgo de pérdida del original físico\.

## __8\.2 User Stories__

__US 8\.1 — Descargar el certificado__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-8\.1__

Como padre/tutor o alumno adulto, quiero descargar el certificado del curso desde el portal\.

__1\. __Al publicar el certificado JUK, el titular \(padre/tutor o alumno adulto\) recibe notificación y puede descargarlo en PDF\.

__2\. __El certificado permanece disponible mientras el acceso al portal esté activo\.

__3\. __El certificado está asociado al nombre y datos del alumno\.

__US 8\.2 — Recibir notificación cuando esté disponible__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-8\.2__

Como padre/tutor, quiero recibir una notificación cuando el certificado esté listo, para no tener que revisarlo constantemente\.

__1\. __Al publicarlo JUK, el portal envía notificación automática con link directo\.

__2\. __La notificación incluye el nombre del alumno\.

__3\. __Se envía por Email y WhatsApp\.

## __8\.3 Estados posibles__

__Estado__

__Descripción__

__🔒 Pendiente de carga__

JUK aún no subió el certificado\.

__✅ Disponible__

El padre puede descargarlo\. Si JUK reemplaza el certificado por uno correcto, se notifica al padre\.

## __8\.4 Reglas de negocio__

- El certificado es cargado exclusivamente por JUK\. El padre no puede subir ni reemplazar el documento\.
- La disponibilidad del certificado está sujeta a la política de acceso post\-viaje definida en el Módulo 11\.

## __8\.5 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿El certificado llega en formato digital desde el colegio UK o JUK lo escanea del original físico?

__• __¿Cuánto tiempo después del regreso suele estar disponible el certificado?

# __Módulo 9 · Encuesta de Satisfacción \(NPS\)__

## __9\.1 Objetivo__

Capturar la percepción post\-viaje a través de NPS en tres dimensiones: la agencia JUK, la representante, y el colegio UK\. El titular de la encuesta es el padre/tutor \(perfil a\) o el propio alumno adulto \(perfil b\), y el lenguaje se adapta en consecuencia\.

## __9\.2 Dimensiones del NPS__

__Dimensión__

__Pregunta — Perfil Padre/Tutor__

__Pregunta — Perfil Alumno adulto__

__Escala__

NPS General JUK

¿Con qué probabilidad recomendarías JUK a otra familia?

¿Con qué probabilidad recomendarías JUK?

0 a 10

NPS Representante

¿Cómo evaluarías el trabajo de la representante?

¿Cómo evaluarías el trabajo de la representante?

0 a 10

NPS Colegio UK

¿Cómo evaluarías la experiencia académica en el colegio?

¿Cómo evaluarías la experiencia académica en el colegio?

0 a 10

## __9\.3 User Stories__

__US 9\.1 — Completar la encuesta NPS__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-9\.1__

Como padre/tutor, quiero completar la encuesta de satisfacción sobre la experiencia de JUK\.

__1\. __Se activa automáticamente a los 3 días del regreso\.

__2\. __Accesible desde el portal y desde un link en email/WhatsApp\.

__3\. __Cada dimensión se evalúa del 0 al 10\. Hay un campo de comentario libre opcional\.

__4\. __Al enviar, el padre ve un mensaje de agradecimiento y el estado cambia a "Completada"\.

__5\. __Una vez enviada, no se puede modificar\.

__US 9\.2 — Recibir recordatorio para la encuesta__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-9\.2__

Como padre/tutor, quiero recibir un recordatorio amable si me olvidé de completar la encuesta\.

__1\. __Si no se completó a los 7 días del regreso, se envía un recordatorio\.

__2\. __Máximo 2 recordatorios\. Si no responde, no se vuelve a insistir\.

__3\. __El recordatorio incluye el nombre del alumno\.

## __9\.4 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

Regreso del alumno \+ 3 días \(encuesta habilitada\)

__Email \+ WhatsApp\*__

Una sola vez

Encuesta pendiente a 7 días del regreso

__Email__

Recordatorio único

Encuesta pendiente a 14 días del regreso

__WhatsApp\*__

Último recordatorio

## __9\.5 Reglas de negocio__

- La encuesta se habilita cuando JUK marca el viaje como "Finalizado" en el sistema interno\.
- Los resultados son visibles para JUK con identificación del alumno\. Son anónimos entre pares\.
- Los comentarios libres son opcionales\.
- Cada alumno genera una respuesta NPS propia\. El NPS del viaje es el promedio de las respuestas NPS de todos los alumnos de ese viaje\.
- El NPS del representante se acumula a partir de las respuestas de todos los alumnos de todos sus viajes\.
- JUK ve los resultados agregados desde el Portal de Gestión Interno\.
- Alumno adulto \(18\+\): el titular de la encuesta es el propio alumno, no un padre/tutor\. El sistema envía la encuesta al email del alumno y adapta el lenguaje de las preguntas al perfil de la cuenta \(primera persona, sin referencias a "familia" o "hijo/a"\)\.

## __9\.6 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿JUK quiere que el alumno también complete una encuesta propia?

__• __¿Los resultados de NPS van a alimentar un dashboard interno? ¿Quién tiene acceso?

__• __¿Los comentarios pueden usarse en materiales de marketing? ¿Se solicita consentimiento explícito?

__▸  CROSS\-INSTANCIA: SOPORTE Y COMUNICACIÓN__

# __Módulo 10 · Soporte y Canal de Comunicación__

## __10\.1 Objetivo__

Proveer un punto de contacto claro con la representante y con JUK en cualquier momento del ciclo del viaje, con canales diferenciados según la urgencia y la instancia\.

## __10\.2 Canales disponibles__

__Canal__

__Descripción__

__Disponibilidad__

Email a la representante

Enlace de email pre\-configurado con asunto automático

Todo el ciclo

WhatsApp de la representante

Link directo a chat \(número gestionado por JUK\)

Durante el viaje principalmente

Mensajería interna del portal

Canal asíncrono \(definido en Módulo 7\)

Durante el viaje

Contacto con JUK \(agencia\)

Email o formulario para consultas administrativas

Pre\-viaje y post\-viaje

## __10\.3 User Stories__

__US 10\.1 — Acceder al contacto de la representante desde cualquier pantalla__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-10\.1__

Como padre/tutor, quiero que el contacto de la representante esté siempre accesible en el portal\.

__1\. __Botón de soporte visible en todas las pantallas\. Sin términos técnicos \("helpdesk", "ticket"\)\.

__2\. __Lleva a pantalla con canales disponibles y accesos directos\.

__3\. __En móvil, el botón de WhatsApp abre directamente la app\.

__US 10\.2 — Ver preguntas frecuentes__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-10\.2__

Como padre/tutor, quiero ver FAQs antes de enviar un mensaje, para resolver dudas más rápido\.

__1\. __FAQs organizadas por tema \(documentación, pagos, durante el viaje\)\.

__2\. __Actualizables por JUK desde el panel interno\.

__3\. __Buscador que filtra en tiempo real\.

__4\. __Si no encuentra respuesta, el formulario de contacto está a un clic\.

## __10\.4 Reglas de negocio__

- El número de WhatsApp y email de la representante son gestionados por JUK\. Al cambiar de representante, JUK actualiza los datos desde el panel interno\.
- El soporte está disponible en todas las instancias\. Los canales disponibles varían \(ej: WhatsApp de la representante, principalmente durante el viaje\)\.
- El formulario de contacto con JUK no es chat en tiempo real\. El SLA de respuesta es definido por JUK\.

## __10\.5 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿El WhatsApp de la representante es su número personal o uno asignado por JUK?

__• __¿JUK quiere definir un SLA de respuesta visible para el padre?

__• __¿Existe un protocolo de emergencia \(número de guardia\) para situaciones críticas durante el viaje?

# __Módulo 11 · Políticas de Acceso Post\-Viaje y Próximas Salidas__

## __11\.1 Objetivo del módulo__

Definir cuánto tiempo tienen los padres para acceder al portal después del viaje, cómo se gestiona el cierre de cuenta, y cómo se capitaliza el período post\-viaje como oportunidad de relación continua con las familias\.

## __11\.2 Análisis de opciones de retención de acceso__

__Política__

__Descripción__

__Riesgos y consideraciones__

__Acceso indefinido__

Sin límite de tiempo mientras exista la cuenta\.

Riesgo operativo alto en migraciones de sistema\. Deuda técnica acumulada\. Sin política de eliminación de datos de menores\.

__Acceso 2 años \(recomendado\)__

Activo 2 años post\-viaje\. Luego se archiva o elimina\.

Margen suficiente para descargar certificado y consultar historial\. Requiere notificación de cierre con anticipación\.

__Acceso 1 año__

Activo 1 año post\-viaje\.

Riesgo moderado: familias que necesiten el certificado después \(ej: trámites universitarios tardíos\) no podrán acceder\.

__Descarga al cerrar__

Antes del cierre, se notifica y se ofrece descarga de todos los documentos en ZIP\.

Altamente recomendado como complemento de cualquier política\. Reduce reclamos y transfiere la custodia al padre\.

__Recomendación del equipo de producto: acceso por 2 años \+ notificación a 60 y 30 días del cierre \+ función de descarga masiva en ZIP\.__

## __11\.3 Riesgos identificados__

__Riesgo__

__Probabilidad__

__Plan de mitigación__

Migración de sistema sin plan de datos históricos

Media

Incluir SLA de exportación de datos en el contrato con el proveedor\.

Padre pierde certificado por no descargarlo antes del cierre

Media\-Alta

Notificaciones a 60 y 30 días\. Función "Descargar todo" en ZIP\. Enviar certificado también por email al publicarlo\.

Datos de menores sin política de eliminación \(riesgo legal\)

Alta

Definir política alineada a Ley 25\.326 \(Argentina\) y potencialmente GDPR \(si hay servidores en UK\)\. Consultar asesoría legal\.

Padre inscribe a otro hijo y tiene cuenta anterior mezclada

Media

El modelo de cuenta debe soportar N alumnos por grupo familiar, cada uno con su propio ciclo de acceso\.

## __11\.4 User Stories__

__US 11\.1 — Recibir aviso de cierre de acceso__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-11\.1__

Como padre/tutor o alumno adulto, quiero recibir un aviso con suficiente anticipación de que mi acceso está por cerrarse, para descargar lo que necesito conservar\.

__1\. __Notificación a 60 días y a 30 días del cierre\.

__2\. __La notificación indica la fecha de cierre y enumera los documentos disponibles\.

__3\. __Incluye botón directo a "Descargar todos mis documentos"\.

__4\. __El tono es amable y práctico, no alarmista\.

__US 11\.2 — Descargar todos los documentos del viaje__

__ID__

__User Story__

__Criterios de Aceptación__

__US\-11\.2__

Como padre/tutor o alumno adulto, quiero poder descargar todos mis documentos del viaje en un solo archivo\.

__1\. __Botón "Descargar todo" genera un ZIP con todos los documentos: certificado, formularios, accommodation letter, historial de pagos\.

__2\. __El ZIP se genera en menos de 60 segundos\.

__3\. __Disponible durante el acceso activo y en los últimos 30 días antes del cierre\.

## __11\.5 Módulo: Próximas Salidas__

__🚧 Fuera de alcance — v1__

JUK no contará con un mecanismo en el portal para publicar salidas futuras a familias en v1\. Esta funcionalidad se evaluará en versiones posteriores\.

## __11\.6 Sistema de notificaciones__

__Evento disparador__

__Canal__

__Frecuencia__

Cierre de acceso al portal en 60 días

__Email__

Una sola vez

Cierre de acceso al portal en 30 días

__Email \+ WhatsApp\*__

Una vez con link a "Descargar todo"

JUK publica nuevas salidas disponibles

__Email \(opt\-in\)__

Una vez por publicación — solo padres que aceptaron

## __11\.7 Reglas de negocio__

- La política de acceso post\-viaje \(duración\) debe definirse antes del desarrollo\. Recomendación: 2 años\.
- Ante cualquier migración de sistema, JUK debe tener un plan de comunicación a los padres con acceso activo\.
- El modelo de cuenta debe soportar múltiples alumnos por grupo familiar para cubrir el caso de familias que inscriben a más de un hijo en diferentes ediciones\.
- El envío de información sobre próximas salidas requiere opt\-in explícito del padre \(buena práctica de marketing\)\.

## __11\.8 Preguntas abiertas__

__❓ Preguntas abiertas para el negocio__

__• __¿Cuánto tiempo desea JUK mantener el acceso activo post\-viaje? \(Recomendación del equipo: 2 años\.\)

__• __¿JUK consultó con asesoría legal la Ley 25\.326 respecto a retención de datos de menores?

__• __¿JUK quiere que las Próximas Salidas sean visibles solo para padres pasados o también para visitantes del sitio público?

# __Apéndice · Matriz Resumen de Módulos__

Visión consolidada de todos los módulos, sus responsables funcionales y los canales de notificación\.

__\#__

__Módulo__

__Instancia__

__Acción padre__

__Email__

__WhatsApp__

__1__

Documentación Requerida

Pre\-viaje

Activa

✅

✅

__2__

Resumen de Documentación

Pre\-viaje

Lectura

✅

❌

__3__

Resumen de Pagos

Pre\-viaje

Lectura

✅

✅

__4__

Requisitos para el Viaje

Pre\-viaje

Activa

✅

✅

__5__

Test de Nivel

Pre\-viaje

⛔ Fuera de alcance v1

—

—

__6__

Itinerario Final

Durante

Lectura

✅

✅

__7__

Diario de Viaje

Durante

Reac/Coment/Msg

✅

✅

__8__

Certificado del Curso

Post\-viaje

Descarga

✅

✅

__9__

Encuesta NPS

Post\-viaje

Activa

✅

✅

__10__

Soporte

Cross

Activa

✅

✅

__11__

Políticas Post\-Viaje y Próximas Salidas

Post\-viaje

Activa

✅

✅

*\(\*\) WhatsApp solo si el padre configuró su número en el perfil\. Email es siempre obligatorio\.*

*JUK · Portal de Familias · PRD v1\.11 · Mayo 2026*

