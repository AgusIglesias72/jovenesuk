__JUK — Jóvenes en UK__

Modelo de Base de Datos y Matriz de Roles y Permisos

PRD v1\.7 — Agente 4 · Mayo 2026

*v1\.7: COLEGIO\_DESTINO nuevo campo tipo\_entrada\_requerida ENUM\(ETA|VISA|Ninguna\) \+ RV\-C1 · bullet C1 en inicialización de pasos · nota de arquitectura Representante vs GL físico en VIAJE\.id\_representante*

*Documento interno — Uso exclusivo del equipo JUK*

# __Tabla de Contenidos__

# __1\. Resumen Ejecutivo__

Este documento define el Modelo de Base de Datos y la Matriz de Roles y Permisos del sistema JUK\. Fue producido por el Agente 4 a partir de los tres PRDs de producto: Portal de Gestión Interno \(v1\.3\), Vista del Representante \(v1\.2\) y Portal de Familias \(v1\.3\)\.

El modelo contempla las tres capas de la plataforma JUK:

- Portal de Gestión Interno: back\-office exclusivo para el equipo JUK y vista diferenciada para Representantes\.
- Vista del Representante: acceso acotado al portal interno para group leaders externos\.
- Portal de Familias: portal separado de autoservicio para padres y tutores\.

El modelo respeta las siguientes decisiones de negocio clave:

- Dos tipos de cuenta separados: CUENTA\_ADMIN \(portal interno\) y CUENTA\_FAMILIAS \(portal familias, DNI como usuario\)\.
- Flujo de pago determinado por el tipo de representante: "Vía agencia" para Independiente e Instituto; "Directo JUK" para Colegio cliente\.
- 10 pasos de inscripción por alumno por viaje, con Paso 9 y Paso 10 condicionales según flags del viaje\.
- NPS con tres dimensiones \(JUK, Representante, Colegio UK\) por alumno por viaje; el puntaje del viaje y del representante son agregados\.

# __2\. Principios de Diseño del Modelo__

1. Separación de contextos de autenticación: CUENTA\_ADMIN y CUENTA\_FAMILIAS son entidades distintas con ciclos de vida y portales propios\.
2. Normalización de pasos de seguimiento: PASO\_INSCRIPCION y PASO\_VIAJE son tablas de detalle, no columnas en VIAJE o ESTUDIANTE, para soportar N pasos con estado independiente\.
3. Multi\-viaje por alumno: la tabla INSCRIPCION\_VIAJE actúa como junction para soportar que un mismo alumno tenga múltiples inscripciones activas en distintos viajes\.
4. Datos sensibles marcados: los campos de facturación \(CUIL/CUIT, razón social, condición fiscal\) del ESTUDIANTE están presentes en el modelo pero la capa de negocio bloquea su exposición al Representante\.
5. Flags de condicionalidad centralizados en VIAJE: paso9\_aplica y paso10\_aplica se calculan al crear/editar el viaje y determinan el estado inicial de los pasos 9 y 10 de cada PASO\_INSCRIPCION\.
6. NPS como entidad propia: NPS\_RESPUESTA es 1:1 con INSCRIPCION\_VIAJE\. Los puntajes de viaje y representante son vistas computadas sobre NPS\_RESPUESTA, no campos almacenados duplicados\.
7. Trazabilidad completa: LOG\_AUDITORIA captura toda acción sobre el sistema\. Cada tabla de estado incluye campos actualizado\_por y fecha\_actualizacion\.

# __3\. Diagrama Entidad\-Relación \(ERD\)__

El siguiente diagrama muestra las entidades principales y sus relaciones\. Las entidades de soporte \(LOG\_AUDITORIA, ACTIVIDAD\_VIAJE, SOLICITUD\_CAMBIO, POLICE\_CHECK\) no se ilustran en el diagrama principal para mantener la legibilidad; sus relaciones se detallan en la sección 5\.

  CUENTA\_ADMIN ─────────────────────── REPRESENTANTE

       │ 1 \(creado\_por\)                   │ 1

       │                                  │

       N                                  N

     VIAJE ──────────────── COLEGIO\_DESTINO

       │ 1                        1 : N

       ├──────────────────────────────────────────────────────────────────

       N  \(INSCRIPCION\_VIAJE: tabla junction\)               

       │                                                     

       ├── id\_inscripcion ── ESTUDIANTE ── CUENTA\_FAMILIAS  

       │           │              1 : 1                      

       │           │                                         

       │           ├──── PASO\_INSCRIPCION \(10 filas / inscripción\)

       │           ├──── CUOTA\_PAGO \(N cuotas / inscripción\)

       │           └──── NPS\_RESPUESTA \(1 por inscripción\)  

       │                                                     

       ├──── PASO\_VIAJE \(5 pasos / viaje\)                   

       ├──── ACTIVIDAD\_VIAJE \(N actividades / viaje\)        

       ├──── SOLICITUD\_CAMBIO \(N solicitudes / viaje\)       

       ├──── POLICE\_CHECK \(N por representante × viaje\)     

       ├──── ENTRADA\_DIARIO \(N entradas diario / viaje\)     

       └──── MENSAJE\_DIARIO \(N mensajes / inscripción\)      

__Leyenda de cardinalidades:__

- 1 : N — Uno a muchos \(ej: un VIAJE tiene muchos PASO\_VIAJE\)
- N : M — Muchos a muchos resuelta mediante tabla junction \(ej: ESTUDIANTE ↔ VIAJE mediante INSCRIPCION\_VIAJE\)
- 1 : 1 — Uno a uno \(ej: ESTUDIANTE ↔ CUENTA\_FAMILIAS; INSCRIPCION\_VIAJE ↔ NPS\_RESPUESTA\)

# __4\. Definición de Entidades__

## __4\.1 CUENTA\_ADMIN__

Portal de acceso único para el equipo JUK \(rol Admin\) y para Representantes externos \(rol Representante\)\. Ambos comparten el mismo formulario de login y la misma expiración de sesión \(8 horas\)\. Un mismo registro no puede tener simultáneamente ambos roles\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_cuenta\_admin__

*UUID \(PK\)*

Identificador único de la cuenta

NOT NULL, generado automáticamente

__email__

*VARCHAR\(255\)*

Email — actúa como nombre de usuario

UNIQUE, NOT NULL

__nombre__

*VARCHAR\(100\)*

Nombre del usuario

NOT NULL

__apellido__

*VARCHAR\(100\)*

Apellido del usuario

NOT NULL

__password\_hash__

*VARCHAR\(255\)*

Hash bcrypt de la contraseña

NOT NULL

__rol__

*ENUM*

Admin | Representante | SuperAdmin

NOT NULL\. Admin: Miembro del equipo operador \(en v1, siempre el equipo JUK\)\. Acceso completo al Portal de Gestión Interno según sub\_rol\_admin\. Representante: Entidad externa que lidera un grupo de alumnos\. Vista acotada\. SuperAdmin: Rol reservado para v2 \(arquitectura multi\-tenant\)\. En v1 no se asigna; si se asigna, equivale a Admin con permisos de gestión de cuentas\. No genera ninguna lógica nueva en v1\.

__sub\_rol\_admin__

*ENUM / NULL*

CEO | Sales | Marketing | Operations — solo si rol = Admin o SuperAdmin

NULLABLE

__es\_super\_admin__

*BOOLEAN*

Puede gestionar cuentas de otros usuarios

Default FALSE

__activo__

*BOOLEAN*

Cuenta habilitada para acceso

Default TRUE

__fecha\_creacion__

*TIMESTAMP*

Alta de la cuenta

NOT NULL

__fecha\_ultimo\_acceso__

*TIMESTAMP*

Fecha y hora del último login exitoso

NULLABLE

__intentos\_fallidos__

*INT*

Contador de intentos de login fallidos

Default 0; resetea al login exitoso

__bloqueado\_hasta__

*TIMESTAMP*

Bloqueo temporal \(5 intentos fallidos → 15 min\)

NULLABLE

__reset\_token__

*VARCHAR\(255\)*

Token para restablecimiento de contraseña

NULLABLE; caduca a las 24 hs

__reset\_token\_expira__

*TIMESTAMP*

Vencimiento del reset token

NULLABLE

## __4\.2 CUENTA\_FAMILIAS__

Cuenta de acceso al Portal de Familias\. Se genera automáticamente al crear el registro del alumno en el sistema\. El envío de credenciales al padre/tutor es una acción separada que el equipo JUK ejecuta cuando lo considera oportuno\. El DNI del alumno es el nombre de usuario\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_cuenta\_familias__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_estudiante__

*UUID \(FK → ESTUDIANTE\)*

Referencia al alumno al que pertenece la cuenta

NOT NULL, UNIQUE \(1:1 con ESTUDIANTE\)

__dni\_alumno__

*VARCHAR\(20\)*

DNI del alumno — actúa como username

NOT NULL; copia desnormalizada de ESTUDIANTE\.dni

__password\_hash__

*VARCHAR\(255\)*

Hash bcrypt de la contraseña temporal asignada por JUK

NOT NULL

__activo__

*BOOLEAN*

La cuenta acepta login

Default FALSE; TRUE al enviar credenciales

__primer\_acceso__

*BOOLEAN*

Debe cambiar contraseña en el primer ingreso

Default TRUE

__fecha\_creacion__

*TIMESTAMP*

Se genera al dar de alta el alumno

NOT NULL, automático

__fecha\_envio\_credenciales__

*TIMESTAMP*

Cuándo JUK envió las credenciales al padre

NULLABLE

__email\_contacto__

*VARCHAR\(255\)*

Email del padre/tutor principal \(o del propio alumno si Alumno\_Adulto\)

NOT NULL

__whatsapp__

*VARCHAR\(30\)*

Número WhatsApp \(opcional, para alertas urgentes\)

