# 04 · Portal de Familias — Spec funcional

> **Fuente:** PRD Portal de Familias **v1.11** (fechado mayo 2026, incorporado al repo en junio 2026).
> Raw completo en [`fuentes/portal-familias-v1.11.md`](fuentes/portal-familias-v1.11.md).
>
> **Estado: NO construido.** Esta es la spec objetivo del portal de cara a las familias. Hoy solo existe
> el portal interno (admin); el rol `familia` ya está modelado en `users` pero sin portal detrás.

---

## Índice

1. [Contexto y propósito](#1-contexto-y-propósito)
2. [Roles, perfiles y modelo de cuenta](#2-roles-perfiles-y-modelo-de-cuenta)
3. [Principios de diseño y canales de notificación](#3-principios-de-diseño-y-canales-de-notificación)
4. [Estructura general (instancias y módulos)](#4-estructura-general-instancias-y-módulos)
5. [Módulo 1 · Documentación Requerida](#módulo-1--documentación-requerida)
6. [Módulo 2 · Resumen de Documentación](#módulo-2--resumen-de-documentación-ficha-del-alumno)
7. [Módulo 3 · Resumen de Pagos](#módulo-3--resumen-de-pagos)
8. [Módulo 4 · Requisitos para el Viaje](#módulo-4--requisitos-para-el-viaje)
9. [Módulo 5 · Test de Nivel](#módulo-5--test-de-nivel--fuera-de-alcance-v1)
10. [Módulo 6 · Itinerario Final](#módulo-6--itinerario-final)
11. [Módulo 7 · Diario de Viaje](#módulo-7--itinerario-diario--diario-de-viaje)
12. [Módulo 8 · Certificado del Curso](#módulo-8--certificado-del-curso)
13. [Módulo 9 · Encuesta NPS](#módulo-9--encuesta-de-satisfacción-nps)
14. [Módulo 10 · Soporte y Comunicación](#módulo-10--soporte-y-canal-de-comunicación)
15. [Módulo 11 · Acceso Post-Viaje](#módulo-11--políticas-de-acceso-post-viaje-y-próximas-salidas)
16. [Matriz resumen de módulos](#matriz-resumen-de-módulos)
17. [Puntos de contacto con el Portal Interno](#puntos-de-contacto-con-el-portal-interno)
18. [Implicancias para el código actual](#implicancias-para-el-código-actual)

---

## 1. Contexto y propósito

Canal digital de autoservicio exclusivo para padres/tutores (y alumnos adultos). Centraliza
comunicación, documentación, seguimiento del viaje y post-experiencia en un único acceso, reduciendo
la carga operativa de JUK. Cubre el ciclo completo: pre-viaje, durante el viaje y post-viaje.

## 2. Roles, perfiles y modelo de cuenta

### 2.1 Dos perfiles de titular

Determinados **automáticamente** según fecha de nacimiento del alumno y fecha de inicio del viaje:

| Perfil | Condición | Comportamiento |
|---|---|---|
| **a) Padre / Tutor** | Alumno menor de 18 al inicio del viaje | Titular: el adulto responsable. Lenguaje en tercera persona ("tu hijo/a", "el alumno"). |
| **b) Alumno adulto** | Alumno con 18+ al inicio del viaje, viaja individual | Titular: el propio alumno. Lenguaje en primera persona ("tu documentación", "tu viaje"). Gestión autónoma. |

Atributos comunes a ambos perfiles:

- **Acceso:** DNI del alumno (usuario) + contraseña.
- **Perfil tecnológico:** variado → UX simple, visual, guiada, **mobile-first**.
- **Idioma:** español (Argentina).
- **Email de contacto:** del tutor (perfil a) o del propio alumno (perfil b). Se usa para
  credenciales y notificaciones.

Diferencias funcionales del **alumno adulto (18+)**: sin Parental Consent (A3 = N/A), sin
Autorización por escribano (D1 = N/A, la sección se omite por completo en Módulo 4), el seguro lo
contrata y firma el propio alumno, y la encuesta NPS le llega a su email con lenguaje adaptado.

### 2.2 Modelo de cuenta (✅ decisión cerrada)

- **1 alumno = 1 cuenta**, identificada con el DNI del alumno. Los padres/tutores de un mismo menor
  **comparten** la cuenta; JUK no gestiona usuarios múltiples por alumno.
- La cuenta se **genera automáticamente al crear el registro del alumno** en el sistema (no al
  confirmar la inscripción).
- El **envío de credenciales es una acción separada y manual** que JUK ejecuta cuando lo considera
  oportuno, desde el perfil del alumno en el Portal Interno. Hasta entonces el titular no puede acceder.
- El titular puede cambiar la contraseña en el primer acceso.
- El perfil (padre/tutor o alumno adulto) queda definido al crear la cuenta; no existe versión
  "genérica" del portal.

**❓ Abiertas (negocio):** momento exacto de creación de la cuenta en el proceso de inscripción
(¿manual o integrado con CRM?); resolución de conflicto si ambos padres cambian la contraseña a la
vez desde dispositivos distintos.

> ⚠️ AMBIGUO: el modelo es "1 alumno = 1 cuenta", pero la regla 11.7 exige que el modelo soporte
> **N alumnos por grupo familiar** (familias que inscriben más de un hijo en distintas ediciones,
> cada uno con su propio ciclo de acceso). El PRD no define cómo conviven ambas cosas (¿cuentas
> separadas por hijo con el DNI de cada alumno? ¿agrupación familiar?).

## 3. Principios de diseño y canales de notificación

### 3.1 Principios

- **Claridad ante todo:** sin jerga técnica; cada acción en lenguaje cotidiano.
- **Progresividad:** estado de avance visible siempre (barras de progreso, íconos).
- **Visual y guiado:** íconos, colores de estado, mensajes de orientación.
- **Mobile-first.**
- **Notificaciones proactivas:** el portal avisa antes de que el titular pregunte.
- **Accesibilidad:** tipografía grande, contraste, flujos de máximo 3 clics.
- **Lenguaje contextual:** todos los textos se adaptan al perfil de la cuenta.

### 3.2 Canales (✅ decisión cerrada)

Email y WhatsApp son **complementarios, no equivalentes**:

| Canal | Uso |
|---|---|
| **Email** | Obligatorio, siempre activo. Se configura al crear la cuenta. Canal primario: confirmaciones, documentos formales, recordatorios, historial. **Toda** notificación llega por email. |
| **WhatsApp** | Opcional: el padre carga su número en el perfil. Solo urgencias / alta prioridad (ETA rechazada, cambio de alojamiento, alertas críticas). Sin número configurado, esas alertas van por email. Toda notificación urgente por WhatsApp tiene respaldo en email. |

## 4. Estructura general (instancias y módulos)

| Instancia | Módulos |
|---|---|
| **Pre-viaje** | 1 Documentación requerida · 2 Resumen de documentación · 3 Resumen de pagos · 4 Requisitos del viaje · 5 Test de nivel (⛔ fuera de alcance v1) |
| **Durante el viaje** | 6 Itinerario final · 7 Itinerario diario / Diario de viaje |
| **Post-viaje** | 8 Certificado del curso · 9 Encuesta NPS · 11 Políticas de acceso y próximas salidas |
| **Cross-instancia** | 10 Soporte y canal de comunicación |

---

## Módulo 1 · Documentación Requerida

**Objetivo:** espacio centralizado para descargar, completar, firmar y subir cada documento pre-viaje.
Checklist visual e interactiva que minimiza consultas a JUK sobre estados.

### 1.1 Trámites incluidos (Paso 0 + Grupos A/B/C/D)

La vista muestra **identificador + nombre del trámite** (no "Paso N de 10"), alineado con el tablero
del Portal Interno v1.9+.

| ID | Grupo | Documento | Tipo | Flujo del titular |
|---|---|---|---|---|
| **Paso 0** | — | Application Form JUK | Formulario en portal | Solo lectura; completado en instancia anterior. |
| **A1** | Inscripción | Application Form del Colegio | PDF externo | Descargar PDF → completar/firmar offline → subir al portal. |
| **A2** | Inscripción | Test de Nivel | ⛔ Fuera de alcance v1 | — |
| **A3** | Inscripción | Parental Consent (<16 / 16-17) | Formulario PDF | Descargar → firmar manuscrito → escanear/fotografiar → subir. Solo visible si colegio lo requiere AND alumno menor de 18. |
| **B1** | Pagos | Plan de cuotas | Vista en portal | Lectura del plan y estado. Gestión en Módulo 3. |
| **B2** | Pagos | Último pago presencial | Confirmación | JUK registra el pago presencial; el padre ve el estado en Módulo 3. |
| **C1** | Doc. viaje | ETA (Electronic Travel Authorisation) | Gestión externa (solo UK) | UK: seguir instructivo JUK → gestionar en app UK → reportar estado. USA/Canadá/Irlanda: N/A automático. |
| **C2** | Doc. viaje | Immigration Letter | Informativo | Solo lectura y descarga. |
| **C3** | Doc. viaje | Accommodation Letter | Informativo | Lectura/descarga + mapa casa-colegio. |
| **D1** | Doc. legal | Autorización escribano (salida del país) | Confirmación + foto opcional | El padre confirma que la obtuvo; foto/scan opcional. N/A para 18+. Gestión en Módulo 4. |
| **D2** | Doc. legal | Psicofísico | Confirmación + carga | Confirmar cumplimiento + subir PDF/imagen. |

### 1.2 User stories

**US-1.1 — Ver el panel de documentación** (padre/tutor)

1. Pantalla única con todos los documentos agrupados en las cuatro secciones A/B/C/D.
2. Cada trámite muestra identificador (A1, B2, C1…), nombre y estado (completado / pendiente / no
   aplica) con ícono de color.
3. Indicador de completitud global arriba ("5 de 9 trámites completos"); los N/A no suman al total.
4. Cada trámite lleva directo a su acción (formulario, descarga, instructivo).
5. El estado se actualiza en tiempo real tras cada acción.
6. Usable en móvil sin scroll horizontal.

**US-1.2 — Completar el Application Form JUK** (padre/tutor)

1. Completable en múltiples sesiones, con guardado automático.
2. Campos obligatorios marcados visualmente.
3. Validación de datos antes del envío (fecha de nacimiento, DNI, etc.).
4. Al enviar, estado → "Completado" + confirmación en pantalla.
5. JUK recibe notificación interna al recibirlo.

**US-1.3 — Descargar y firmar el Parental Consent** (padre/tutor)

1. El sistema muestra la versión correcta según la edad del alumno **al momento de la descarga**
   (<16 / 16-17). No se recalcula retroactivamente.
2. Flujo: descargar PDF → firma manuscrita (uno o ambos tutores en el mismo documento) → escanear o
   fotografiar → subir.
3. Acepta JPG, PNG y PDF (máx. 15 MB). Previsualización antes de confirmar.
4. Al subir, estado → "Enviado — pendiente revisión JUK".
5. La firma de **un solo tutor alcanza**; dos firmas en el mismo documento son válidas.
6. El portal registra internamente edad y versión del documento al descargar (trazabilidad JUK, no
   visible para el padre).

**US-1.4 — Leer y descargar la Accommodation Letter** (padre/tutor)

1. La Accommodation Letter es el documento fuente: al habilitarse, el portal extrae las dos
   direcciones (casa y colegio) y las muestra en un mapa integrado con dos puntos diferenciados.
2. Al tocar cada punto: dirección completa en texto y nombre de la institución (colegio).
3. El mapa funciona sin app instalada.
4. La carta es descargable en PDF.
5. Botón de acceso directo a Google Maps con la ruta prefijada entre los dos puntos.

**US-1.5 — Gestionar el ETA** (padre/tutor o alumno adulto)

1. C1 solo aparece activo si el viaje es a UK; otros destinos muestran N/A con etiqueta "No aplica
   para este destino".
2. Instructivo paso a paso en español (incluye escaneo de pasaporte en la app del gobierno UK) con
   link al sitio oficial.
3. El titular marca "En procesamiento" (solicitud enviada) y luego "Aprobado".
4. JUK puede verificar y corregir el estado desde el panel interno.
5. ETA pendiente a 30 días del viaje → recordatorio automático.

**US-1.6 — Reportar rechazo o error del ETA** (padre/tutor o alumno adulto)

1. Aplica únicamente con destino UK.
2. Botón "Tuve un problema con el ETA" junto a "Marcar como aprobado".
3. El titular indica el tipo de problema: rechazo del gobierno UK, error en los datos, o problema
   técnico con la app.
4. Puede adjuntar captura de pantalla del error.
5. JUK recibe **alerta crítica inmediata (urgente)** en el panel interno.
6. Estado → "Rechazado / Con error", destacado en rojo.

**US-1.7 — Recibir instrucciones tras un rechazo de ETA** (padre/tutor o alumno adulto)

1. Al pasar a "Rechazado / Con error", pantalla de orientación con: causas comunes, pasos para
   reintentar o apelar, link oficial al gobierno UK y contacto directo con JUK.
2. Si el rechazo implica solicitar visa (hasta 3 semanas), se indica claramente con plazo estimado
   y pasos.
3. JUK puede actualizar el contenido de orientación desde el panel interno.
4. La misma información llega por email y WhatsApp en forma inmediata.
5. Con viaje a menos de 30 días, la alerta suma un aviso de urgencia adicional.

**US-1.8 — Confirmar reintento exitoso del ETA** (padre/tutor o alumno adulto)

1. Tras un rechazo, el titular puede pasar a "En procesamiento" (reintento) y luego "Aprobado".
2. Cada cambio de estado notifica internamente a JUK.
3. El historial de estados (rechazo y reintento incluidos) queda registrado para JUK, no visible
   para el padre.
4. Sin actualización a las 48 hs del rechazo → recordatorio.

**US-1.9 — Descargar el Application Form del Colegio** (padre/tutor o alumno adulto)

1. PDF descargable con instrucciones en español preparadas por JUK.
2. Descargas ilimitadas.
3. La primera descarga registra fecha y pasa el estado a "Descargado — pendiente devolución".

**US-1.10 — Subir el Application Form del Colegio completado** (padre/tutor o alumno adulto)

1. Botón "Subir formulario completado" en la sección.
2. Acepta PDF y JPG/PNG (máx. 15 MB) con previsualización.
3. Al confirmar: estado → "Enviado — pendiente revisión JUK"; JUK recibe el archivo.
4. Confirmación por email al titular.
5. JUK puede aprobar o rechazar; si rechaza, el titular recibe el motivo y puede volver a subir.

**US-1.11 — Recibir feedback si el formulario del colegio fue rechazado** (padre/tutor)

1. Rechazo → estado "Rechazado — requiere corrección" + notificación inmediata con motivo.
2. El padre puede subir versión corregida.
3. Historial de versiones disponible para JUK (no para el padre).

**US-1.12 — Confirmar el Psicofísico (D2)** (padre/tutor o alumno adulto)

1. Checkbox "Confirmo que el alumno tiene el psicofísico requerido" + botón de carga opcional.
2. Acepta PDF o imagen (JPG/PNG, máx. 10 MB).
3. Al confirmar, estado → "Cumplido". JUK puede revertirlo desde el panel interno si detecta
   inconsistencia.
4. Para alumno adulto (18+) aplica normalmente — **no** es N/A automático.

### 1.3 Estados de los documentos

**Comunes:**

| Estado | Descripción |
|---|---|
| ✅ Completado / Aprobado | Completado, firmado o subido y aprobado por JUK. |
| 🕐 Pendiente | Disponible, el padre aún no inició la acción. |
| ⏳ Enviado — Pendiente revisión | El padre subió el documento; JUK verifica. |
| 🔴 Rechazado / Con error | JUK rechazó o hay error reportado; requiere corrección y reenvío. |
| ⚠️ Vencido | Plazo superado sin completar. |
| 🔒 No disponible aún | JUK no habilitó el documento (ej: Accommodation Letter sin alojamiento confirmado). |
| ➖ No aplica | No corresponde a este alumno (edad u otro criterio). |

**Específicos del ETA:** 🕐 Pendiente → ⏳ En procesamiento (gobierno UK procesando, típico hasta
72 hs) → ✅ Aprobado · 🔴 Rechazado / Con error (acción urgente; puede implicar visa, hasta
3 semanas) · 🔄 Reintento en curso (protocolo de reintento o trámite de visa).

**Específicos del Application Form del Colegio:** 🔒 No disponible aún (JUK no subió el PDF) →
🕐 Disponible — Pendiente descarga → 📥 Descargado — Pendiente devolución → ⏳ Enviado — Pendiente
revisión → 🔴 Rechazado — Requiere corrección / ✅ Aprobado por JUK.

### 1.4 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| JUK habilita un nuevo documento | Email + WhatsApp* | Una vez al habilitarse |
| Documento pendiente a 30 días del viaje | Email + WhatsApp* | Una vez; recordatorio a los 7 días si sigue pendiente |
| Documento pendiente a 7 días del viaje | Email + WhatsApp* | Diariamente hasta completar |
| ETA pendiente a 30 días del viaje | Email + WhatsApp* | Una vez; recordatorios a 15 y 7 días |
| Padre reporta rechazo/error del ETA | Email + WhatsApp* (URGENTE) | Inmediato — alerta urgente al equipo JUK |
| ETA rechazado con viaje a <30 días | Email + WhatsApp* | Inmediato con pantalla de orientación |
| Sin actualización del ETA 48 hs después de "Rechazado" | Email | Recordatorio único |
| Application Form JUK enviado | Email | Confirmación única |
| Parental Consent o App Form del Colegio subido | Email | Confirmación única |
| JUK rechaza un documento subido | Email + WhatsApp* | Una vez por rechazo, con motivo |
| App Form del Colegio descargado y no devuelto en 5 días | Email | Recordatorio único |
| JUK sube nueva Accommodation Letter (cambio de alojamiento) | Email + WhatsApp* (URGENTE) | Inmediato — una vez por cambio |
| Psicofísico (D2) pendiente con viaje a <3 meses | Email + WhatsApp* | Una vez; recordatorio a los 30 días si sigue pendiente |

\* WhatsApp solo si el padre configuró su número; siempre con respaldo en email.

### 1.5 Reglas de negocio

- **Parental Consent — versiones:** dos versiones excluyentes (<16 / 16-17). La versión se determina
  **una sola vez al descargar**; no se recalcula. Quien firma "menor de 16" y cumple 16 durante el
  viaje **no refirma** (validez jurídica al momento de la suscripción).
- **Firma manuscrita:** descarga del PDF, firma física, escaneo/foto, subida. Sin firma digital
  embebida por ahora.
- **Una firma alcanza** para marcar Completado; dos firmas en el mismo documento son válidas. JUK
  puede exigir dos firmas para un alumno específico, configurándolo desde el panel interno.
- **Visibilidad de A3:** solo si el colegio destino tiene `config_parental_consent = 'Requerido'`
  (ENUM `Requerido | Opcional | NA`, gestionado por JUK en el ABM de Colegios Destino del Portal
  Interno). Hoy solo Wimbledon School of English lo requiere. Con `'NA'` u `'Opcional'`, el módulo
  no aparece y el paso queda N/A automático desde el inicio.
- **Combinatoria N/A de A3:** (1) N/A si `config_parental_consent` = `'NA'` u `'Opcional'`;
  (2) N/A si alumno 18+ al inicio del viaje; (3) ambas condiciones a la vez → igualmente N/A;
  (4) A3 activo solo con colegio `'Requerido'` AND alumno menor de 18.
- **Alumno adulto:** D1 (autorización escribano) tampoco aparece. El resto aplica normal.
- **D2 (Psicofísico):** aplica para menores y adultos. Confirmación + carga opcional. Sin integración
  con sistemas de salud.
- **Accommodation Letter:** se habilita cuando JUK confirma el alojamiento. Si cambia, JUK sube nueva
  versión; mapa y transporte se actualizan automáticamente. Historial de versiones solo para JUK.
- **Reemplazo de formularios:** solo en estado "Pendiente" o "Rechazado". Una vez aprobados, quedan
  solo lectura para el padre.
- **App Form del Colegio variable:** puede variar por colegio/destino; JUK sube el PDF correcto por
  grupo/viaje desde el panel interno. Cada padre ve el de su alumno.
- **Visibilidad de C1 (ETA) por destino:** activo solo con colegio destino en UK. USA/Canadá → N/A
  (requieren VISA, fuera de scope v1). Irlanda → N/A (argentinos sin requisito de entrada).
  Cualquier otro destino no-UK → N/A con etiqueta "No aplica para este destino".
- **ETA autoreportado:** el estado lo reporta el padre; JUK puede corregirlo desde el panel interno.
  JUK recuerda activamente; no hay integración con el sistema del gobierno UK.
- **Transporte público casa-colegio:** sugerencias orientativas, **segunda iteración** (no v1).

**❓ Abiertas (negocio):** momento exacto de creación de cuenta (¿manual o integrado?); cómo gestiona
JUK que cada alumno vea el formulario de colegio correcto; ¿colegios que aceptan formulario digital
sin firma manuscrita?; experiencia previa de JUK con rechazos de ETA (causas frecuentes para la
pantalla de orientación); ¿asistencia activa en el reintento (llamada/videollamada) o solo escrita?;
¿el rechazo de ETA activa devolución/reprogramación y cómo se comunica?; ¿escenarios legales (padres
separados con tenencia compartida) que exijan obligatoriamente dos firmas del Parental Consent?

---

## Módulo 2 · Resumen de Documentación (ficha del alumno)

**Objetivo:** vista consolidada de **solo lectura** con los datos clave del alumno, extraídos
automáticamente de los formularios completados. "Ficha del alumno" para verificación de las familias
y datos validados centralizados para JUK.

### 2.1 Información consolidada

| Campo | Fuente |
|---|---|
| Nombre y apellido del alumno | Application Form JUK |
| Número de pasaporte | Application Form JUK |
| Fecha de nacimiento | Application Form JUK |
| Alergias / problemas de salud | Application Form JUK — visible solo para padre, representante y JUK |
| Teléfono de emergencias del seguro | Cargado por el padre en Módulo 4 (opcional) |
| Dirección de la casa de familia | Accommodation Letter (cargada por JUK) |
| Dirección y nombre del colegio | Accommodation Letter (cargada por JUK) |

### 2.2 User stories

**US-2.1 — Ver la ficha del alumno** (padre/tutor)

1. Muestra todos los campos; los vacíos dicen "Sin información registrada" (nunca en blanco).
2. Datos generados automáticamente desde los formularios; el padre **no edita** desde esta vista.
3. Disponible en las tres instancias (pre, durante y post viaje).
4. Si hay corrección pendiente, etiqueta "En revisión" junto al campo afectado.

**US-2.2 — Visualizar el mapa casa-colegio** (padre/tutor)

1. Dos puntos simultáneos con íconos diferenciados.
2. Al tocar cada punto: dirección completa y nombre del lugar.
3. Funciona sin app instalada; legible en celular.
4. Si el alojamiento cambia, el mapa se actualiza automáticamente.
5. Acceso directo a Google Maps con la ruta entre los dos puntos.

**US-2.3 — Solicitar corrección de datos** (padre/tutor)

1. Botón "Reportar dato incorrecto" en cada campo (ícono de lápiz o bandera).
2. El padre indica el campo con error y puede comentar.
3. JUK recibe notificación interna por email con alumno, campo y comentario.
4. El padre recibe confirmación de recepción.
5. Reportes de datos críticos (pasaporte, fecha de nacimiento) a **menos de 7 días del viaje** se
   marcan automáticamente como **urgentes** en el panel interno.

### 2.3 Categorías de corrección

| Categoría | Campos | Comportamiento |
|---|---|---|
| **A — Críticos** | N° de pasaporte, fecha de nacimiento, nombre completo | A <7 días del viaje → URGENTE, alerta de alta prioridad a JUK. JUK valida estos datos activamente con anticipación. |
| **B — No bloqueantes** | Alergias, condiciones de salud, teléfono de emergencias, contacto del seguro | Reportables y corregibles en cualquier momento, incluso durante el viaje. |

### 2.4 Estados

✅ **Completo** (todos los campos con información) · ⚠️ **Incompleto** (campos vacíos porque el
formulario fuente no fue completado) · 🔄 **En revisión** (dato reportado, JUK verificando; el campo
muestra la etiqueta).

### 2.5 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| La ficha se completa por primera vez (todos los datos disponibles) | Email | Una sola vez |
| JUK corrige un dato reportado | Email | Una vez por corrección |
| Corrección Categoría A a <7 días del viaje | Email (alerta interna JUK) | Inmediato — urgente |

### 2.6 Reglas de negocio

- Ficha de solo lectura; correcciones via botón de reporte, aplicadas por JUK desde el panel interno.
- Campos poblados automáticamente desde los formularios fuente.
- La info de alojamiento aparece solo cuando JUK la confirma; si cambia, se actualiza automáticamente.
- Datos de salud visibles **únicamente** para padre, representante y equipo JUK.
- El teléfono de emergencias del seguro (si fue cargado) queda visible en la ficha para consulta
  durante el viaje.

**❓ Abiertas:** ¿transporte público en v1 o segunda iteración?; ¿las correcciones de Categoría B se
comunican automáticamente a la familia anfitriona / colegio UK o solo quedan en JUK?

---

## Módulo 3 · Resumen de Pagos

**Objetivo:** vista transparente del estado de cada cuota. El portal es **canal de información, no
de pago**. JUK actualiza los estados manualmente con la información que recibe de la agencia.

**✅ Decisión cerrada — Moneda y actualización:** montos en **USD**. Sin integración con sistemas de
cobro. La agencia comunica los estados a JUK periódicamente (frecuencia a definir) y el operador los
actualiza a mano.

> ⚠️ AMBIGUO: el PRD de Familias fija los montos de cuotas en **USD**, mientras la convención del
> portal interno (CLAUDE.md) es GBP para montos del viaje y ARS para conceptos locales. Hay que
> alinear la moneda del plan de cuotas antes de modelarlo. Además, en el portal interno todo el
> módulo de Pagos está **bloqueado por CRIT-01** (flujo de pago del colegio cliente / NEA).

### 3.1 User stories

**US-3.1 — Ver el estado de cada cuota** (padre/tutor)

1. Cada cuota: número, descripción, monto en USD, vencimiento y estado con color.
2. Resumen superior: total pagado y saldo restante.
3. Con cuotas vencidas: **banner de alerta en todas las pantallas del portal (no bloqueante)** con el
   texto "Tenés una cuota vencida. Regularizá tu situación para asegurar el viaje de [Nombre]." y
   acceso directo a esta pantalla.
4. Usable en móvil sin scroll horizontal.

**US-3.2 — Recordatorio de cuota próxima a vencer** (padre/tutor)

1. Recordatorio 5 días hábiles antes del vencimiento.
2. Incluye monto en USD, fecha y medios de pago.
3. Si vence sin pago registrado: estado → "Vencida" + nueva notificación.

**US-3.3 — Ver historial de pagos** (padre/tutor)

1. Sección "Historial de pagos" con cuotas pagadas: número, monto USD, fecha de registro por JUK.
2. Descargable en PDF.

**US-3.4 — Consultar medios de pago** (padre/tutor)

1. Sección visible con los métodos aceptados.
2. JUK la actualiza desde el panel interno sin cambios de desarrollo.

### 3.2 Estados de cuota

✅ **Pagada** (JUK registró el pago; muestra fecha) · 🕐 **Pendiente** (no vence aún, sin registro) ·
🔴 **Vencida** (vencimiento superado sin pago; banner global visible).

*"En proceso" (verificación de pago en curso) queda **fuera de alcance v1**, pendiente de alinear
con la agencia frecuencia y mecanismo de actualización.*

### 3.3 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| Cuota próxima a vencer (5 días hábiles antes) | Email + WhatsApp* | Una vez por cuota |
| Cuota vencida sin pago | Email + WhatsApp* | Al vencer + recordatorio a los 3 días |
| JUK registra un pago | Email | Confirmación única |

### 3.4 Reglas de negocio

- El portal **no procesa pagos**; solo visualiza estados.
- El estado lo actualiza **exclusivamente JUK** desde el panel interno; el padre no lo modifica.
- Una cuota vencida **no bloquea** ningún módulo; el padre sigue completando documentación.
- El banner es el único mecanismo automático visible. Bloqueos puntuales (ej: no habilitar la
  Accommodation Letter) son **configurables manualmente por JUK caso por caso**, no automáticos.
- JUK define número de cuotas, montos USD y vencimientos por alumno al inscribir.

**❓ Abiertas:** frecuencia con la que la agencia comunica estados (¿Google Sheet compartido?);
cuotas promedio del programa y si varía por destino/fecha; ¿pago anticipado o cuotas distintas a las
predefinidas?; ¿qué pasa con los pagos si el alumno cancela la inscripción?

---

## Módulo 4 · Requisitos para el Viaje

**Objetivo:** centralizar los requisitos pre-viaje complementarios a la documentación: seguro,
autorización notarial, info del destino y checklist de equipaje.

### 4.1 Requisitos incluidos

| Requisito | Responsable | Acción en portal |
|---|---|---|
| ETA | Padre/Alumno | Ver estado (enlazado al Módulo 1) |
| Seguro de viaje | Padre (cada familia contrata el suyo) | Confirmar + cargar datos opcionales de la póliza |
| Autorización de salida del menor (escribano) | Padre | Confirmar obtención (recordatorio); foto/scan opcional |
| Información sobre el destino | JUK | Solo lectura / descarga PDF |
| Sugerencias pre-viaje | JUK | Solo lectura |
| Checklist de equipaje | JUK (sugerencia) | Vista interactiva + imprimible |

### 4.2 User stories

**US-4.1 — Ver el estado de todos los requisitos** (padre/tutor)

1. Cada requisito con ícono de estado (cumplido / pendiente / no aplica).
2. Indicador de progreso general (ej: "6 de 7 requisitos cumplidos").
3. Botón de acción contextual por requisito.
4. Los gestionados por JUK aparecen bloqueados hasta que JUK los habilite.

**US-4.2 — Registrar el seguro de viaje** (padre/tutor o alumno adulto)

1. Dos opciones: (A) "JUK incluyó el seguro en mi paquete" o (B) "Contraté el seguro de forma
   independiente".
2. Para alumno adulto, el seguro lo firma y contrata el propio alumno (no un tutor).
3. Con B, carga opcional: aseguradora, número de póliza, teléfono de emergencias 24 hs, vigencia.
4. El portal valida que la vigencia cubra el período del viaje; si no, advertencia visible **no
   bloqueante**.
5. B sin datos → estado "Confirmado sin datos", visible para JUK.
6. El teléfono de emergencias aparece en el Módulo 2 para consulta de la representante.

**US-4.3 — Confirmar autorización notarial de salida** (padre/tutor)

1. Funciona como **recordatorio**, no verificación formal: la confirmación del padre alcanza.
2. Confirmación con tilde/checkbox.
3. Opcional: subir foto/scan (JPG, PNG, PDF, máx. 10 MB).
4. Alumno 18+ → "No aplica" automático.

**US-4.4 — Acceder al checklist de equipaje** (padre/tutor)

1. Lista interactiva tildable; las marcas se guardan.
2. Ítems por categoría (ropa, documentos, higiene, electrónica, etc.).
3. Imprimible con botón dedicado.
4. JUK actualiza los ítems desde el panel interno.
5. Completarlo no afecta el estado de cumplimiento del viaje: es orientativo.

**US-4.5 — Leer información sobre el destino** (padre/tutor)

1. Sección con clima, moneda, cultura, tips de seguridad.
2. Sugerencias pre-viaje actualizables por JUK desde el panel interno.
3. Material descargable en PDF.
4. Secciones colapsables para lectura en celular.

### 4.3 Estados

✅ **Cumplido** (confirmado por el padre o verificado por JUK) · 🕐 **Pendiente** · 🔴 **Urgente**
(pendiente a <14 días del viaje) · ✅ **Confirmado sin datos** (seguro declarado sin datos de póliza) ·
➖ **No aplica** (ej: autorización notarial para 18+) · 🔒 **Pendiente de JUK** (contenido no
habilitado, ej: guía del destino sin cargar).

### 4.4 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| JUK habilita nuevo contenido (ej: guía del destino) | Email + WhatsApp* | Una sola vez |
| Requisito pendiente a 21 días del viaje | Email + WhatsApp* | Una vez; recordatorio a los 7 días |
| Requisito pendiente a 7 días del viaje | Email + WhatsApp* | Diariamente hasta completar |
| Padre registra seguro o autorización notarial | Email | Confirmación única |

### 4.5 Reglas de negocio

- El ETA (C1) aparece como referencia con el **mismo estado** que en el Módulo 1; solo visible con
  destino UK (otros destinos: N/A).
- La autorización notarial es recordatorio; JUK **no audita** el documento.
- El seguro lo contrata cada familia de forma independiente; **JUK no provee póliza grupal** ni
  verifica/valida el seguro. La responsabilidad de cobertura adecuada es de la familia. Los datos de
  póliza son opcionales.
- El checklist es orientativo.
- **Alumno adulto:** la sección de autorización notarial **se omite por completo** según el perfil de
  la cuenta. Seguro, checklist e info del destino aplican normal.

**❓ Abiertas:** ¿qué pasa con los requisitos si el alumno viaja con adulto responsable (grupo escolar
con docente)?; ¿la representante ve los datos del seguro de todo el grupo desde su panel para
emergencias?; ¿el checklist varía por destino/época o es fijo?

---

## Módulo 5 · Test de Nivel — ⛔ fuera de alcance v1

Diferido a versión futura. Concepto: autoevaluación del nivel de inglés pre-viaje (A2, B1, B2) con
sugerencias de preparación. JUK decidirá si lo desarrolla o integra una plataforma externa.

**❓ A resolver antes de retomar:** ¿desarrollo interno o integración (Cambridge, Duolingo, etc.)?;
¿el resultado afecta la asignación de grupo en el colegio UK?; ¿lo completa el alumno o el padre?;
¿un intento o repetible?

---

## Módulo 6 · Itinerario Final

**Objetivo:** itinerario oficial y aprobado del programa, en solo lectura. Reduce consultas y da
tranquilidad.

### 6.1 User stories

**US-6.1 — Ver el itinerario completo** (padre/tutor)

1. Calendario o lista cronológica: fecha, actividad, horario estimado, ubicación.
2. Solo lectura; descargable en PDF.
3. Visible desde el primer día del viaje hasta el regreso.

**US-6.2 — Notificación de publicación** (padre/tutor)

1. Al publicar, se notifica a todos los padres del grupo con link directo.
2. Cada actualización envía nueva notificación indicando los cambios.
3. Los cambios se marcan visualmente en el día afectado (etiqueta "Modificado").

### 6.2 Estados

🔒 **No disponible** (JUK no publicó) · ✅ **Publicado** · 🔄 **Actualizado** (modificado tras
publicarse; muestra fecha de última actualización).

### 6.3 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| JUK publica el itinerario por primera vez | Email + WhatsApp* | Una sola vez |
| JUK modifica el itinerario publicado | WhatsApp* + Email | Una vez por modificación |

### 6.4 Reglas de negocio

- El itinerario lo carga y publica **únicamente JUK** desde el panel interno.
- Cada padre ve solo el itinerario del grupo de su hijo/a.
- Puede publicarse antes del inicio del viaje o durante.

**❓ Abiertas:** ¿itinerario por grupo o individualizable por alumno (actividades optativas)?;
¿quién aprueba el itinerario final (JUK, representante, colegio UK, combinación)?

---

## Módulo 7 · Itinerario Diario / Diario de Viaje

**Objetivo:** ventana en tiempo real al día a día del viaje: plan del día, fotos/videos del grupo,
novedades de la representante y un canal de mensajes asíncrono. Los padres reaccionan con emojis y
dejan comentarios de texto.

> Nota v1.11: los comentarios se publican **sin moderación previa** (el texto del objetivo del PRD
> conserva una mención residual a "aprobación de la representante" de versiones anteriores; la regla
> vigente es publicación inmediata — ver US-7.6 y reglas).

### 7.1 User stories

**US-7.1 — Ver el itinerario del día** (padre/tutor)

1. Durante el viaje, la pantalla principal destaca el plan del día actual.
2. Incluye actividades, horarios y lugares.
3. Navegable a días anteriores y futuros.

**US-7.2 — Ver fotos y videos** (padre/tutor)

1. Galería organizada por día, accesible en móvil.
2. Cada ítem indica fecha y puede tener pie de foto.
3. Fotos descargables individualmente.
4. Notificación cuando se suben nuevas fotos/videos.

**US-7.3 — Leer novedades de la representante** (padre/tutor)

1. La representante publica actualizaciones de texto (novedades, anécdotas).
2. Orden cronológico con fecha y hora.
3. Notificación a los padres al publicarse.
4. Cada novedad muestra selector de emojis y sección de comentarios (US-7.5 y US-7.6).

**US-7.4 — Contactar a la representante** (padre/tutor)

1. Botón "Escribir a la representante" visible en el diario.
2. El padre envía mensaje de texto; la representante lo recibe en su panel o por email.
3. El sistema guarda el historial de mensajes.
4. La representante responde; el padre recibe la respuesta en el portal y/o por email.

**US-7.5 — Reaccionar con emoji** (padre/tutor o alumno adulto)

1. Cada entrada publicada muestra selector con al menos 5 emojis.
2. El titular agrega o quita su propia reacción en cualquier momento.
3. El conteo por emoji es visible para todos los padres del mismo viaje.
4. Sin aprobación de la representante: publicación inmediata.

**US-7.6 — Comentar entradas del Diario** (padre/tutor o alumno adulto)

1. Campo de texto bajo cada entrada con botón "Comentar". **Límite 280 caracteres** con contador en
   tiempo real.
2. Publicación **inmediata**, visible para todos los padres del mismo viaje, con nombre del autor y
   fecha/hora.
3. **Sin aprobación previa** de la representante.
4. La representante puede **eliminar cualquier comentario** desde su panel; desaparece del feed
   **sin notificación al autor**.
5. El titular puede eliminar su propio comentario en cualquier momento.

### 7.2 Reglas de negocio

- Fotos, videos y novedades los carga la **representante**; los padres no suben contenido.
- Fotos/videos visibles solo para padres del mismo grupo; sin galerías compartidas entre grupos.
- Videos por **streaming embebido**, sin descarga.
- El canal de mensajes es asíncrono, no chat en tiempo real.
- Reacciones públicas dentro del grupo, sin moderación.
- Comentarios: publicación inmediata, 280 caracteres con contador, sin moderación previa; la
  representante borra desde su panel sin notificar; el titular borra los propios cuando quiera.

### 7.3 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| La representante sube fotos o videos | WhatsApp* + Email | Una vez por carga |
| La representante publica una novedad | WhatsApp* + Email | Una vez por novedad |
| La representante responde un mensaje | Email + notificación en portal | Una vez por respuesta |
| Un padre publica un comentario | Notificación en portal a la representante | Una vez por comentario |

**✅ Cerradas:** límite de comentarios → 280 caracteres. Notificación a la representante → los
comentarios se publican directo, la representante recibe notificación en su portal.

**❓ Abiertas:** ¿quién sube fotos/videos (representante, docente acompañante, ambos)?; ¿mensajería
individual (padre-representante) o grupal?; ¿protocolo de contingencia si la representante queda sin
internet durante parte del viaje?

---

## Módulo 8 · Certificado del Curso

**Objetivo:** descarga del certificado oficial del curso de inglés una vez que JUK lo sube.

### 8.1 User stories

**US-8.1 — Descargar el certificado** (padre/tutor o alumno adulto)

1. Al publicarlo JUK, el titular recibe notificación y puede descargarlo en PDF.
2. Disponible mientras el acceso al portal esté activo.
3. Asociado al nombre y datos del alumno.

**US-8.2 — Notificación de disponibilidad** (padre/tutor)

1. Notificación automática con link directo al publicar.
2. Incluye el nombre del alumno.
3. Se envía por email y WhatsApp.

### 8.2 Estados y reglas

🔒 **Pendiente de carga** · ✅ **Disponible** (si JUK lo reemplaza por uno corregido, se notifica).

- Lo carga **exclusivamente JUK**; el padre no sube ni reemplaza.
- La disponibilidad queda sujeta a la política de acceso post-viaje (Módulo 11).

**❓ Abiertas:** ¿llega digital desde el colegio UK o JUK escanea el original?; ¿cuánto tarda en
estar disponible tras el regreso?

---

## Módulo 9 · Encuesta de Satisfacción (NPS)

**Objetivo:** capturar la percepción post-viaje con NPS en **tres dimensiones**: agencia JUK,
representante y colegio UK. El titular de la encuesta es el padre/tutor (perfil a) o el propio
alumno adulto (perfil b), con lenguaje adaptado.

### 9.1 Dimensiones

| Dimensión | Pregunta — padre/tutor | Pregunta — alumno adulto | Escala |
|---|---|---|---|
| NPS General JUK | ¿Con qué probabilidad recomendarías JUK a otra familia? | ¿Con qué probabilidad recomendarías JUK? | 0-10 |
| NPS Representante | ¿Cómo evaluarías el trabajo de la representante? | (igual) | 0-10 |
| NPS Colegio UK | ¿Cómo evaluarías la experiencia académica en el colegio? | (igual) | 0-10 |

### 9.2 User stories

**US-9.1 — Completar la encuesta** (padre/tutor)

1. Se activa automáticamente a los **3 días del regreso**.
2. Accesible desde el portal y por link en email/WhatsApp.
3. Cada dimensión de 0 a 10 + comentario libre opcional.
4. Al enviar: mensaje de agradecimiento, estado → "Completada".
5. Una vez enviada, **no se puede modificar**.

**US-9.2 — Recordatorio** (padre/tutor)

1. Sin completar a los 7 días del regreso → recordatorio.
2. **Máximo 2 recordatorios**; después no se insiste.
3. El recordatorio incluye el nombre del alumno.

### 9.3 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| Regreso + 3 días (encuesta habilitada) | Email + WhatsApp* | Una sola vez |
| Encuesta pendiente a 7 días del regreso | Email | Recordatorio único |
| Encuesta pendiente a 14 días del regreso | WhatsApp* | Último recordatorio |

### 9.4 Reglas de negocio (✅ modelo de datos cerrado)

- La encuesta se habilita cuando JUK marca el viaje como **"Finalizado"** en el sistema interno.
- Resultados visibles para JUK **con identificación del alumno**; anónimos entre pares.
- Comentarios libres opcionales.
- **Cada alumno genera una respuesta NPS propia. El NPS del viaje = promedio de las respuestas de
  todos los alumnos de ese viaje.**
- **El NPS del representante se acumula** con las respuestas de todos los alumnos de todos sus viajes.
- JUK ve los resultados **agregados desde el Portal de Gestión Interno** (solo lectura allá; la
  fuente de escritura es siempre el Portal de Familias).
- Alumno adulto: la encuesta va a su email, con lenguaje en primera persona, sin referencias a
  "familia" o "hijo/a".

**❓ Abiertas:** ¿encuesta propia del alumno menor además de la del padre?; ¿quién accede al
dashboard de NPS?; ¿uso de comentarios en marketing y consentimiento explícito?

---

## Módulo 10 · Soporte y Canal de Comunicación

**Objetivo:** punto de contacto claro con la representante y con JUK en todo el ciclo, con canales
diferenciados por urgencia e instancia.

### 10.1 Canales

| Canal | Descripción | Disponibilidad |
|---|---|---|
| Email a la representante | Enlace pre-configurado con asunto automático | Todo el ciclo |
| WhatsApp de la representante | Link directo a chat (número gestionado por JUK) | Principalmente durante el viaje |
| Mensajería interna del portal | Canal asíncrono (Módulo 7) | Durante el viaje |
| Contacto con JUK (agencia) | Email o formulario para consultas administrativas | Pre y post viaje |

### 10.2 User stories

**US-10.1 — Contacto siempre accesible** (padre/tutor)

1. Botón de soporte visible en todas las pantallas, sin términos técnicos ("helpdesk", "ticket").
2. Lleva a una pantalla con los canales disponibles y accesos directos.
3. En móvil, el botón de WhatsApp abre directamente la app.

**US-10.2 — Preguntas frecuentes** (padre/tutor)

1. FAQs por tema (documentación, pagos, durante el viaje).
2. Actualizables por JUK desde el panel interno.
3. Buscador con filtrado en tiempo real.
4. Si no encuentra respuesta, formulario de contacto a un clic.

### 10.3 Reglas de negocio

- WhatsApp y email de la representante los gestiona JUK; al cambiar de representante, JUK actualiza
  desde el panel interno.
- Soporte disponible en todas las instancias; los canales varían por instancia.
- El formulario de contacto con JUK no es chat en tiempo real; el SLA lo define JUK.

**❓ Abiertas:** ¿el WhatsApp de la representante es personal o asignado por JUK?; ¿SLA de respuesta
visible para el padre?; ¿protocolo de emergencia (número de guardia) para crisis durante el viaje?

---

## Módulo 11 · Políticas de Acceso Post-Viaje y Próximas Salidas

**Objetivo:** definir cuánto dura el acceso post-viaje, cómo se cierra la cuenta y cómo se
capitaliza el período post-viaje como relación continua.

### 11.1 Opciones de retención analizadas

| Política | Descripción | Riesgos |
|---|---|---|
| Acceso indefinido | Sin límite mientras exista la cuenta | Riesgo operativo alto en migraciones; deuda técnica; sin política de eliminación de datos de menores |
| **Acceso 2 años (recomendado)** | Activo 2 años post-viaje; luego se archiva o elimina | Margen suficiente para certificado e historial; requiere notificación de cierre anticipada |
| Acceso 1 año | Activo 1 año post-viaje | Riesgo moderado: certificado necesario después (trámites universitarios tardíos) inaccesible |
| Descarga al cerrar | Antes del cierre: notificación + descarga de todo en ZIP | Altamente recomendado como complemento de cualquier política; reduce reclamos y transfiere custodia |

**Recomendación de producto:** acceso 2 años + notificaciones a 60 y 30 días del cierre + descarga
masiva en ZIP.

> ⚠️ AMBIGUO: la duración del acceso post-viaje es **pregunta abierta** — la recomendación (2 años)
> no está confirmada por el negocio. Debe definirse antes del desarrollo.

### 11.2 Riesgos identificados

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Migración de sistema sin plan de datos históricos | Media | SLA de exportación de datos en el contrato con el proveedor |
| Padre pierde el certificado por no descargarlo antes del cierre | Media-Alta | Notificaciones a 60/30 días; "Descargar todo" en ZIP; enviar el certificado también por email al publicarlo |
| Datos de menores sin política de eliminación (riesgo legal) | Alta | Política alineada a Ley 25.326 (Argentina) y potencialmente GDPR (servidores en UK); asesoría legal |
| Padre inscribe a otro hijo con cuenta anterior mezclada | Media | El modelo de cuenta debe soportar N alumnos por grupo familiar, cada uno con su ciclo de acceso |

### 11.3 User stories

**US-11.1 — Aviso de cierre de acceso** (padre/tutor o alumno adulto)

1. Notificación a 60 y a 30 días del cierre.
2. Indica fecha de cierre y enumera los documentos disponibles.
3. Botón directo a "Descargar todos mis documentos".
4. Tono amable y práctico, no alarmista.

**US-11.2 — Descargar todos los documentos** (padre/tutor o alumno adulto)

1. "Descargar todo" genera un ZIP con: certificado, formularios, accommodation letter, historial de
   pagos.
2. El ZIP se genera en menos de 60 segundos.
3. Disponible durante el acceso activo y en los últimos 30 días antes del cierre.

### 11.4 Próximas Salidas — ⛔ fuera de alcance v1

Sin mecanismo en el portal para publicar salidas futuras en v1; se evaluará después.

### 11.5 Notificaciones

| Evento | Canal | Frecuencia |
|---|---|---|
| Cierre de acceso en 60 días | Email | Una sola vez |
| Cierre de acceso en 30 días | Email + WhatsApp* | Una vez, con link a "Descargar todo" |
| JUK publica nuevas salidas | Email (opt-in) | Una vez por publicación — solo padres que aceptaron |

### 11.6 Reglas de negocio

- La duración del acceso post-viaje debe definirse **antes del desarrollo** (recomendación: 2 años).
- Ante cualquier migración de sistema, plan de comunicación a los padres con acceso activo.
- El modelo de cuenta debe soportar múltiples alumnos por grupo familiar (varios hijos en distintas
  ediciones).
- El envío de info sobre próximas salidas requiere **opt-in explícito**.

**❓ Abiertas:** duración exacta del acceso; ¿asesoría legal sobre Ley 25.326 y retención de datos de
menores?; ¿próximas salidas visibles solo para padres pasados o también para el sitio público?

---

## Matriz resumen de módulos

| # | Módulo | Instancia | Acción del titular | Email | WhatsApp |
|---|---|---|---|---|---|
| 1 | Documentación Requerida | Pre-viaje | Activa | ✅ | ✅ |
| 2 | Resumen de Documentación | Pre-viaje | Lectura | ✅ | ❌ |
| 3 | Resumen de Pagos | Pre-viaje | Lectura | ✅ | ✅ |
| 4 | Requisitos para el Viaje | Pre-viaje | Activa | ✅ | ✅ |
| 5 | Test de Nivel | Pre-viaje | ⛔ Fuera de alcance v1 | — | — |
| 6 | Itinerario Final | Durante | Lectura | ✅ | ✅ |
| 7 | Diario de Viaje | Durante | Reacciones / comentarios / mensajes | ✅ | ✅ |
| 8 | Certificado del Curso | Post-viaje | Descarga | ✅ | ✅ |
| 9 | Encuesta NPS | Post-viaje | Activa | ✅ | ✅ |
| 10 | Soporte | Cross | Activa | ✅ | ✅ |
| 11 | Políticas Post-Viaje y Próximas Salidas | Post-viaje | Activa | ✅ | ✅ |

WhatsApp solo si el padre configuró su número; email siempre obligatorio.

---

## Puntos de contacto con el Portal Interno

Qué requiere o comparte el Portal de Familias con el portal interno, y **quién es dueño de cada
dato** (quién escribe; el otro lado consume).

### Cuenta y credenciales — dueño: Portal Interno

- **Generación automática al crear el alumno** (US-19b del PRD interno): al dar de alta el alumno en
  el portal interno se generan las credenciales del Portal de Familias (usuario = DNI del alumno).
  No se envían automáticamente.
- **Envío manual por el admin:** botón "Enviar acceso al Portal de Familias" en el perfil del alumno,
  con estado visible "Acceso no enviado" / "Acceso enviado — fecha", y posibilidad de reenviar. El
  acceso queda activo desde el envío, **independientemente del estado del viaje**.
- **Baja del alumno → desactivación automática** de las credenciales del Portal de Familias.
- El **perfil de la cuenta** (padre/tutor vs alumno adulto) se deriva de datos del alumno que son
  dueños del portal interno: fecha de nacimiento + fecha de inicio del viaje.
- Caso "JUK (directo)": no se generan credenciales de portal para un representante externo (no hay
  persona física externa), pero la cuenta de familia del alumno existe igual.

### Tablero de seguimiento Paso 0 + Grupos A/B/C/D — dueño: Portal Interno (estructura y aprobación); la familia escribe en pasos puntuales

- La estructura del tablero del alumno (M6 interno: Paso 0 + A/B/C/D) **es la misma** que ve la
  familia en el Módulo 1, con identificador + nombre de trámite (pregunta cerrada en el PRD interno:
  el tablero SÍ es visible para las familias).
- El tablero del alumno se activa al asignarlo a un viaje, independientemente del estado del viaje.
- **Paso 0 (Application Form JUK):** solo lectura en ambos lados; el Portal de Familias lo muestra
  como **primer evento del timeline del alumno**. Si el alumno entró por Google Form → Completado
  automático; alta manual → "Alta manual" con fecha y usuario.
- **La familia escribe:** subida de A1 (App Form del Colegio) y A3 (Parental Consent), autoreporte
  del estado de C1 (ETA) + reporte de rechazo con adjunto, confirmación + carga de D2 (Psicofísico),
  confirmación de D1 (autorización escribano, desde Módulo 4), datos del seguro.
- **El interno escribe/aprueba:** revisión y aprobación/rechazo de documentos subidos (con motivo),
  corrección del estado del ETA, reversión de D2, habilitación de documentos (C2 Immigration Letter,
  C3 Accommodation Letter y sus nuevas versiones, PDF del App Form del Colegio por grupo/viaje),
  registro de pagos B1/B2.
- **Configuración por colegio:** `config_parental_consent` (ENUM `Requerido | Opcional | NA`) vive en
  el **ABM de Colegios Destino del portal interno** y gobierna la visibilidad de A3 en familias. La
  visibilidad de C1 depende del **país del colegio destino** (UK activo; USA/Canadá/Irlanda N/A),
  también dato del interno.
- El interno guarda metadata de trazabilidad que la familia no ve: versión/edad al descargar el
  Parental Consent, historial de estados del ETA, historial de versiones de documentos y de la
  Accommodation Letter.

### Pagos — dueño: Portal Interno

- JUK define plan de cuotas, montos y vencimientos por alumno, y actualiza los estados manualmente.
  La familia **solo lee** (Módulo 3 + B1/B2 del Módulo 1). El padre nunca modifica estados de pago.
- Medios de pago: contenido editable por JUK desde el interno.
- Bloqueos puntuales por mora (ej: retener la Accommodation Letter) se configuran manualmente caso
  por caso desde el interno.

### Encuesta NPS — dueño: Portal de Familias (única fuente de escritura)

- La familia responde NPS en 3 dimensiones (JUK / Representante / Colegio UK, 0-10 + comentario).
- El **dashboard interno consume read-only**: NPS del viaje = promedio de respuestas de sus alumnos;
  NPS acumulado del representante = promedio de todos sus viajes (visible en su perfil); conteo de
  respuestas ("12 de 15"); viajes sin respuestas muestran "Sin datos" (no cero). El interno **nunca
  modifica** estos datos.
- Disparador: el interno marca el viaje como "Finalizado" → a los 3 días se habilita la encuesta.

### Contenido editorial y documentos emitidos — dueño: Portal Interno

JUK carga/edita desde el interno y las familias consumen: Immigration Letter, Accommodation Letter
(+ nuevas versiones ante cambio de alojamiento), certificado del curso, itinerario final (y sus
actualizaciones), guía del destino y sugerencias pre-viaje, checklist de equipaje, FAQs, contenido
de orientación ante rechazo de ETA, medios de pago, y datos de contacto de la representante.

### Alertas y notificaciones internas — generadas por acciones de la familia

El portal interno debe recibir: alerta **crítica/urgente** por rechazo de ETA, alertas urgentes por
reporte de datos críticos (Categoría A) a <7 días del viaje, notificación al recibir el Application
Form JUK, documentos subidos pendientes de revisión, cambios de estado del ETA, y reportes de
corrección de datos (alumno + campo + comentario).

### Diario de viaje y mensajería — compartido con la Vista del Representante

La representante (su propio portal, PRD aparte) publica novedades/fotos/videos, recibe mensajes y
notificaciones de comentarios, y puede borrar comentarios. El Portal de Familias es el lado lector/
reactor. El interno gestiona los datos de contacto del representante.

### Ciclo de vida y datos maestros — dueño: Portal Interno

Alumno (datos personales, pasaporte, tutores, DNI), viaje (fechas, destino, estado — "Finalizado"
dispara el post-viaje), colegio destino (país, `config_parental_consent`), asignación alumno↔viaje
(activa el tablero y define "el grupo" cuya pertenencia segmenta itinerarios, galerías y
notificaciones), y la política de cierre de acceso post-viaje.

---

## Implicancias para el código actual

### Lo que el portal interno ya deja preparado

- **Rol `familia` en `users`** y enforcement de `isActive` en `requireSession` (la base para
  desactivar credenciales al dar de baja al alumno).
- **Arquitectura por capas** (`src/lib/domain/` puro, queries separadas) pensada explícitamente para
  que Representante y Familias compartan el modelo de datos sin duplicar lógica.
- **ABM de Alumnos** con datos personales, pasaporte, tutores y baja/reactivación — la fuente de los
  datos maestros y del perfil de cuenta (DNI, fecha de nacimiento, emails de tutores).
- **ABM de Colegios y Viajes** (fechas, destino, estados) y **Asignaciones** alumno↔viaje — define
  "el grupo" que segmenta todo el portal de familias.
- **Better-Auth + Resend** (emails transaccionales) y patrón de password temporal en Gestión de
  Usuarios, reutilizable para el envío de credenciales.
- **Seguimiento M7** (pasos del viaje) como patrón probado de máquina de estados con metadata tipada
  y audit log, extensible al M6.

### Lo que falta para soportar el Portal de Familias

- **Seguimiento M6 (Paso 0 + A/B/C/D) por alumno:** no construido; es el prerequisito directo del
  Módulo 1 de familias. Parcialmente **bloqueado por CRIT-01** (pagos B1/B2) y **CRIT-03**
  (psicofísico D2: el PRD de familias asume que es del alumno, pero en el interno sigue abierto si
  es del alumno o del group leader).
- **Credenciales de familia (US-19b interno):** generación al crear el alumno, botón "Enviar acceso",
  estado enviado/no enviado, desactivación en baja — nada de esto existe aún.
- **Login por DNI:** Better-Auth hoy autentica admins por email; el acceso de familias es DNI +
  contraseña, lo que requiere extender la estrategia de auth.
- **Upload de archivos a R2:** inexistente (hoy los documentos del M7 van como URL manual). Es
  crítico: las familias suben Parental Consent, App Form del Colegio, psicofísico, capturas de ETA.
- **Módulo de Pagos / plan de cuotas:** bloqueado por CRIT-01. Además hay que resolver la moneda
  (el PRD de familias dice **USD**; la convención del código es GBP/ARS).
- **Campo `config_parental_consent` (ENUM)** en el ABM de Colegios Destino y la regla de visibilidad
  de C1 por país de destino.
- **WhatsApp como canal de notificación:** sin infraestructura; solo existe email (Resend).
- **Recordatorios automáticos (Trigger.dev):** la batería de notificaciones por umbral de días
  (30/21/15/7 días, diarias, 48 hs post-rechazo, cierre a 60/30 días, NPS a 3/7/14 días) requiere
  jobs programados que hoy no existen.
- **Modelo de datos NPS** (respuesta por alumno, agregados por viaje y representante) y su vista
  read-only en el dashboard interno.
- **Diario de viaje, galería multimedia, reacciones, comentarios y mensajería asíncrona:**
  compartidos con la futura Vista del Representante; nada construido.
- **Itinerarios** (final y diario), **contenido editable por JUK** (FAQs, guía del destino,
  checklist, orientación ETA, medios de pago): requieren un mecanismo de gestión de contenido en el
  panel interno.
- **Alertas dinámicas en el dashboard interno** (hoy placeholder): varios eventos de familias
  (rechazo de ETA, datos críticos a <7 días) dependen de ellas.
- **Política de acceso post-viaje:** decisión de negocio pendiente (recomendación 2 años) + jobs de
  cierre + descarga masiva en ZIP.
- **Frontend del portal de familias** completo: app mobile-first separada del admin, con lenguaje
  contextual por perfil de cuenta, mapa integrado casa-colegio y banner global de mora.