NULLABLE

__titular__

*ENUM*

Padre\_Tutor | Alumno\_Adulto

NOT NULL; determinado automáticamente al crear la cuenta: Alumno\_Adulto si el alumno cumple 18 años antes de VIAJE\.fecha\_inicio, Padre\_Tutor en caso contrario\. Determina lenguaje del portal, visibilidad de Pasos 5/8 y destinatario del NPS

## __4\.3 COLEGIO\_DESTINO__

Institución educativa en el extranjero \(principalmente UK\) donde los alumnos estudian durante el viaje\. Gestiona los formularios propios del colegio \(Application Form, Parental Consent\) y sus requisitos específicos\. No confundir con el Colegio cliente argentino, que se representa como atributo de REPRESENTANTE\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_colegio\_destino__

*UUID \(PK\)*

Identificador único

NOT NULL

__nombre__

*VARCHAR\(200\)*

Nombre oficial del colegio

NOT NULL

__pais__

*VARCHAR\(50\)*

País de destino \(UK, Irlanda, EE\.UU\., etc\.\)

NOT NULL

__ciudad__

*VARCHAR\(100\)*

Ciudad

NOT NULL

__direccion__

*VARCHAR\(300\)*

Dirección completa

NULLABLE

__coordenadas\_lat__

*DECIMAL\(9,6\)*

Latitud para mapa interactivo

NULLABLE

__coordenadas\_lon__

*DECIMAL\(9,6\)*

Longitud para mapa interactivo

NULLABLE

__sitio\_web__

*VARCHAR\(255\)*

URL del sitio web

NULLABLE

__contacto\_academico\_nombre__

*VARCHAR\(200\)*

Contacto Académico / Principal — nombre

NOT NULL

__contacto\_academico\_email__

*VARCHAR\(255\)*

Contacto Académico / Principal — email

NOT NULL

__contacto\_academico\_telefono__

*VARCHAR\(50\)*

Contacto Académico / Principal — teléfono

NOT NULL

__contacto\_admin\_nombre__

*VARCHAR\(200\)*

Contacto Administrativo / Documentos — nombre

NOT NULL

__contacto\_admin\_email__

*VARCHAR\(255\)*

Contacto Administrativo / Documentos — email

NOT NULL

__contacto\_admin\_telefono__

*VARCHAR\(50\)*

Contacto Administrativo / Documentos — teléfono

NOT NULL

__contacto\_alojamiento\_nombre__

*VARCHAR\(200\)*

Contacto Alojamientos — nombre

NULLABLE

__contacto\_alojamiento\_email__

*VARCHAR\(255\)*

Contacto Alojamientos — email

NULLABLE

__contacto\_alojamiento\_telefono__

*VARCHAR\(50\)*

Contacto Alojamientos — teléfono

NULLABLE

__contacto\_juniors\_nombre__

*VARCHAR\(200\)*

Contacto Programa / Juniors — nombre

NULLABLE

__contacto\_juniors\_email__

*VARCHAR\(255\)*

Contacto Programa / Juniors — email

NULLABLE

__contacto\_juniors\_telefono__

*VARCHAR\(50\)*

Contacto Programa / Juniors — teléfono

NULLABLE

__url\_application\_form__

*VARCHAR\(500\)*

URL/path del Application Form PDF del colegio

NULLABLE

__fecha\_actualizacion\_app\_form__

*DATE*

Última actualización del Application Form

NULLABLE

__url\_parental\_consent\_menor16__

*VARCHAR\(500\)*

PDF Parental Consent versión < 16 años

NULLABLE

__url\_parental\_consent\_16\_17__

*VARCHAR\(500\)*

PDF Parental Consent versión 16–17 años

NULLABLE

__fecha\_actualizacion\_parental\_consent__

*DATE*

Última actualización del Parental Consent

NULLABLE; alerta si >12 meses

__config\_application\_form__

*ENUM*

Requerido | Opcional | NA

NOT NULL; Default Requerido\. En la operación actual de JUK, todos los colegios lo requieren\. Determina si el Paso A1 \(App Form colegio\) se inicializa en Pendiente o NA\.

__config\_test\_nivel__

*ENUM*

Requerido | Opcional | NA

NOT NULL; Default NA\. Solo Wimbledon School of English en estado Requerido\. Determina si el Paso A2 \(Test de Nivel\) se inicializa en Pendiente o NA\.

__config\_parental\_consent__

*ENUM*

Requerido | Opcional | NA

NOT NULL; Default NA\. Solo Wimbledon School of English en estado Requerido\. Aunque esté en Requerido, el Paso A3 es NA automáticamente si el alumno tiene ≥18 años \(RV\-23 se mantiene\)\. Determina si el Paso A3 \(Parental Consent\) se inicializa en Pendiente o NA\.

__config\_confirmation\_letter__

*ENUM*

Requerido | Opcional | NA

NOT NULL; Default Requerido\.

__config\_visa\_immigration__

*ENUM*

Requerido | Opcional | NA

NOT NULL; Default Requerido\. Afecta la inicialización del Paso C2 \(Immigration Letter\)\. Independiente de tipo\_entrada\_requerida\.

__tipo\_entrada\_requerida__

*ENUM*

ETA | VISA | Ninguna

NOT NULL; Default ETA\. Tipo de documentación de entrada al país requerida para argentinos\. Determina la inicialización del Paso C1: ETA → Pendiente \(aplica a UK\)\. VISA → NA \(gestión de visa fuera del scope de v1; aplica a USA y Canadá\)\. Ninguna → NA \(sin documentación de entrada requerida; aplica a Irlanda para ciudadanos argentinos\)\. Ver RV\-C1\.

__url\_confirmation\_letter__

*VARCHAR\(500\)*

Template o instructivo de Confirmation Letter general del colegio

NULLABLE\. Documento general del colegio, no el individual por alumno\. La letter individual se gestiona en PASO\_INSCRIPCION

__url\_visa\_immigration\_template__

*VARCHAR\(500\)*

Instrucciones generales del colegio para gestión de visado o ETA

NULLABLE\. Distinto de la Immigration Letter individual \(PASO\_INSCRIPCION codigo\_paso = 'C2'\)

__estado__

*ENUM*

Activo | Inactivo | En\_negociacion

NOT NULL

__notas\_internas__

*TEXT*

Observaciones internas

NULLABLE; solo visible para Admin JUK

__fecha\_creacion__

*TIMESTAMP*

Alta en el sistema

NOT NULL

__id\_organizacion__

*UUID / NULLABLE*

Identificador de la organización operadora\. En v1 todos los colegios destino son gestionados por JUK \(NULL\)\. En v2, una organización externa podría gestionar su propio catálogo de colegios destino\.

NULLABLE; en v1 siempre NULL\. Reservado para arquitectura multi\-tenant en v2\. Ver sección 8\.

## __4\.4 REPRESENTANTE__

Group leader externo asignado a uno o más viajes\. Existen tres tipos: Independiente \(persona física\), Instituto \(institución de inglés u otro organismo\) y Colegio\_cliente \(institución educativa argentina como NEA\)\. El tipo determina el flujo de pago del viaje y la aplicabilidad del Paso 9 y Paso 10\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_representante__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_cuenta\_admin__

*UUID \(FK → CUENTA\_ADMIN\) / NULLABLE*

Cuenta de acceso al portal interno

UNIQUE donde NOT NULL; rol = Representante\. NULL para tipo = JUK\_Directo \(singleton sin acceso al portal\)

__nombre__

*VARCHAR\(100\)*

Nombre

NOT NULL

__apellido__

*VARCHAR\(100\)*

Apellido

NOT NULL

__email__

*VARCHAR\(255\)*

Email de contacto \(= username\)

NOT NULL

__telefono__

*VARCHAR\(50\)*

Teléfono de contacto

NULLABLE

__tipo__

*ENUM*

Independiente | Instituto | Colegio\_cliente | JUK\_Directo

NOT NULL\. JUK\_Directo: singleton preexistente, sin cuenta de portal, flujo siempre Directo\_JUK, fee = 0

__nombre\_institucion__

*VARCHAR\(200\)*

Nombre del instituto o colegio cliente \(si aplica\)

NULLABLE; requerido si tipo ≠ Independiente

__cuil\_cuit__

*VARCHAR\(20\)*

Identificación fiscal

NULLABLE

__razon\_social__

*VARCHAR\(200\)*

Razón social

NULLABLE

__condicion\_fiscal__

*VARCHAR\(50\)*

Monotributista, RI, etc\.

NULLABLE

__requiere\_psicofisico__

*BOOLEAN — ⚠️ DEPRECATED*

\[OBSOLETO desde v1\.3\] La condición del Paso 9 es determinada por VIAJE\.tipo\_viaje, no por este campo\. Conservado por compatibilidad histórica; ignorar en lógica nueva\.

Default FALSE; no usar en implementaciones nuevas\. Ver RV\-07

__fee\_representante\_pct__

*DECIMAL\(5,2\)*

Porcentaje de fee del representante \(flujo Vía agencia\)

NULLABLE; solo aplica si tipo ≠ Colegio\_cliente

__activo__

*BOOLEAN*

Cuenta activa en el sistema

Default TRUE

__fecha\_creacion__

*TIMESTAMP*

Alta en el sistema

NOT NULL

__notas\_internas__

*TEXT*

Notas internas

NULLABLE; solo Admin JUK

__id\_organizacion__

*UUID / NULLABLE*

Indica a qué organización operadora pertenece este representante\. NULL = JUK en v1\. En v2, una organización externa podría tener sus propios representantes\.

NULLABLE; en v1 siempre NULL\. Reservado para arquitectura multi\-tenant en v2\. Ver sección 8\.

## __4\.5 VIAJE__

Salida grupal organizada por JUK\. Un viaje tiene un colegio destino, un representante principal y un conjunto de alumnos\. El ciclo de vida del viaje \(estado\) controla qué acciones son posibles\. Los flags flujo\_pago, paso9\_aplica y paso10\_aplica determinan el comportamiento de los pasos de inscripción de todos los alumnos del viaje\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_viaje__

*UUID \(PK\)*

Identificador único

NOT NULL

__nombre__

*VARCHAR\(200\)*

Nombre o código del viaje \(ej: "UK\-ENE\-2027"\)

NOT NULL

__tipo\_viaje__

*ENUM*

Grupal | Individual

NOT NULL; Default Grupal\. Individual = un alumno viajando sin grupo\. Determina reglas de capacidad, estado inicial y lógica de pasos\.

__id\_colegio\_destino__

*UUID \(FK → COLEGIO\_DESTINO\)*

Colegio destino del viaje

NOT NULL

__id\_representante__

*UUID \(FK → REPRESENTANTE\)*

Representante del sistema asignado al viaje — contacto responsable con acceso al portal\. Nota de arquitectura v2: el o los GL que físicamente acompañan al grupo pueden ser la misma persona o personas distintas\. En v1 ambos roles siempre coinciden\. El soporte a múltiples GL físicos independientes del representante del sistema se resolverá en v2\.

NOT NULL

__fecha\_inicio__

*DATE*

Fecha de partida

NOT NULL

__fecha\_fin__

*DATE*

Fecha de regreso

NOT NULL

__num\_group\_leaders__

*INT*

Cantidad de group leaders que viajan

NOT NULL; mínimo 1 para Grupales\. Para Individuales = 0 \(permitido: el alumno viaja sin GL asignado por JUK\)

__capacidad\_maxima__

*INT*

Cupo máximo del viaje

NOT NULL; Grupal: num\_group\_leaders × 12\. Individual: fijo = 1

__estado__

*ENUM*

Inscripcion\_abierta | Confirmado | En\_curso | Finalizado | Cancelado

NOT NULL; Grupales inician en Inscripcion\_abierta\. Individuales se crean directamente en Confirmado \(RV\-04 no aplica\)

__flujo\_pago__

*ENUM*

Via\_agencia | Directo\_JUK

NOT NULL; derivado de REPRESENTANTE\.tipo: Independiente e Instituto → Via\_agencia\. Colegio\_cliente → Via\_agencia\. JUK\_Directo → Directo\_JUK\. Ver RV\-05

__paso10\_aplica__

*BOOLEAN*

Determina si el Paso 10 \(último pago presencial\) aplica al alumno

NOT NULL; TRUE si tipo = Independiente o Instituto\. FALSE si tipo = Colegio\_cliente \(paga vía agencia sin excepción presencial\) o JUK\_Directo\. Calculado al crear el viaje

__paso9\_aplica__

*BOOLEAN*

True si tipo\_viaje = Grupal \(Paso D2 aplica\)\. False si tipo\_viaje = Individual \(Paso D2 = NA\)

NOT NULL; calculado al crear el viaje según tipo\_viaje\. Ver RV\-07

__comision\_agencia\_pct__

*DECIMAL\(5,2\)*

Porcentaje de comisión de la agencia externa \(ej: 6\.0\)

NULLABLE; solo si flujo\_pago = Via\_agencia

__notas\_internas__

*TEXT*

Notas internas

NULLABLE; solo Admin JUK

__fecha\_creacion__

*TIMESTAMP*

Alta en el sistema

NOT NULL

__creado\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Admin JUK que creó el viaje

NOT NULL

__id\_organizacion__

*UUID / NULLABLE*

Identificador de la organización operadora del viaje\. NULL = JUK \(operador principal en v1\)\. En v2, una agencia o colegio externo podría operar el sistema de forma autónoma\.

NULLABLE; en v1 siempre NULL\. Reservado para arquitectura multi\-tenant en v2\. Ver sección 8\.

## __4\.6 ESTUDIANTE__

Alumno participante de un viaje JUK\. El alta se inicia a través del Application Form JUK \(Google Form con integración por webhook\) o manualmente por el equipo\. Al crear el registro se genera automáticamente la CUENTA\_FAMILIAS asociada\. Un alumno puede inscribirse en múltiples viajes\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_estudiante__

*UUID \(PK\)*

Identificador único

NOT NULL

__nombre__

*VARCHAR\(100\)*

Nombre del alumno

NOT NULL

__apellido__

*VARCHAR\(100\)*

Apellido del alumno

NOT NULL

__fecha\_nacimiento__

*DATE*

Fecha de nacimiento

NOT NULL; determina versión de Parental Consent

__dni__

*VARCHAR\(20\)*

DNI argentino

NOT NULL, UNIQUE; se usa como username en Portal Familias

__numero\_pasaporte__

*VARCHAR\(50\)*

Número de pasaporte vigente

NOT NULL

__pais\_pasaporte__

*VARCHAR\(50\)*

País emisor del pasaporte

NOT NULL

__fecha\_vencimiento\_pasaporte__

*DATE*

Fecha de vencimiento del pasaporte

NOT NULL; validado contra fecha\_fin del viaje

__email\_alumno__

*VARCHAR\(255\)*

Email propio del alumno \(opcional\)

NULLABLE

__nombre\_tutor\_1__

*VARCHAR\(200\)*

Nombre del tutor/padre principal

NOT NULL

__email\_tutor\_1__

*VARCHAR\(255\)*

Email del tutor principal

NOT NULL

__telefono\_tutor\_1__

*VARCHAR\(50\)*

Teléfono del tutor principal

NOT NULL

__nombre\_tutor\_2__

*VARCHAR\(200\)*

Nombre del segundo tutor

NULLABLE

__email\_tutor\_2__

*VARCHAR\(255\)*

Email del segundo tutor

NULLABLE

__telefono\_tutor\_2__

*VARCHAR\(50\)*

Teléfono del segundo tutor

NULLABLE

__cuil\_cuit__

*VARCHAR\(20\)*

CUIL/CUIT \(SENSIBLE — solo Admin JUK\)

NULLABLE

__razon\_social__

*VARCHAR\(200\)*

Razón social \(SENSIBLE — solo Admin JUK\)

NULLABLE

__condicion\_fiscal__

*VARCHAR\(50\)*

Condición fiscal \(SENSIBLE — solo Admin JUK\)

NULLABLE

__alergias\_alimentarias__

*TEXT*

Descripción de alergias alimentarias

NULLABLE

__alergias\_ambientales__

*TEXT*

Alergias ambientales

NULLABLE

__alergias\_medicamentos__

*TEXT*

Alergias a medicamentos

NULLABLE

__condiciones\_cronicas__

*TEXT*

Condiciones de salud crónicas relevantes

NULLABLE

__medicacion\_habitual__

*TEXT*

Medicación habitual: nombre, dosis y frecuencia

NULLABLE

__observaciones\_salud__

*TEXT*

Observaciones de salud especiales \(incluye EpiPen, etc\.\)

NULLABLE

__observaciones\_internas__

*TEXT*

Notas internas del equipo JUK

NULLABLE; SOLO Admin JUK

__estado__

*ENUM*

Pre\-inscripto | Activo | Baja | Pausado

NOT NULL; Default Pre\-inscripto\. Ciclo: Google Form → webhook → Pre\-inscripto \(notificación interna\) → Admin asigna a viaje → Activo → Baja o Pausado según corresponda

__origen\_alta__

*ENUM*

Google\_Form | Manual

NOT NULL

__fecha\_alta__

*TIMESTAMP*

Fecha de alta en el sistema

NOT NULL

## __4\.7 INSCRIPCION\_VIAJE__

Tabla junction que resuelve la relación N:M entre ESTUDIANTE y VIAJE\. Cada fila representa la participación de un alumno en un viaje específico\. Al crear una inscripción se generan automáticamente los 10 registros de PASO\_INSCRIPCION y el número de registros de CUOTA\_PAGO definidos para ese viaje\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_inscripcion__

*UUID \(PK\)*

Identificador único de la inscripción

NOT NULL

__id\_estudiante__

*UUID \(FK → ESTUDIANTE\)*

Referencia al alumno

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Referencia al viaje

NOT NULL

__fecha\_inscripcion__

*TIMESTAMP*

Cuándo se asignó el alumno al viaje

NOT NULL

__estado__

*ENUM*

Activo | Baja

NOT NULL; Default Activo

__motivo\_baja__

*TEXT*

Razón de la baja \(si aplica\)

NULLABLE

__fecha\_baja__

*TIMESTAMP*

Fecha efectiva de la baja

NULLABLE

__accommodation\_direccion__

*VARCHAR\(500\)*

Dirección de la casa de familia \(cargada con Accommodation Letter\)

NULLABLE; activa el pin en el mapa

__accommodation\_familia__

*VARCHAR\(200\)*

Nombre de la familia anfitriona

NULLABLE

__accommodation\_coordenadas\_lat__

*DECIMAL\(9,6\)*

Latitud de la dirección de alojamiento

NULLABLE

__accommodation\_coordenadas\_lon__

*DECIMAL\(9,6\)*

Longitud de la dirección de alojamiento

NULLABLE

__url\_certificado__

*VARCHAR\(500\)*

Link al PDF del certificado del curso \(Módulo 8 Portal Familias\)

NULLABLE; NULL hasta que JUK lo carga post\-viaje

__fecha\_carga\_certificado__

*TIMESTAMP*

Cuándo JUK subió el certificado

NULLABLE

__UNIQUE\(id\_estudiante, id\_viaje\)__

*CONSTRAINT*

Un alumno no puede estar inscripto dos veces en el mismo viaje

Integridad referencial

## __4\.8 PASO\_INSCRIPCION__

Registro del estado de cada uno de los 11 pasos \(Paso 0 \+ grupos A–D\) que cada alumno acumula por viaje\. Al crear la inscripción se generan automáticamente 11 filas: el Paso 0 siempre inicia en Completado \(auto\-creado e inmutable\); el resto se inicializa según las reglas del viaje, la configuración del colegio destino y la edad del alumno\. Los pasos de cada grupo son paralelos entre sí excepto C2, que inicia en Bloqueado hasta que B1 esté Completado \(RV\-C2\)\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_paso__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_inscripcion__

*UUID \(FK → INSCRIPCION\_VIAJE\)*

Referencia a la inscripción del alumno

NOT NULL

__codigo\_paso__

*VARCHAR\(3\)*

Código del paso: "0"=App Form JUK · "A1"=App Form colegio · "A2"=Test de Nivel · "A3"=Parental Consent · "B1"=Plan de cuotas · "B2"=Último pago presencial · "C1"=ETA · "C2"=Immigration Letter · "C3"=Accommodation Letter · "D1"=Autorización viaje \(escribano\) · "D2"=Certificado psicofísico

NOT NULL; valores posibles: 0, A1, A2, A3, B1, B2, C1, C2, C3, D1, D2

__grupo__

*VARCHAR\(1\)*

Grupo al que pertenece el paso: "0" · "A"=Inscripción y programa · "B"=Pagos · "C"=Documentación de viaje · "D"=Documentación legal argentina

NOT NULL\. Permite filtrar y agrupar visualmente en el tablero de gestión\.

__estado__

*ENUM*

Pendiente | En\_progreso | Completado | Bloqueado | NA

NOT NULL; Default Pendiente\. Paso 0 siempre Completado\. Paso C2 inicia en Bloqueado\.

__fecha\_limite__

*DATE*

Fecha límite del trámite \(si la hay\)

NULLABLE

__fecha\_completado__

*TIMESTAMP*

Fecha en que se marcó como Completado

NULLABLE

__motivo\_bloqueo__

*TEXT*

Razón del bloqueo \(ej: C2 esperando B1 Completado; ETA rechazado\)

NULLABLE

__url\_documento__

*VARCHAR\(500\)*

Link al documento asociado cargado en el sistema

NULLABLE

__notas\_internas__

*TEXT*

Notas del equipo JUK — NO visibles para el Representante

NULLABLE; solo Admin JUK

__actualizado\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Admin JUK que realizó la última actualización

NULLABLE

__fecha\_actualizacion__

*TIMESTAMP*

Timestamp de la última actualización

NOT NULL; se actualiza en cada cambio

__UNIQUE\(id\_inscripcion, codigo\_paso\)__

*CONSTRAINT*

Un paso de cada código por inscripción

Integridad referencial

__Reglas de inicialización automática de pasos:__

- Paso 0 \(App Form JUK\): se crea automáticamente al dar de alta el alumno\. Estado siempre Completado; inmutable\. Ver RV\-00\.
- Paso A2 \(Test de Nivel\): se inicializa en "NA" si COLEGIO\_DESTINO\.config\_test\_nivel = NA\.
- Paso A3 \(Parental Consent\): se inicializa en "NA" si COLEGIO\_DESTINO\.config\_parental\_consent = NA\. También se inicializa en "NA" si el alumno tiene 18 o más años al inicio del viaje \(RV\-23\)\. Ambas condiciones son independientes: cualquiera de las dos genera NA\.
- Paso B2 \(Último pago presencial\): se inicializa en "NA" si VIAJE\.paso10\_aplica = FALSE \(Colegio\_cliente o JUK\_Directo\)\. Ver RV\-05 y RV\-06\.
- Paso C1 \(ETA\): se inicializa en "Pendiente" si COLEGIO\_DESTINO\.tipo\_entrada\_requerida = ETA\. Se inicializa en "NA" si tipo\_entrada\_requerida = VISA o Ninguna\. Ver RV\-C1\.
- Paso C2 \(Immigration Letter\): se inicializa en "Bloqueado"\. Solo puede activarse cuando el Paso B1 \(Plan de cuotas\) del mismo alumno está en estado Completado\. Ver RV\-C2\.
- Paso D1 \(Autorización viaje — escribano\): se inicializa en "NA" si el alumno tiene 18 o más años al inicio del viaje\. Ver RV\-23\.
- Paso D2 \(Certificado psicofísico\): se inicializa en "NA" si VIAJE\.tipo\_viaje = Individual\. Ver RV\-07\.

## __4\.9 CUOTA\_PAGO__

Registro de cada cuota del plan de pagos de un alumno para un viaje\. Los pagos no son online: JUK los registra manualmente en el portal a partir de la información recibida de la agencia externa \(flujo Vía agencia\) o directamente \(flujo Directo JUK\)\. El Paso 10 es una vista especializada del último CUOTA\_PAGO, no un registro separado\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_cuota__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_inscripcion__

*UUID \(FK → INSCRIPCION\_VIAJE\)*

Referencia a la inscripción

NOT NULL

__numero\_cuota__

*INT*

Número de cuota \(1, 2, 3\.\.\.\)

NOT NULL; secuencial por inscripción

__monto\_usd__

*DECIMAL\(10,2\)*

Monto de la cuota en USD

NOT NULL

__fecha\_vencimiento__

*DATE*

Fecha de vencimiento de la cuota

NOT NULL

__fecha\_pago__

*DATE*

Fecha en que se registró el pago

NULLABLE

__estado__

*ENUM*

Pendiente | Pagado | Vencido | NA

NOT NULL; Default Pendiente

__es\_ultimo\_pago__

*BOOLEAN*

Indica que es la última cuota \(vinculada a Paso 10\)

Default FALSE; solo una por inscripción

__registrado\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Admin JUK que registró el pago

NULLABLE

__notas__

*TEXT*

Observaciones sobre el pago

NULLABLE

__fecha\_actualizacion__

*TIMESTAMP*

Última actualización del registro

NOT NULL

__UNIQUE\(id\_inscripcion, numero\_cuota\)__

*CONSTRAINT*

Número de cuota único por inscripción

Integridad referencial

__UNIQUE\(id\_inscripcion\) WHERE es\_ultimo\_pago = TRUE__

*Partial unique index*

Solo puede existir una cuota marcada como último pago por inscripción

PostgreSQL: partial unique index\. MySQL/MariaDB: trigger o CHECK constraint compuesto\. Ver RV\-22

## __4\.10 NPS\_RESPUESTA__

Encuesta de satisfacción post\-viaje completada por el padre/tutor desde el Portal de Familias\. Tiene tres dimensiones independientes: satisfacción con JUK, con el Representante y con el Colegio UK\. La encuesta se habilita cuando el Admin JUK marca el viaje como Finalizado\. Los puntajes de viaje y de representante son vistas agregadas sobre esta tabla\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_nps__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_inscripcion__

*UUID \(FK → INSCRIPCION\_VIAJE\)*

Referencia a la inscripción del alumno

NOT NULL, UNIQUE \(1:1 con INSCRIPCION\_VIAJE\)

__score\_juk__

*INT / NULLABLE*

Puntuación NPS dimensión JUK \(0–10\)

NULLABLE; NULL hasta que el padre/tutor responde\. Rango válido: 0–10

__score\_representante__

*INT / NULLABLE*

Puntuación NPS dimensión Representante \(0–10\)

NULLABLE; NULL hasta que el padre/tutor responde\. Rango válido: 0–10

__score\_colegio__

*INT / NULLABLE*

Puntuación NPS dimensión Colegio UK \(0–10\)

NULLABLE; NULL hasta que el padre/tutor responde\. Rango válido: 0–10

__comentario\_juk__

*TEXT*

Comentario libre sobre JUK

NULLABLE

__comentario\_representante__

*TEXT*

Comentario libre sobre el Representante

NULLABLE

__comentario\_colegio__

*TEXT*

Comentario libre sobre el Colegio UK

NULLABLE

__fecha\_habilitacion__

*TIMESTAMP*

Cuándo se habilitó la encuesta \(al marcar VIAJE como Finalizado\)

NOT NULL

__fecha\_respuesta__

*TIMESTAMP*

Cuándo el padre respondió la encuesta

NULLABLE; NULL si aún no respondió

__Vistas computadas derivadas de NPS\_RESPUESTA:__

- NPS del viaje: promedio de score\_juk, score\_representante y score\_colegio de todos los alumnos del viaje\.
- NPS del representante: promedio acumulado de score\_representante de todos los viajes en que participó\.
- Ambas métricas son solo lectura en el Portal Interno\. La fuente de datos es siempre el Portal de Familias\.

## __4\.11 PASO\_VIAJE__

Registro del estado de cada uno de los 5 trámites coordinados a nivel de viaje \(no por alumno\)\. Son responsabilidad del equipo JUK y/o del Representante\. Se generan automáticamente al crear el viaje\. Para viajes Individuales, el Paso 5 \(Police checks\) se inicializa en NA \(no hay GL\)\. El Paso 1 \(Pasajes\) aplica pero con semántica diferente: JUK registra los datos del vuelo autogestionado por el alumno\. Ver RV\-24\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_paso\_viaje__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Referencia al viaje

NOT NULL

__numero\_paso__

*INT*

1=Pasajes · 2=Excursiones · 3=Transfers · 4=Tarjeta transporte · 5=Police checks

NOT NULL; 1–5

__estado__

*ENUM*

Pendiente | En\_progreso | Completado | Bloqueado | NA

NOT NULL; Default Pendiente

__fecha\_completado__

*TIMESTAMP*

Fecha de completado

NULLABLE

__notas__

*TEXT*

Observaciones internas

NULLABLE

__actualizado\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Admin JUK que actualizó

NULLABLE

__fecha\_actualizacion__

*TIMESTAMP*

Última actualización

NOT NULL

__UNIQUE\(id\_viaje, numero\_paso\)__

*CONSTRAINT*

Un paso de cada número por viaje

Integridad referencial

## __4\.12 ACTIVIDAD\_VIAJE__

Excursiones y actividades del programa del viaje\. Pueden ser fijas \(estándar, siempre incluidas\) o variables \(opcionales, sujetas a confirmación\)\. El Representante puede proponer actividades variables, pero JUK debe aprobarlas\. Las actividades aprobadas se reflejan automáticamente en el calendario visible por el Representante\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_actividad__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Referencia al viaje

NOT NULL

__nombre__

*VARCHAR\(200\)*

Nombre de la actividad

NOT NULL

__descripcion__

*TEXT*

Descripción detallada

NULLABLE

__tipo__

*ENUM*

Fija | Variable

NOT NULL

__fecha\_actividad__

*DATE*

Fecha de la actividad

NOT NULL

__hora\_inicio__

*TIME*

Hora de inicio

NULLABLE

__duracion\_minutos__

*INT*

Duración estimada en minutos

NULLABLE

__lugar__

*VARCHAR\(200\)*

Lugar de la actividad

NULLABLE

__es\_obligatoria__

*BOOLEAN*

Obligatoria u opcional para los alumnos

Default FALSE

__costo\_adicional\_usd__

*DECIMAL\(10,2\)*

Costo adicional por alumno \(si aplica\)

NULLABLE

__estado\_aprobacion__

*ENUM*

Por\_definir | Propuesta | Aprobada | Rechazada

Default Por\_definir

__motivo\_rechazo__

*TEXT*

Motivo si fue rechazada por JUK

NULLABLE

__propuesta\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Quién la propuso \(Admin JUK o Representante\)

NULLABLE

__fecha\_creacion__

*TIMESTAMP*

Alta en el sistema

NOT NULL

## __4\.13 SOLICITUD\_CAMBIO__

Solicitud enviada por el Representante para modificar el calendario o proponer una actividad especial\. JUK revisa y aprueba o rechaza cada solicitud\. El Representante no puede editar el calendario directamente bajo ninguna circunstancia\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_solicitud__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Referencia al viaje

NOT NULL

__id\_representante__

*UUID \(FK → REPRESENTANTE\)*

Representante que envió la solicitud

NOT NULL

__tipo__

*ENUM*

Cambio\_horario | Actividad\_nueva | Cancelacion | Otro

NOT NULL

__descripcion__

*TEXT*

Descripción libre de la solicitud

NOT NULL

__fechas\_afectadas__

*TEXT*

Fechas involucradas \(JSON array de fechas\)

NULLABLE

__urgencia__

*ENUM*

Urgente | Normal

NOT NULL; Default Normal

__estado__

*ENUM*

Enviada | En\_revision | Aprobada | Rechazada

NOT NULL; Default Enviada

__motivo\_rechazo__

*TEXT*

Motivo del rechazo \(si aplica\)

NULLABLE

__fecha\_envio__

*TIMESTAMP*

Cuándo se envió la solicitud

NOT NULL

__fecha\_resolucion__

*TIMESTAMP*

Cuándo JUK resolvió la solicitud

NULLABLE

__resuelto\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Admin JUK que aprobó/rechazó

NULLABLE

## __4\.14 POLICE\_CHECK__

Control policial de los group leaders asignados a un viaje\. El colegio destino los requiere\. Se gestiona a nivel de viaje por representante; un mismo representante debe tener un police check vigente para cada viaje en el que participa\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_police\_check__

*UUID \(PK\)*

Identificador único

NOT NULL

__id\_representante__

*UUID \(FK → REPRESENTANTE\)*

Referencia al representante/group leader

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Referencia al viaje

NOT NULL

__estado__

*ENUM*

Pendiente | Aprobado | Vencido | Rechazado

NOT NULL; Default Pendiente

__fecha\_emision__

*DATE*

Fecha de emisión del police check

NULLABLE

__fecha\_vencimiento__

*DATE*

Fecha de vencimiento

NULLABLE; alerta si <30 días de vigencia

__notas__

*TEXT*

Observaciones

NULLABLE

__UNIQUE\(id\_representante, id\_viaje\)__

*CONSTRAINT*

Un registro por representante por viaje

Integridad referencial

## __4\.15 LOG\_AUDITORIA__

Registro inmutable de todas las acciones realizadas sobre el sistema\. Cubre accesos, creaciones, modificaciones y borrados lógicos, para cualquiera de los tres tipos de cuenta\. Es de solo lectura para todos los usuarios; solo el sistema escribe en esta tabla\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_log__

*BIGINT \(PK\)*

Identificador autoincremental

NOT NULL; no usar UUID para eficiencia de lectura

__id\_cuenta__

*UUID*

ID de la cuenta que realizó la acción

NOT NULL

__tipo\_cuenta__

*ENUM*

Admin | Representante | Familias

NOT NULL

__accion__

*VARCHAR\(100\)*

Código de la acción \(ej: LOGIN, UPDATE\_PASO, SEND\_CREDENCIALES\)

NOT NULL

__entidad__

*VARCHAR\(50\)*

Nombre de la entidad afectada

NOT NULL

__id\_entidad__

*UUID*

ID del registro afectado

NULLABLE

__ip\_address__

*VARCHAR\(50\)*

IP desde la que se realizó la acción

NULLABLE

__detalles__

*JSONB / TEXT*

Datos adicionales del cambio \(valores antes/después\)

NULLABLE

__fecha\_hora__

*TIMESTAMP*

Timestamp exacto de la acción \(UTC\)

NOT NULL; índice en esta columna

## __4\.16 ENTRADA\_DIARIO__

Contenido publicado por el Representante \(o Admin JUK\) durante el viaje para el Módulo 7 \(Diario de Viaje\) del Portal de Familias\. Puede ser una novedad en texto o una galería de fotos/videos\. Solo los padres del mismo viaje pueden ver las entradas publicadas\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_entrada__

*UUID \(PK\)*

Identificador único de la entrada

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Viaje al que corresponde la entrada

NOT NULL

__fecha__

*DATE*

Fecha del día al que corresponde la entrada

NOT NULL

__titulo__

*VARCHAR\(200\)*

Título opcional de la entrada

NULLABLE

__contenido__

*TEXT*

Texto de la novedad del día

NULLABLE

__urls\_media__

*TEXT*

JSON array de URLs de fotos/videos almacenados en storage externo \(fuera del scope del modelo\)

NULLABLE

__tipo__

*ENUM*

Novedad | Foto\_video

NOT NULL

__publicado__

*BOOLEAN*

TRUE cuando la entrada es visible para los padres

Default FALSE; JUK o Representante lo publica explícitamente

__subido\_por__

*UUID \(FK → CUENTA\_ADMIN\)*

Representante o Admin JUK que creó la entrada

NOT NULL

__fecha\_creacion__

*TIMESTAMP*

Alta en el sistema

NOT NULL

## __4\.17 MENSAJE\_DIARIO__

Canal de mensajes asíncrono entre el padre/tutor de un alumno específico y el Representante del viaje\. Implementa el Módulo 10 \(Soporte\) del Portal de Familias\. No es un chat en tiempo real: cada mensaje es un registro independiente\. El padre escribe sobre su alumno; el Representante responde en el contexto de esa inscripción\.

__Campo / Atributo__

__Tipo de Dato__

__Descripción__

__Restricciones / Notas__

__id\_mensaje__

*UUID \(PK\)*

Identificador único del mensaje

NOT NULL

__id\_viaje__

*UUID \(FK → VIAJE\)*

Viaje al que pertenece el hilo de mensajes

NOT NULL

__id\_inscripcion__

*UUID \(FK → INSCRIPCION\_VIAJE\)*

Inscripción del alumno sobre la que trata el mensaje

NOT NULL; garantiza que el padre ve solo mensajes de su alumno

__remitente\_tipo__

*ENUM*

Padre | Representante

NOT NULL

__remitente\_id__

*UUID*

ID del remitente: id\_cuenta\_familias si Padre; id\_cuenta\_admin si Representante

NOT NULL; tipo determina a qué tabla referenciar

__contenido__

*TEXT*

Cuerpo del mensaje

NOT NULL

__leido__

*BOOLEAN*

TRUE cuando el destinatario vio el mensaje

Default FALSE

__fecha\_envio__

*TIMESTAMP*

Cuándo se envió el mensaje

NOT NULL

# __5\. Relaciones y Cardinalidades__

La siguiente tabla detalla todas las relaciones entre entidades del modelo, su cardinalidad y la regla de integridad referencial asociada\.

__Entidad Origen__

__Entidad Destino__

__Cardinalidad y descripción__

__CUENTA\_ADMIN__

__REPRESENTANTE__

1:1 — Una CUENTA\_ADMIN con rol=Representante corresponde a exactamente un REPRESENTANTE\. FK: REPRESENTANTE\.id\_cuenta\_admin\.

__COLEGIO\_DESTINO__

__VIAJE__

1:N — Un colegio destino puede aparecer en múltiples viajes\. Un viaje tiene exactamente un colegio destino\. FK: VIAJE\.id\_colegio\_destino\.

__REPRESENTANTE__

__VIAJE__

1:N — Un representante puede liderar múltiples viajes\. Un viaje tiene exactamente un representante asignado\. FK: VIAJE\.id\_representante\.

__VIAJE__

__INSCRIPCION\_VIAJE__

1:N — Un viaje tiene múltiples inscripciones \(una por alumno\)\. FK: INSCRIPCION\_VIAJE\.id\_viaje\.

__ESTUDIANTE__

__INSCRIPCION\_VIAJE__

1:N — Un alumno puede tener múltiples inscripciones en distintos viajes\. FK: INSCRIPCION\_VIAJE\.id\_estudiante\.

__ESTUDIANTE__

__CUENTA\_FAMILIAS__

1:1 — Al crear el alumno se genera automáticamente su cuenta de familias\. FK: CUENTA\_FAMILIAS\.id\_estudiante\.

__INSCRIPCION\_VIAJE__

__PASO\_INSCRIPCION__

1:11 — Cada inscripción genera exactamente 11 registros de pasos \(Paso 0 \+ grupos A–D: A1, A2, A3, B1, B2, C1, C2, C3, D1, D2\)\. FK: PASO\_INSCRIPCION\.id\_inscripcion\. UNIQUE\(id\_inscripcion, codigo\_paso\)\.

__INSCRIPCION\_VIAJE__

__CUOTA\_PAGO__

1:N — Cada inscripción tiene N cuotas según el plan definido por JUK\. FK: CUOTA\_PAGO\.id\_inscripcion\.

__INSCRIPCION\_VIAJE__

__NPS\_RESPUESTA__

1:1 — Cada inscripción genera una única respuesta NPS \(habilitada al finalizar el viaje\)\. FK: NPS\_RESPUESTA\.id\_inscripcion\. UNIQUE\.

__VIAJE__

__PASO\_VIAJE__

1:5 — Cada viaje genera exactamente 5 pasos de nivel viaje\. FK: PASO\_VIAJE\.id\_viaje\. UNIQUE\(id\_viaje, numero\_paso\)\.

__VIAJE__

__ACTIVIDAD\_VIAJE__

1:N — Un viaje puede tener múltiples actividades\. FK: ACTIVIDAD\_VIAJE\.id\_viaje\.

__VIAJE__

__SOLICITUD\_CAMBIO__

1:N — Un viaje puede recibir múltiples solicitudes de cambio del Representante\. FK: SOLICITUD\_CAMBIO\.id\_viaje\.

__REPRESENTANTE__

__SOLICITUD\_CAMBIO__

1:N — Un representante puede enviar múltiples solicitudes\. FK: SOLICITUD\_CAMBIO\.id\_representante\.

__REPRESENTANTE × VIAJE__

__POLICE\_CHECK__

N:M resuelta en POLICE\_CHECK — Un representante puede tener un police check por cada viaje asignado\. UNIQUE\(id\_representante, id\_viaje\)\.

__VIAJE__

__ENTRADA\_DIARIO__

1:N — Un viaje puede tener múltiples entradas de diario\. FK: ENTRADA\_DIARIO\.id\_viaje\.

__CUENTA\_ADMIN__

__ENTRADA\_DIARIO__

FK de autoría — ENTRADA\_DIARIO\.subido\_por referencia al Representante o Admin JUK que cargó el contenido\.

__VIAJE__

__MENSAJE\_DIARIO__

1:N — Un viaje puede tener múltiples mensajes\. FK: MENSAJE\_DIARIO\.id\_viaje\.

__INSCRIPCION\_VIAJE__

__MENSAJE\_DIARIO__

1:N — Una inscripción puede tener múltiples mensajes entre el padre y el Representante\. FK: MENSAJE\_DIARIO\.id\_inscripcion\.

__CUENTA\_ADMIN__

__VIAJE__

FK de trazabilidad — VIAJE\.creado\_por registra qué Admin JUK creó el viaje\.

__CUENTA\_ADMIN__

__PASO\_INSCRIPCION__

FK de trazabilidad — PASO\_INSCRIPCION\.actualizado\_por registra el último Admin JUK que modificó el paso\.

__CUENTA\_ADMIN__

__CUOTA\_PAGO__

FK de trazabilidad — CUOTA\_PAGO\.registrado\_por registra quién registró el pago\.

# __6\. Reglas de Validación Críticas__

__Código__

__Nombre__

__Descripción__

__RV\-00__

__Paso 0 — creación automática e inmutabilidad__

El Paso 0 \(codigo\_paso = '0', Application Form JUK\) se crea automáticamente al dar de alta el alumno, ya sea vía webhook del Google Form \(ESTUDIANTE\.origen\_alta = Google\_Form\) o en forma manual \(origen\_alta = Manual\)\. Su estado se inicializa en Completado y no puede modificarse\. Es el único paso que no puede retroceder de estado ni ser marcado como NA o Bloqueado\. Registra la fecha de primera interacción del alumno con JUK\.

__RV\-01__

__Validación de pasaporte — viajes a UK__

El pasaporte del alumno debe ser válido durante toda la estadía\. Regla: ESTUDIANTE\.fecha\_vencimiento\_pasaporte ≥ VIAJE\.fecha\_fin\. UK NO exige los 6 meses adicionales\. El sistema valida esto al asignar el alumno y al editar fechas del viaje\. Genera alerta CRÍTICA si el pasaporte vence antes del fin del viaje\.

__RV\-02__

__Validación de pasaporte — otros países__

Para viajes fuera de UK: alerta si ESTUDIANTE\.fecha\_vencimiento\_pasaporte < \(VIAJE\.fecha\_fin \+ 6 meses\)\. Configurable por país\.

__RV\-03__

__Capacidad máxima del viaje__

Para viajes Grupales: VIAJE\.capacidad\_maxima = VIAJE\.num\_group\_leaders × 12; mínimo 1 GL requerido\. Para viajes Individuales: capacidad\_maxima = 1 y num\_group\_leaders = 0 \(hardcodeado; no se calcula\)\. Si se modifica num\_group\_leaders en un viaje Grupal, se recalcula el tope y se valida que el total de alumnos activos no lo supere\.

__RV\-04__

__Estado Confirmado automático__

Aplica SOLO a viajes Grupales\. Cuando las inscripciones activas alcanzan 5, el estado pasa automáticamente de "Inscripcion\_abierta" a "Confirmado"\. El Admin JUK puede confirmarlo manualmente antes\. Los viajes Individuales se crean directamente en estado "Confirmado"; esta regla no aplica\.

__RV\-05__

__Flujo de pago determinado por tipo de representante__

Tres casos: \(1\) REPRESENTANTE\.tipo ∈ \{Independiente, Instituto\} → flujo\_pago = Via\_agencia, paso10\_aplica = TRUE \(último pago presencial aplica\)\. \(2\) REPRESENTANTE\.tipo = Colegio\_cliente → flujo\_pago = Via\_agencia, paso10\_aplica = FALSE \(todos los pagos van por agencia sin excepción presencial; Paso 10 = NA\)\. \(3\) REPRESENTANTE\.tipo = JUK\_Directo → flujo\_pago = Directo\_JUK, paso10\_aplica = FALSE \(sin agencia externa; representante sin CUENTA\_ADMIN\)\. El campo flujo\_pago no es editable manualmente; se calcula al crear el viaje y al reasignar el representante\.

__RV\-06__

__Paso B2 NA automático en flujo Directo JUK__

Cuando VIAJE\.paso10\_aplica = FALSE, todos los PASO\_INSCRIPCION con codigo\_paso = 'B2' de ese viaje se inicializan y mantienen en estado NA\. No puede cambiarse manualmente a otro estado mientras el flag sea FALSE\.

__RV\-07__

__Paso D2 NA automático en viajes Individuales__

VIAJE\.paso9\_aplica = TRUE si VIAJE\.tipo\_viaje = Grupal → PASO\_INSCRIPCION codigo\_paso = 'D2' inicia en Pendiente\. VIAJE\.paso9\_aplica = FALSE si VIAJE\.tipo\_viaje = Individual → codigo\_paso = 'D2' inicia en NA\. El certificado psicofísico aplica a todos los viajes grupales \(con group leader\), independientemente del tipo de representante\. Los viajes individuales no lo requieren\. REPRESENTANTE\.requiere\_psicofisico queda OBSOLETO y no debe usarse en lógica nueva\. Ver también C2 de v1\.3\.

__RV\-08__

__Paso B2 es vista del último CUOTA\_PAGO__

PASO\_INSCRIPCION codigo\_paso='B2' \(Último pago presencial\) no es un pago adicional\. Al confirmar el Paso B2 se actualiza automáticamente el CUOTA\_PAGO marcado con es\_ultimo\_pago=TRUE\. No debe existir un registro de pago duplicado\.

__RV\-09__

__Immigration Letter \(C2\) depende de Plan de cuotas \(B1\)__

El PASO\_INSCRIPCION codigo\_paso='C2' \(Immigration Letter\) se inicializa en estado Bloqueado y no puede pasar a "En\_progreso" o "Completado" hasta que el PASO\_INSCRIPCION codigo\_paso='B1' \(Plan de cuotas\) de la misma inscripción esté en estado Completado\. El sistema bloquea el cambio de estado\. Ver también RV\-C2\.

__RV\-C1__

__Inicialización de Paso C1 \(ETA\) según tipo\_entrada\_requerida__

PASO\_INSCRIPCION codigo\_paso='C1' \(ETA\) se inicializa en estado Pendiente si COLEGIO\_DESTINO\.tipo\_entrada\_requerida = 'ETA'\. Se inicializa en NA si tipo\_entrada\_requerida = 'VISA' \(gestión de visa fuera del scope de v1; aplica a USA y Canadá\) o 'Ninguna' \(sin documentación de entrada requerida; aplica a Irlanda para ciudadanos argentinos\)\. Este campo es independiente de config\_visa\_immigration, que rige la Immigration Letter \(C2\)\.

__RV\-C2__

__Dependencia formal C2 → B1__

El paso C2 \(Immigration Letter, codigo\_paso='C2'\) se inicializa siempre en estado Bloqueado\. El sistema solo permite cambiar su estado a Pendiente, En\_progreso o Completado cuando el paso B1 \(Plan de cuotas, codigo\_paso='B1'\) de la misma inscripción está en estado Completado\. Si B1 retrocede de estado \(por corrección manual\), C2 vuelve automáticamente a Bloqueado\. Esta dependencia es la única relación de orden obligatorio entre pasos del mismo alumno; todos los demás pasos dentro de su grupo son paralelos\.

__RV\-10__

__Dependencia Paso 3 \(Transfers\) de Paso 1 \(Pasajes\) en PASO\_VIAJE__

PASO\_VIAJE numero\_paso=3 \(Transfers\) no puede inicializarse hasta que PASO\_VIAJE numero\_paso=1 \(Pasajes\) esté al menos en "Confirmado"\.

__RV\-11__

__Versión de Parental Consent determinada al descargar__

La versión del Parental Consent \(< 16 años vs\. 16–17 años\) se determina según la edad del alumno en la fecha de descarga y no se recalcula retroactivamente\. El sistema almacena la versión descargada en el log\.

__RV\-12__

__CUENTA\_FAMILIAS se crea al dar de alta el alumno__

Al insertar un registro en ESTUDIANTE, el sistema genera automáticamente la CUENTA\_FAMILIAS con activo=FALSE\. El envío de credenciales es una acción manual separada del Admin JUK\.

__RV\-13__

__Credenciales del Representante se activan al asignarlo al viaje__

Al asignar un REPRESENTANTE a un VIAJE \(crear el viaje con ese representante\), si no existe CUENTA\_ADMIN activa, el sistema crea las credenciales y envía email de bienvenida\. Si ya existe, se extiende el acceso al nuevo viaje\.

__RV\-14__

__Desactivación automática post\-viaje del Representante__

30 días después de VIAJE\.fecha\_fin, si el viaje está en estado Finalizado, la CUENTA\_ADMIN del representante pasa a activo=FALSE automáticamente \(excepto que tenga otros viajes activos asignados\)\.

__RV\-15__

__NPS habilitado solo tras Finalizado__

NPS\_RESPUESTA\.fecha\_habilitacion se establece cuando VIAJE\.estado pasa a "Finalizado"\. Antes de ese momento el Portal de Familias no muestra el módulo de encuesta\.

__RV\-16__

__Un alumno no puede estar en el mismo viaje dos veces__

CONSTRAINT UNIQUE\(id\_estudiante, id\_viaje\) en INSCRIPCION\_VIAJE\. Si se da de baja a un alumno y se lo quiere reinscribir, debe usarse el mismo registro con estado reactivado, no crear uno nuevo\.

__RV\-17__

__Alerta pasaporte — vigencia mínima de 6 meses desde inicio \(no\-UK\)__

Para viajes fuera de UK: alerta alta cuando fecha\_vencimiento\_pasaporte < \(VIAJE\.fecha\_inicio \+ 6 meses\)\. Esta es la regla operativa real de JUK: garantizar que el pasaporte tenga al menos 6 meses de vigencia desde el inicio del programa\. Ejemplo: si el viaje inicia el 1 de julio de 2027, el pasaporte debe vencer después del 1 de enero de 2028\. Es más conservadora que la regla anterior y se alinea con los criterios reales de verificación\. Alerta crítica cuando vence antes del fin del viaje \(aplica en paralelo con RV\-01\)\.

__RV\-18__

__Mora mayor a 7 días__

Si una CUOTA\_PAGO tiene estado Pendiente y fecha\_vencimiento < TODAY \- 7 días, se genera alerta crítica en el dashboard y se envía email a info@jovenesenuk\.com\.

__RV\-19__

__Edición de fechas del viaje desencadena revalidación de pasaportes__

Si se editan VIAJE\.fecha\_inicio o VIAJE\.fecha\_fin y el viaje está en Inscripcion\_abierta o posterior, el sistema revalida RV\-01 para todos los alumnos activos del viaje y actualiza alertas\.

__RV\-20__

__Datos de facturación inaccesibles para Representante__

Los campos cuil\_cuit, razon\_social y condicion\_fiscal del ESTUDIANTE no deben exponerse en ningún endpoint, vista o exportación accesible por una cuenta con rol=Representante\.

__RV\-21__

__NPS\_RESPUESTA: scores NULLABLE en DB, inmutables tras respuesta__

Los campos score\_juk, score\_representante y score\_colegio son NULLABLE en la base de datos\. El registro se crea automáticamente \(con scores NULL\) cuando VIAJE\.estado pasa a "Finalizado"\. La capa de negocio requiere que los tres scores tengan valor antes de persistir la respuesta del padre\. Una vez que fecha\_respuesta está seteada \(NOT NULL\), el registro es inmutable: no se pueden modificar ni los scores ni los comentarios\.

__RV\-22__

__CUOTA\_PAGO: unicidad de es\_ultimo\_pago por inscripción__

Solo puede existir un registro CUOTA\_PAGO con es\_ultimo\_pago = TRUE por cada id\_inscripcion\. Implementar como partial unique index en PostgreSQL \(UNIQUE\(id\_inscripcion\) WHERE es\_ultimo\_pago = TRUE\)\. En MySQL/MariaDB, implementar mediante trigger o CHECK constraint compuesto\. El sistema debe validar esta condición antes de cualquier INSERT o UPDATE sobre el campo es\_ultimo\_pago\.

__RV\-23__

__Pasos NA por mayoría de edad \(A3 y D1\)__

Para los PASO\_INSCRIPCION con codigo\_paso ∈ \{'A3', 'D1'\}: si \(VIAJE\.fecha\_inicio − ESTUDIANTE\.fecha\_nacimiento\) ≥ 18 años, ambos pasos se inicializan en NA\. El Parental Consent \(A3\) y la Autorización ante escribano \(D1\) no aplican a alumnos mayores de edad\. La verificación se realiza al crear la inscripción; no se recalcula automáticamente si las fechas del viaje cambian posteriormente\. Si las fechas se editan, la regla debe ejecutarse nuevamente de forma explícita\.

__RV\-24__

__PASO\_VIAJE para viajes Individuales__

En viajes con tipo\_viaje = Individual: \(1\) PASO\_VIAJE numero\_paso = 5 \(Police checks\) se inicializa en NA, ya que no hay group leaders asignados al viaje\. \(2\) PASO\_VIAJE numero\_paso = 1 \(Pasajes\) aplica con semántica diferente: JUK registra los datos del vuelo autogestionado por el alumno en lugar de coordinar la compra grupal con la agencia de viajes\.

# __7\. Matriz de Roles y Permisos__

La matriz cubre los tres roles del sistema\. Los permisos se definen a nivel de módulo y acción\. La capa de negocio \(backend\) es responsable de hacerlos cumplir; el modelo de datos provee los campos necesarios para la segregación\.

__Símbolo__

__Significado__

__Símbolo__

__Significado__

__Símbolo__

__Significado__

__✅ Completo__

Acceso completo de lectura y escritura

__👁 Solo lectura__

Solo puede ver, no modificar

__🚫 Sin acceso__

Denegado

__⚠️ Limitado__

Acceso parcial según reglas específicas \(ver Notas\)

__✅ Requiere__

Puede realizar la acción con condiciones

__Módulo__

__Acción__

__Admin JUK__

__Representante__

__Padre / Tutor__

__Notas__

__Autenticación__

Login al portal interno

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Familias usa portal separado*

Login al Portal de Familias

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

*DNI como username*

Restablecer contraseña propia

__✅ Completo__

__✅ Completo__

__✅ Completo__

Gestionar cuentas de otros usuarios

__⚠️ Limitado__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Solo super\-admin JUK*

Reset contraseña de Representante

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Desde ABM de Viajes*

Cerrar sesión

__✅ Completo__

__✅ Completo__

__✅ Completo__

__Dashboard JUK__

Ver alertas críticas y altas

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver viajes próximos \(90 días\)

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver alumnos con acción urgente

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver métricas del año en curso

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver NPS agregados post\-viaje

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Solo lectura; fuente: Portal Familias*

Ver indicador de viajes en riesgo

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*< 5 alumnos*

__Colegios Destino__

Ver lista de colegios destino

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver detalle de un colegio

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Crear / editar colegio

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Desactivar colegio

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Descargar Application Form / Parental Consent

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

__Viajes__

Ver lista de viajes

__✅ Completo__

__⚠️ Limitado__

__🚫 Sin acceso__

*Rep\.: solo sus viajes asignados*

Crear / editar viaje

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Cambiar estado del viaje

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver detalle del viaje

__✅ Completo__

__⚠️ Limitado__

__🚫 Sin acceso__

*Rep\.: solo su viaje activo*

Ver calendario y actividades

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: su viaje*

Aprobar / rechazar actividades variables

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Solicitar cambio en calendario

__🚫 Sin acceso__

__✅ Completo__

__🚫 Sin acceso__

*Solo el Representante propone*

Ver solicitudes de cambio

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: sus propias solicitudes*

Ver info de transfer

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: su viaje*

Descargar itinerario PDF

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

__Pasos de Viaje \(M7\)__

Ver estado de los 5 pasos

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Actualizar estado de pasos

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

__Estudiantes__

Ver lista de alumnos

__✅ Completo__

__⚠️ Limitado__

__🚫 Sin acceso__

*Rep\.: solo alumnos de su viaje*

Crear / editar datos del alumno

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver datos personales y de contacto

__✅ Completo__

__⚠️ Limitado__

__🚫 Sin acceso__

*Rep\.: sin datos de facturación*

Ver datos de facturación \(CUIL/CUIT, etc\.\)

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*NUNCA accesible para Representante*

Ver observaciones internas del equipo JUK

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Ver datos de salud y alergias

__✅ Completo__

__⚠️ Limitado__

__🚫 Sin acceso__

*Rep\.: solo alumnos de su viaje*

Generar tarjeta de emergencia del alumno

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: alumnos de su viaje*

Descargar resumen de salud del grupo

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: su grupo; con leyenda CONFIDENCIAL*

Enviar credenciales Portal Familias

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Acción manual separada del alta*

__Pasos de Inscripción \(M6\)__

Ver estado de los 10 pasos por alumno

__✅ Completo__

__✅ Completo__

__⚠️ Limitado__

*Familias: solo estado general*

Actualizar estado de un paso

__✅ Completo__

__🚫 Sin acceso__

__⚠️ Limitado__

*Familias: solo ETA \(autoreporte\)*

Ver motivo de bloqueo de un paso

__✅ Completo__

__✅ Completo__

__⚠️ Limitado__

*Familias: según visibilidad configurada*

Ver notas internas de un paso

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Enviar email a familia sobre un paso

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: con texto predeterminado editable*

Enviar email masivo a todas las familias con paso pendiente

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

Activar alertas automáticas de anomalías

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

*Rep\.: configura para su grupo*

__Pagos__

Ver detalle de cuotas y vencimientos

__✅ Completo__

__🚫 Sin acceso__

__✅ Completo__

*Familias: solo su alumno*

Registrar pago de una cuota

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Confirmar Paso 10 \(último pago presencial\)

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Solo flujo Vía agencia*

Ver alumnos en mora

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

__Mapa de ubicaciones__

Ver mapa con pins de alumnos y colegio

__✅ Completo__

__✅ Completo__

__⚠️ Limitado__

*Familias: solo dirección de su alumno*

Exportar ubicaciones del grupo \(PDF/Excel\)

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

Ver ruta de transporte público por alumno

__✅ Completo__

__✅ Completo__

__🚫 Sin acceso__

__Portal de Familias__

Ver panel de documentación

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Completar Application Form JUK

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Descargar y subir Parental Consent

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Descargar Application Form del Colegio

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Subir Application Form del Colegio completado

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Reportar estado del ETA \(En\_procesamiento / Aprobado / Rechazado\)

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

*Autoreporte; JUK puede corregir*

Ver Accommodation Letter y mapa casa/colegio

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

*Solo cuando JUK la cargó*

Ver itinerario final del viaje

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Ver diario de viaje y fotos del grupo

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Descargar certificado del curso

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

Completar encuesta NPS post\-viaje

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

*Solo tras viaje Finalizado*

Enviar consulta a JUK vía formulario de contacto

__🚫 Sin acceso__

__🚫 Sin acceso__

__✅ Completo__

__Credenciales y Cuentas__

Crear CUENTA\_FAMILIAS \(automático al crear alumno\)

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Enviar credenciales al padre \(acción manual\)

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Desde perfil del alumno*

Crear CUENTA\_ADMIN para nuevo Admin JUK

__⚠️ Limitado__

__🚫 Sin acceso__

__🚫 Sin acceso__

*Solo super\-admin*

Reactivar cuenta de Representante

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

__Log de Auditoría__

Ver log de auditoría

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

Filtrar/exportar log

__✅ Completo__

__🚫 Sin acceso__

__🚫 Sin acceso__

# __8\. Nota de Arquitectura — Multi\-tenancy \(v2\)__

Los campos id\_organizacion en VIAJE, REPRESENTANTE y COLEGIO\_DESTINO son NULLABLE en v1 y siempre NULL \(= JUK como operador único\)\. En v2, el sistema podrá ser operado por organizaciones externas \(colegios, agencias\) de forma autónoma\. El campo id\_organizacion actúa como clave de tenant: un filtro WHERE id\_organizacion = ? en las queries principales será suficiente para aislar los datos por organización sin rediseñar el esquema\.

Adicionalmente, el rol SuperAdmin en CUENTA\_ADMIN\.rol está reservado para v2\. En v1 no se asigna a ningún usuario; si eventualmente se asigna, equivale a Admin con permisos de gestión de cuentas de su organización\. No genera lógica nueva en v1\.

Estos campos y valores de ENUM fueron incluidos en v1 porque su costo de incorporación posterior \(migración de esquema, backfill de datos, actualización de índices en tablas con alto volumen\) es significativamente mayor que su costo de inclusión temprana, que es nulo en términos de lógica de negocio\.

# __9\. Glosario__

__Término__

__Definición__

__Admin JUK__

Miembro del equipo operativo de JUK \(María, Felix, Delfina, Tomas\)\. Acceso completo al Portal de Gestión Interno\.

__Colegio cliente__

Institución educativa argentina \(ej: NEA\) que actúa como tipo de Representante\. Flujo de pago: Vía agencia SIN excepción presencial — todos los pagos, incluido el último, van por la agencia externa\. Paso 10 = NA \(no hay pago presencial con JUK\)\. No confundir con JUK\_Directo: el flujo Directo\_JUK es exclusivo de ese tipo\.

__Colegio destino__

Institución educativa en el extranjero donde los alumnos estudian durante el viaje\. Se gestiona en el ABM de Colegios Destino\.

__CUENTA\_ADMIN__

Cuenta de acceso al Portal Interno\. Compartida por Admins JUK y Representantes, con vistas diferenciadas según rol\.

__CUENTA\_FAMILIAS__

Cuenta de acceso al Portal de Familias\. Un alumno = una cuenta\. Username = DNI del alumno\.

__Directo\_JUK__

Flujo de pago donde todas las cuotas van directamente a JUK, sin agencia externa\. Aplica a viajes con representante de tipo Colegio\_cliente\.

__ETA__

Electronic Travel Authorisation\. Documentación requerida para ingresar al Reino Unido\. El alumno la tramita externamente vía app del gobierno UK\.

__Flujo Vía agencia__

Flujo de pago donde las cuotas pasan por una agencia externa\. El último pago se hace en forma presencial para evitar la comisión del 6%\.

__Group leader__

Denominación operativa del Representante cuando viaja con el grupo\.

__Immigration Letter__

Carta del colegio destino que acredita la inscripción del alumno\. Solo se tramita una vez completados todos los pagos\.

__Instituto__

Tipo de representante: institución de inglés u otro organismo que agrupa alumnos\. Flujo Vía agencia\.

__Independiente__

Tipo de representante: persona física que trae alumnos a JUK de forma individual\. Flujo Vía agencia\.

__INSCRIPCION\_VIAJE__

Tabla junction que registra la participación de un alumno en un viaje\. Es el eje central del modelo operativo\.

__NPS__

Net Promoter Score\. Métrica de satisfacción \(0–10\) capturada post\-viaje en tres dimensiones: JUK, Representante y Colegio UK\.

__Parental Consent__

Documento del colegio destino firmado por los tutores\. Existe en dos versiones: < 16 años y 16–17 años\.

__Paso\_inscripcion__

Uno de los 11 pasos del tablero individual de un alumno por viaje \(Paso 0 \+ grupos A–D\): 0=App Form JUK, A1=App Form Colegio, A2=Test de Nivel, A3=Parental Consent, B1=Plan de Cuotas, B2=Último Pago Presencial, C1=ETA, C2=Immigration Letter, C3=Accommodation Letter, D1=Autorización Escribano, D2=Psicofísico\. Los pasos de cada grupo son paralelos entre sí, excepto C2 que depende de B1\.

__Paso\_viaje__

Uno de los 5 trámites coordinados a nivel de viaje por el equipo JUK\.

__Police check__

Control policial requerido por el colegio destino para los group leaders\.

__Psicofísico \(Paso D2\)__

Certificado de aptitud física y psicológica requerido para la participación en un viaje grupal\. Corresponde al PASO\_INSCRIPCION con codigo\_paso = 'D2', perteneciente al Grupo D \(Documentación legal argentina\)\. Aplica a todos los viajes de tipo Grupal \(VIAJE\.tipo\_viaje = Grupal\), independientemente del tipo de representante\. No aplica a viajes de tipo Individual \(VIAJE\.paso9\_aplica = FALSE\)\. La condición ya no depende del campo REPRESENTANTE\.requiere\_psicofisico, que está DEPRECADO desde v1\.3\.

__Representante__

Entidad externa a JUK que lidera un grupo de alumnos\. Accede al portal con vista acotada\.

__Super\-admin__

Admin JUK con permiso adicional para gestionar cuentas de usuario del sistema\.

__ENTRADA\_DIARIO__

Contenido \(novedad de texto o galería de fotos/videos\) publicado por el Representante o JUK durante el viaje en el Módulo 7 \(Diario de Viaje\) del Portal de Familias\.

__MENSAJE\_DIARIO__

Mensaje del canal asíncrono entre el padre/tutor y el Representante, referenciado a la inscripción de un alumno específico\.

__Pre\-inscripto__

Estado inicial del ESTUDIANTE al ingresar por webhook del Google Form\. El Admin JUK lo revisa y lo pasa a Activo al asignarlo a un viaje\.

__url\_certificado__

Campo en INSCRIPCION\_VIAJE que almacena el link al PDF del certificado del curso subido por JUK post\-viaje \(Módulo 8 Portal Familias\)\.

__tipo\_viaje__

Campo en VIAJE que distingue viajes Grupales \(un grupo de alumnos con GL\) de viajes Individuales \(un alumno solo, sin GL, que se gestiona en forma autónoma\)\.

__JUK\_Directo__

Tipo de representante singleton\. Representa a JUK gestionando directamente un viaje sin intermediario externo\. Sin cuenta de portal\. Flujo de pago: Directo\_JUK \(exclusivo de este tipo desde v1\.3\)\. Paso 10 = NA\. fee\_representante\_pct = 0\.

__Alumno\_Adulto__

Valor del campo CUENTA\_FAMILIAS\.titular cuando el alumno cumple 18 años antes del inicio del viaje\. Modifica el lenguaje del Portal de Familias y marca los Pasos 5 y 8 como NA\.

__Padre\_Tutor__

Valor del campo CUENTA\_FAMILIAS\.titular cuando el alumno es menor al inicio del viaje\. Es el valor por defecto\.

*— JUK · PRD Modelo de Datos y Permisos · v1\.7 · Agente 4 · Mayo 2026 —*

