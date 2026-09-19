# Changelog

Historial del JUK Portal, agrupado por fecha (formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)).
Las entradas cuentan **qué cambió para quien usa el portal** y, cuando hace falta, por qué. El
hash entre paréntesis es el commit (o los commits) donde está el detalle técnico.

Categorías: **Agregado** · **Cambiado** · **Corregido** · **Seguridad** · **Eliminado** · **Interno** (tests, CI, dependencias, docs).

> **Regla**: todo cambio suma su línea en la sección `## [Sin publicar]` en el mismo commit (regla
> de sincronía, `CLAUDE.md` raíz). Es la única sección abierta: no se crea otra con otro nombre.
> Las secciones con fecha agrupan los cambios por el día del commit (no hay versiones ni registro
> de deploys). Al cerrar una tanda de trabajo, las líneas de *Sin publicar* pasan a una sección
> `## AAAA-MM-DD — <tema>` con la fecha del último commit de la tanda. El estado vigente no va acá:
> está en [`docs/estado-actual.md`](docs/estado-actual.md).

---

## [Sin publicar]

### Agregado
- **Los dos mails que recibe la familia en el Application Form, rediseñados.** La invitación y el
  acuse ahora llevan cabecera con el logo y una **foto del viaje** (elegida por la ciudad del código;
  si no se reconoce, una del grupo, nunca una de Londres para un viaje a Malta), una tarjeta con el
  viaje, su bandera y sus fechas, un botón grande que se ve como botón también en Outlook, íconos,
  "qué tener a mano", los pasos de cómo sigue y a quién pedir ayuda. Se leen bien en el teléfono, en
  modo oscuro y con las imágenes bloqueadas (todo lo importante está en el texto). Pesan unos 16 KB,
  lejos del recorte de Gmail.
- **Entrar con Google.** El login suma "Continuar con Google" como **segunda forma de entrar a una
  cuenta que ya existe**: no crea usuarios ni cambia roles, así que un Gmail que el equipo no dio de
  alta rebota con un mensaje que explica qué hacer. El botón solo aparece cuando las credenciales
  están cargadas; mientras no lo estén, el login es exactamente el de siempre y nadie nota la
  diferencia. Queda abierto a quién se le muestra (equipo, familias o los dos).
- **El Application Form avisa mientras se completa.** Una letra en el DNI se marca en el acto, y el
  resto de los campos esperan a que la familia termine de escribir antes de decirle nada: un email a
  medio tipear no es un error. El aviso se borra apenas el dato queda bien, el foco nunca salta solo
  y los mensajes son los mismos que aplica el servidor, así que no puede pasar que el formulario diga
  que está todo bien y el envío falle. También se afinó **qué se acepta**: el DNI ya no se traga
  letras en silencio (antes `45102a` se guardaba como `45102`), los nombres no llevan números, el
  pasaporte pide al menos 5 caracteres y el celular 8 dígitos. Un **pasaporte vencido avisa pero no
  bloquea**: la familia que lo está renovando es justo la que se quiere ver entrar.
- **El formulario de inscripción dejó de ser una columna de campos flotando en el vacío.** Ahora la
  ficha viene con cabecera de marca y del viaje, "qué pasa después de enviar", los dos canales de
  ayuda, las cifras y las acreditaciones de la agencia, y un pie. Se lee como parte del sitio sin
  ofrecer ninguna salida a él: la familia que llegó a completar la ficha no se distrae. La ficha en
  sí no cambió ni un campo, y las tres pieles lo reciben cada una a su manera.
- **La pantalla de armado de una campaña explica el vacío.** Sin prospectos cargados ya no muestra
  una tabla en blanco: dice por qué está vacía y ofrece la salida (importar o cargar prospectos).
- **Borrado a pedido y purga por retención**: lo que la Política de Privacidad promete ahora se
  cumple solo. Un super_admin puede borrar los datos personales de una ficha dejando constancia del
  motivo, y un job (`npm run job:purga`) vacía las fichas que pasaron su plazo —90 días una ya
  procesada, 2 años una sin procesar— y borra el token de las invitaciones vencidas que nadie usó.
  Borrar **no borra la fila**: queda el talón (número, estado, variante, fechas) para que las
  estadísticas de una campaña vieja no cambien retroactivamente.
- **Embudo de cada campaña**: enviados → formulario abierto → fichas recibidas → procesadas, con el
  corte por variante para ver cuál convierte mejor. Cada porcentaje va con el número de casos al
  lado, y los escalones que dependen del webhook de Resend (entregado, abierto, clic) figuran como
  *no disponible* mientras ese servicio no esté configurado — nunca como cero.
- **Tres pieles para el formulario de inscripción**, elegibles desde Configuración (con vista previa)
  y pisables por campaña desde el link: **Legajo** (sobria, como el portal), **Cuaderno** (cálida y
  editorial, con notas de confianza en los campos sensibles) y **Embarque** (una columna, controles
  grandes y progreso, pensada para el teléfono). Cambia la piel, no el formulario: los campos, la
  validación y lo que se guarda son los mismos, y cada ficha registra con cuál se cargó, para poder
  comparar cuál convierte mejor.
- **Invitaciones por lote desde el CRM.** Se arma una campaña eligiendo el viaje y a qué prospectos,
  y el sistema manda a cada uno su propio link al formulario. La pantalla muestra el avance y se
  puede **cerrar y retomar**: lo ya enviado no se reenvía. Los colegios dados de baja quedan
  excluidos —sin opción de forzar— y la pantalla dice cuántos quedaron afuera y por qué. Cada
  invitación se puede revocar: el link deja de abrir el formulario en el acto.
- **El formulario ya da de alta al alumno solo.** Si la familia llegó por el link que ustedes
  enviaron, al enviar la ficha se crea el alumno como pre-inscripto, se le arma la cuenta del Portal
  de Familias y queda asignado al viaje de esa campaña. Las cargas que llegan sin link, o las que
  tocarían una cuenta de familia que ya existe, **no se automatizan**: quedan en la bandeja con el
  motivo a la vista y se resuelven con un clic. Un DNI ya cargado nunca modifica al alumno existente.
  El listado de alumnos suma el filtro **Canal de alta** para ver los que entraron por el formulario.
- **Formulario de inscripción propio** en `/inscripcion`: las familias llegan desde el link de un
  mail, completan la ficha del alumno y reciben un acuse por mail con su código de seguimiento. El
  equipo recibe el aviso y ve todas las fichas en una bandeja nueva, con filtros y conteos por
  estado y por variante. Por ahora cada ficha se procesa a mano: el alta automática del alumno llega
  en el próximo paso. El link puede reenviarse sin riesgo — no lleva datos de nadie, así que un
  colegio puede mandárselo a todas sus familias.
- **Política de Privacidad publicada y versionada** en `/privacidad`, con su historial de versiones.
  El consentimiento del formulario de consulta ahora dice a qué se está aceptando y linkea el texto,
  y queda registrado qué versión aceptó cada persona. El texto describe lo que el sistema hace hoy,
  incluido lo que todavía no borra automáticamente. Primer paso del módulo de inscripciones online.

### Cambiado
- **El botón para abrir el calendario de una fecha ahora se puede tocar.** Pasó de un ícono chico
  pegado al borde a un botón del alto entero del campo, con fondo propio, que se ve como botón
  también en el teléfono. El campo se sigue **tipeando**: tocarlo no abre el calendario (una fecha de
  nacimiento de 1968 son 20 clicks de calendario contra ocho teclas). Enter sobre el campo también lo
  abre. Los días de adentro del calendario siguen siendo chicos: queda anotado.
- **Las barras de scroll dejaron de cortar el menú.** Los menús laterales del back-office y del
  Portal de Familias, el diálogo de registrar un pago y la lista de destinatarios de una campaña usan
  ahora una barra fina que respeta el color de la pantalla, en vez del bloque gris del sistema.
- **El buscador del armado de una campaña encuentra por ciudad y por mail**, no solo por el nombre
  del colegio.

### Corregido
- **La invitación decía una fecha de vencimiento equivocada.** Anunciaba "vence en 30 días" sin
  fecha, y cuando se pasó a la fecha exacta, una campaña enviada de noche anunciaba el día siguiente
  al real (se tomaba el día UTC, no el de Buenos Aires). Ahora dice el día en que el link deja de
  abrir, en hora argentina.
- **El acuse no nombraba el viaje y el aviso al equipo decía "sin asignar"** aunque la ficha viniera
  de una invitación con viaje. Ahora los dos lo toman de la invitación.
- **El envío de prueba de Configuración ahora dice por qué falló.** Antes mostraba "Verificá la API
  key de Resend y que el dominio del remitente esté verificado", que es una lista de sospechosos y no
  un diagnóstico: el motivo real quedaba solo en Sentry. Ahora muestra el mensaje de Resend tal cual
  —"el dominio no está verificado", "solo podés mandar pruebas a tu propia casilla"—, o nombra la
  variable que falta en ese deploy. Es el agujero que hizo que producción estuviera meses sin poder
  mandar un mail sin que nadie se enterara.
- **Un campo con error se quedaba gris.** En el formulario de inscripción, cuando un dato estaba mal
  aparecía el mensaje debajo pero el campo no se pintaba de rojo, así que en una ficha larga había
  que leer campo por campo para encontrar cuál era. La causa es del sistema de diseño y **no era solo
  del formulario nuevo**: el marco del campo avisa que hay error para los lectores de pantalla, pero
  el borde rojo lo tiene que pedir cada formulario a mano, y varios lo piden solo en algunos de sus
  campos. Quedó arreglado en `/inscripcion` y anotado como deuda para barrer el resto (el más
  desparejo es el formulario de consulta del sitio).
- **La casilla de consentimiento se tildaba sola.** El área sensible al toque era el párrafo entero,
  así que intentar seleccionar el texto legal —o simplemente tocarlo— aceptaba la política sin
  querer. Ahora el toque grande vive en la casilla, y el texto se puede leer y copiar tranquilo.
  Enviar sin tildarla, además, ahora pinta la casilla de rojo: antes el único aviso era la línea de
  texto de abajo.
- **Un error al entrar con Google terminaba en una pantalla de la API.** Una cuenta desactivada que
  intentaba entrar por Google veía la respuesta cruda del servidor en una URL de `/api/...`, en vez de
  volver al login con el aviso de siempre. Y el login tenía previsto mostrar los errores que llegan
  por la URL, pero nunca los mostraba: quien volvía de un intento fallido se quedaba mirando un
  formulario vacío sin saber qué había pasado. Ahora cada caso vuelve al login con su explicación, y
  un error que no reconocemos también dice algo en vez de callarse.
- **Una casilla deshabilitada se veía igual que una habilitada** (mismo color, mismo cursor). Ahora
  se nota.

### Seguridad
- **Google vincula, nunca da de alta.** El registro público del portal está cerrado y las cuentas las
  crea el equipo; un provider social con el comportamiento de fábrica habría convertido a cualquiera
  con un Gmail en usuario del portal. El botón se declara con el alta desactivada, así que un email
  desconocido se rechaza **antes** de escribir nada. Tampoco se marcó a Google como proveedor de
  confianza: eso saltearía la verificación del email que trae Google y sería la forma de quedarse con
  la cuenta de una familia. El rol y el estado activo/inactivo se siguen leyendo de la base, y
  arrancar el flujo tiene su propio límite de intentos. Sin las dos credenciales cargadas no existe
  ninguna superficie nueva. ([ADR-019](docs/architecture.md))

### Interno
- La validación en vivo del Application Form quedó como **molde para el resto de los formularios**:
  la regla y el mensaje salen del schema de dominio —el mismo que aplica el servidor— y el hook de la
  pantalla es solo cableado. Nunca una segunda regla escrita en el cliente.
- Los datos de marca que comparten el sitio público y el Application Form (las cifras, las
  acreditaciones con su texto alternativo y la foto de cabecera) pasaron a una fuente única, para que
  no envejezcan por separado.
- **El botón de Google quedó prendido en producción** (18/09/2026): credenciales cargadas y
  verificado contra el deploy que el `redirect_uri` y los scopes son los correctos. El dominio del
  equipo está en Google Workspace, así que sus cuentas sirven, y **8 de las 16 familias tienen
  Gmail**: publicada la app en Google Cloud, el botón ya le sirve a la mitad de ellas.
- **Producción nunca había mandado un mail, y ahora puede.** La `RESEND_API_KEY` cargada en Vercel
  desde junio era inválida: cada envío volvía con `401 · API key is invalid`. Nadie se enteró porque
  el envío es best-effort —la ficha se guarda igual— y el motivo solo llegaba a Sentry. Se reemplazó
  por una key nueva, validada contra la API antes de cargarla. Mientras el dominio de la marca no esté
  verificado en Resend, el remitente es `onboarding@resend.dev` y solo se entrega a la casilla dueña
  de la cuenta; el alta del dominio quedó en [`docs/estado-actual.md` §7](docs/estado-actual.md), con
  el typo que encontramos en el camino (en Resend estaba cargado `jovenesuk.com`, sin el "en").
- **Los E2E ya no dependen de los secretos de la máquina que los corre.** El server de Playwright
  leía el `.env.local` de quien los corría, así que cargar las credenciales de Google en local rompió
  dos specs que en el CI de GitHub pasaban. Ahora el entorno de los E2E las fija vacías, como en el
  CI. Queda escrito como cuarta trampa en `.claude/docs/05-testing.md`.
- **Tres trampas de Playwright quedaron escritas** en `.claude/docs/05-testing.md`, porque las tres
  hicieron que un test acusara a código sano: leer un color de un tiro lo agarra a mitad de la
  transición (el borde rojo del consentimiento llegó a medir el 3% del recorrido); `getByRole("alert")`
  sin acotar nunca da cero, porque Next monta un anunciador de rutas con ese rol en toda página; y un
  mismo mensaje de error aparece dos veces a propósito, visible y en la región que lee el lector de
  pantalla. Va con una regla más general: al endurecer un schema, los fixtures de los E2E son datos de
  entrada como cualquier otro —tres literales con `E2E` adentro dejaron de ser nombres válidos— y por
  eso el helper ahora valida la ficha contra el schema antes de tipearla, para que el fallo nombre el
  campo en vez de agotar el timeout.
- Decisiones nuevas en `OPEN_DECISIONS.md`: **MIN-28** (Google en el login, que reabre el SSO que el
  PRD daba por cerrado en dos lugares), **MIN-29** (qué tan estricto es el Application Form con lo
  que la familia tipea), **MIN-30** (hasta dónde se agranda el calendario) y **MIN-31** (qué rodea a
  la ficha). Las cuatro tienen preguntas concretas para el dueño.
- Cimiento del formulario de inscripción propio (etapa 2 de 7, sin pantalla todavía): la ficha y sus
  reglas en el dominio, la clasificación de qué dato puede salir del sistema y cuál no, la vida de
  una invitación con vencimiento y revocación, tokens que se guardan **hasheados**, y la tabla de
  aterrizaje `inscripciones` con su compuerta de alta. El formulario público tolera mejor que varias
  familias del mismo colegio carguen a la vez desde la misma red, sin aflojar el límite de los otros
  formularios.
- **Producción lee la branch `dev` de Neon, no `main`** — la misma que usa el `next dev` del dueño,
  así que probar en `localhost:3000` es escribir en los datos de producción. Separarlas quedó como
  decisión del dueño en [`docs/estado-actual.md` §7](docs/estado-actual.md).
  **Corrección de una entrada anterior de esta misma sección**: acá decía que "la base de producción
  venía 7 migraciones atrás" y que "el CRM llevaba meses desplegado contra una base sin sus tablas".
  **Era falso**: se había dado por hecho que producción era `main` (la branch *default*) sin
  verificarlo. La que estaba atrasada era `main`, que no usa nadie; producción siempre estuvo al día.
  Se migró `main` (inofensivo) y se sacó un respaldo de `main` (`respaldo-pre-0021`, borrable). La
  historia completa y la regla que sale de esto, en [§10](docs/estado-actual.md).
- **El portal es alcanzable desde afuera** desde el 18/09/2026: el dueño apagó la *Deployment
  Protection* de Vercel. El back-office sigue protegido por el login del portal.

### Seguridad
- Se sacó `NEXT_PUBLIC_ENABLE_TWEAK` de Vercel Production: la herramienta de diseño del sitio
  público no puede quedar habilitada para los visitantes.

### Corregido
- Al **reasignar** a un alumno que había sido dado de baja de un viaje, la fecha de asignación podía
  quedar *anterior* a la original, y la fecha de baja tenía el mismo problema: se tomaban del reloj
  del servidor de la app, mientras que el alta original la toma del reloj de la base. Ahora las tres
  salen del mismo reloj.

### Interno
- **Sentry conectado en producción**: los errores del portal se reportan con stack traces legibles
  (source maps subidos en cada build, release = commit).
- **`npm run ci:local`**: la suite completa (rápidos + integración + Playwright) en la máquina del
  dueño, sobre una branch efímera de Neon hija de `ci-base` (sin datos del negocio), sin gastar
  minutos de GitHub y sin apagar el `next dev` del 3000 (compila en `.next-e2e`).
- En GitHub, el job `e2e` quedó configurado (secret `NEON_API_KEY` acotado al proyecto) y probado en
  verde, pero **solo corre a mano**: `check` sigue en cada push.
- Los avisos de consultas nuevas del sitio llegan por mail (`LEADS_NOTIFY_TO`, provisorio hasta tener
  el dominio de mails).
- Documentación reorganizada con una fuente de verdad por tema: `docs/estado-actual.md` (qué está
  construido, qué falta, qué depende del dueño y la deuda), este CHANGELOG, un README real y las
  convenciones de `CLAUDE.md` alineadas con el código. PRD `00`-`06` puestos al día y `06-deltas`
  recalculado como gap vigente; nuevo `docs/prd/07-prospectos-y-web-publica.md`. `architecture.md`
  y `design-system.md` reescritos sobre el código real.
- Se borraron `docs/data-model.md` (reemplazado por `docs/prd/03-modelo-datos.md`), `docs/phases.md`
  (reemplazado por `docs/estado-actual.md`) y `docs/mobile-app/NOTA-EXPO.md`.
- Guías de handoff nuevas: `.claude/docs/05-testing.md`, `06-seguridad.md` y `07-performance.md`.
- `OPEN_DECISIONS.md` suma las decisiones de producto abiertas que destaparon los tests (p. ej.
  MIN-24, reactivar un alumno y su cuenta de familia; TEC-12, el DNI con puntos).
- Harness: hooks nuevos `destructive-command-guard`, `docs-sync-reminder` y `test-companion-check`
  (con `probar-hooks.mjs`); skills y agentes reescritos sobre el modelo real.
- **Regla de sincronía** en las reglas de Claude del proyecto: cada cambio trae su test y deja al
  día el PRD, las definiciones, el estado, el changelog y el mapa de archivos, con `/juk-cierre`
  como Definition of Done.
- **`npm run check:env`**: dice qué variables faltan, cuáles quedaron con el valor de ejemplo de
  `.env.example` (peor que faltar: una `RESEND_API_KEY` de molde apaga el dry-run y hace fallar los
  envíos) y cuáles no deberían estar seteadas en un deploy. `npm run check:env:prod` evalúa el
  perfil de producción, y `npx tsx scripts/check-env.ts --env <archivo>` cualquier otro archivo,
  por ejemplo el que baja `vercel env pull` — ese viene con los nombres y los valores vacíos
  (Vercel no devuelve las encriptadas), así que el script lo detecta y pasa a *modo nombres*:
  chequea que la variable exista. Nunca imprime valores.
- El catálogo de variables (`src/lib/domain/configuracion/env.ts`) es ahora la fuente única:
  lo leen el comando y la tarjeta *Estado de servicios* de `/configuracion`, que además distingue
  "configurado" de "quedó el valor de ejemplo" en vez de dar por presente un `re_xxxx`.
- Guía nueva [`docs/setup-servicios.md`](docs/setup-servicios.md): alta de R2, secrets de Neon en
  GitHub, Sentry, Trigger.dev, el outreach de Resend y el dominio, con cómo verificar cada uno.
- `.env.example` reordenado por servicio y alineado con el catálogo (suma `EMAIL_DRY_RUN`, saca
  `NODE_ENV`, que lo fija Next).
- Test unit nuevo de `src/lib/domain/pasos/codigos.ts` (era el único archivo del módulo sin
  compañero): grupo por código, etiquetas únicas, biyección de la numeración vieja y Paso 0 como
  único paso de solo lectura.
- Comentarios del código corregidos donde contradecían el comportamiento real (lo detectó la
  relectura de los docs): `GlobeLoader` figura como sin uso, C2 no vuelve a bloquearse si se
  reabre B1, la tabla `alertas` no la lee ni la escribe nadie (TEC-16), el scan manual de
  recordatorios con `enviarEmails: false` igual consume el candado de dedup (TEC-14), el alta de
  usuarios manda un link y no una contraseña temporal, y el puente de colores de Tailwind ya
  quedó en 0 usos.

---

## 2026-09-10 — Programa de adecuación (cierre): mobile, UX, seguridad de dependencias y suite de tests

### Agregado
- **Dashboard "Alumnos con acción urgente"**: quién necesita intervención hoy (pasos vencidos o
  trabados, pasaporte en alerta, cuota en mora), con viaje, días hasta la salida, motivo y link a la
  ficha. Las stat cards llevan al listado ya filtrado y hay accesos rápidos. *(72d596c)*
- **Asignar un alumno a un viaje desde su ficha** (antes eran 5+ clics desde el viaje), con las
  mismas validaciones de pasaporte, cupo y auto-confirmación. *(72d596c)*
- Viajes con inscriptos/cupo y filtros por año, país y colegio; alumnos con su viaje y alerta por
  fila, y filtros por viaje y por paso. Detalle del viaje con progreso de cupo y trámites, alertas
  propias y subnavegación por secciones. *(72d596c)*
- **Registrar pago** en un único diálogo con fecha efectiva y observaciones, igual en los tres
  lugares donde se registra; rechaza fechas futuras. *(72d596c)*
- **M6**: bloquear un paso exige un motivo; la fecha límite de A1 se puede editar. **M7**:
  sub-estados de Pasajes y Excursiones según el PRD, distintos para viaje grupal e individual. *(72d596c)*
- **Portal de Familias**: sección Ayuda con los canales reales y preguntas frecuentes; aviso de cuota
  vencida en todas las pantallas; Documentación agrupada por A/B/C/D con una explicación en criollo
  de cada trámite y el caso "tuve un problema con el ETA". *(72d596c)*
- **Mobile**: tablas que en el teléfono se ven como tarjetas (13 listados y paneles), selects y
  calendario que ya no se recortan dentro de las tablas, botones y acciones de 44px, safe areas
  para notch y barra de gestos, drawer del back-office con scroll bloqueado en iOS y foco atrapado,
  y kanban de Prospectos operable con el dedo ("Mover a…"). *(b637764)*

### Cambiado
- Los formularios ya no hacen zoom en iOS: piso de 16px en todo control en anchos de teléfono, y
  ningún texto del sistema baja de 12px. *(b637764)*
- Estados vacíos unificados, distinguiendo "no hay nada" de "no hay resultados con estos
  filtros". *(b637764)*
- "Reportar un dato incorrecto" desde el Portal de Familias ahora le llega al equipo por mail
  (antes quedaba un registro que nadie veía). *(72d596c)*
- Sitio público: la próxima salida grupal se calcula y el banner desaparece si no hay ninguna vigente
  (antes decía "Julio 2026" fijo). *(72d596c)*
- "Cancelar viaje" ya no se ofrece en viajes finalizados, y la cobertura de transfers se
  deshabilita mientras Pasajes esté pendiente. *(0b73eaf)*

### Corregido
- Una **cuenta desactivada** entraba en un loop entre `/login` y `/dashboard` y nunca veía el aviso
  "Cuenta desactivada": ahora se rechaza al crear la sesión y el aviso aparece. Además, el proxy ya
  no rebota `/login` mirando solo la cookie (con una cookie vencida armaba el loop): la página de
  login redirige usando la sesión real. *(0b73eaf)*
- **/pagos** repetía o salteaba cuotas al pasar de página (orden sin desempate). *(0b73eaf)*
- La confirmación automática del viaje al 5.º inscripto decidía con un estado desactualizado. *(0b73eaf)*
- Se podía cancelar un viaje finalizado; se podía marcar la cobertura de transfers salteando
  Pasajes; una familia podía reabrir un D1 que el equipo ya había completado; `?page` con decimales
  rompía la paginación. *(0b73eaf)*
- El cambio de estado de una consulta ahora queda auditado. *(0b73eaf)*
- Accesibilidad: label asociado al control real en Select y DateInput, ayuda y error anunciados, y
  nombre accesible en los seis buscadores de los listados. *(b637764)*

### Seguridad
- **Webhook de Resend**: rechaza eventos viejos (antes se podía reenviar un evento capturado para
  siempre) y ya no acepta una clave de firma vacía si el secret viene mal configurado. *(0b73eaf)*
- **0 vulnerabilidades altas o críticas en las dependencias de producción** (de 29 con 4 altas a 23
  moderadas o bajas), fijando con `overrides` versiones parcheadas de transitivas que los paquetes
  padre no actualizan: `ws`, `socket.io-parser` y `fast-uri` globales, y `brace-expansion` acotado a
  `@sentry/bundler-plugin-core`. Sigue la crítica del Next.js que empaqueta `react-email`
  (devDependency, solo `npm run email:dev`): se arregla con react-email 6 y queda como deuda. *(d9821f8)*

### Interno
- **Suite de tests completa y viva**: unit con piso de cobertura en `vitest.config.ts`; tests de
  server actions (autorización, validación y ownership: una familia no puede tocar datos ajenos);
  integración contra Postgres real (trigger de asignación, cuotas y sincronización B1/B2→C2, pagos,
  jobs diarios), que solo corre con `INTEGRATION_DATABASE_URL`; 8 specs E2E nuevos y selectores por
  rol y nombre accesible. Al cierre: 873 unit, 33 de integración y 143 E2E (1 salteado a
  propósito, solo aplica al teléfono); cobertura de 97,8% en líneas y 95% en ramas, con piso de
  94/94/95/90 (líneas, statements, funciones, ramas). *(0b73eaf)*
- Scripts para operar la suite: `test:coverage`, `test:integration` (solo con
  `INTEGRATION_DATABASE_URL`), `test:e2e:mobile`, `check:tests` y `hooks:install`. *(0b73eaf)*
- **"Cada cambio trae su test"**: `npm run check:tests` exige un `.test.ts` junto a todo archivo
  nuevo o modificado de domain, utils y actions. Lo corren el pre-push (opt-in con
  `npm run hooks:install`) y el CI. *(0b73eaf)*
- **CI** (`.github/workflows/ci.yml`): job `check` (typecheck, lint, unit con piso de cobertura,
  `check:tests`, `npm audit --omit=dev --audit-level=high` y `next build`) y job `e2e`, que crea una
  branch efímera de Neon, migra, siembra, corre **la integración y Playwright** y borra la branch.
  El E2E usa `next dev` a propósito, para no meter en producción un flag que afloje el rate limit o
  el storage (la variable de repo `E2E_SERVER=start` prueba contra `next start` a mano). Si faltan
  los secrets `NEON_API_KEY` y `NEON_PROJECT_ID`, el job se saltea sin fallar y no corren ni la
  integración ni los E2E. *(0b73eaf)*
- El seed demo re-fija la contraseña, el rol y el estado de las cuentas `test.*` existentes; el
  teardown de E2E borra los documentos huérfanos. *(0b73eaf)*
- DevDependencies `@vitest/coverage-v8` (misma versión que vitest) y `@axe-core/playwright`,
  instalada pero **todavía sin usar**: `tests/e2e/a11y-basico.spec.ts` sigue con los chequeos de
  accesibilidad hechos a mano. *(075abe3)*
- Guarda de lint que marca hex y paleta default de Tailwind fuera de los tokens; proyecto Playwright
  con viewport de teléfono (`@mobile`) y chequeos de accesibilidad. *(b637764)*
- `sections.tsx` del sitio público (1.075 líneas) partido por sección y archivos a kebab-case; primer
  `next build` de producción del programa. *(72d596c)*

## 2026-09-09 — Programa de adecuación: performance

### Cambiado
- **Listados más rápidos**: paginación real en la base (antes se traía la tabla entera y se cortaba
  en memoria); el resumen de Pagos se calcula en la base, así los totales no dependen de la página
  visible. *(ec6b2d3)*
- Portal de Familias, dashboard, ficha de alumno y detalle de viaje con menos consultas por
  pantalla (lo independiente en paralelo, sesión y alumno resueltos una vez por request). *(ec6b2d3)*
- Imágenes de la landing en WebP: de ~11 MB a 2,9 MB sin cambiar el diseño. Skeletons por sección
  en el Portal de Familias. *(ec6b2d3)*

### Corregido
- Un DNI duplicado responde "Ya existe un alumno con ese DNI" en vez de un error 500, en el alta y en
  el webhook. *(ec6b2d3)*

### Seguridad
- El kanban de Prospectos deja de mandar al navegador filas completas (incluían el token de baja y
  las notas). *(ec6b2d3)*
- Un `loading.tsx` en `familias/` hacía que pedir el DNI de otra familia respondiera 200 en vez de
  404 (el contenido nunca se filtró). Queda documentado para que no vuelva. *(ec6b2d3)*

### Interno
- Índices que faltaban: DNI de alumno (ahora único), familia del alumno, asignaciones por
  viaje+estado y cuotas por asignación. *(ec6b2d3)*

## 2026-09-08 — Programa de adecuación: base y seguridad

### Agregado
- **"Mi cuenta"**: cambiar la contraseña estando logueado. *(682de81)*
- Pantallas de error y "no encontrado" propias para el back-office y el Portal de Familias. *(682de81)*
- En Configuración: estado de los servicios externos y preview de las plantillas de mail (venían del
  playground `/tests`). *(682de81)*

### Cambiado
- **Se terminaron las contraseñas temporales por mail**: familias y equipo reciben un link para crear
  la suya. Vincular un alumno a una cuenta de familia que ya tiene otros alumnos pide confirmación
  explícita. *(682de81)*
- Desactivar un usuario o cambiarle el rol aplica en el request siguiente, no a los 5 minutos.
  El link de reset dura 24 h, como promete el mail. *(682de81)*
- Cancelar un viaje ya no manda los mails dentro de la acción: se encolan en Trigger.dev (hasta 3
  intentos, sin timeout con grupos grandes). Mientras Trigger.dev no esté desplegado, **el aviso a
  las familias no sale**: la cancelación se completa igual y el error va a Sentry. *(682de81)*

### Seguridad
- Registro público cerrado en la capa de auth (no solo en el proxy); el rol por defecto de un alta
  pasa a ser el de menor privilegio. *(682de81)*
- **Documentos siempre privados**: se sirven solo por `/api/uploads/<key>` con sesión y dueño
  verificado; el tipo de archivo se valida por su contenido; sin R2 configurado, producción falla
  en vez de escribir al disco del server. *(682de81)*
- Rate limit propio en los formularios públicos, secreto del webhook del Google Form comparado en
  tiempo constante, `returnTo` del login saneado. *(682de81)*
- Headers de seguridad: HSTS, Permissions-Policy y CSP en modo Report-Only. *(fdf8e20)*

### Eliminado
- **Design Lab** (`/design`, ~15 mil líneas) y `public/design`. Sobreviven los tokens en
  `src/styles/`; el tag `design-lab-final` conserva el lab completo. *(fdf8e20)*
- Playground interno `/tests`: la ruta se borró. El estado de servicios y el preview de plantillas
  pasaron a Configuración. *(682de81)*
- Docs obsoletos: `START_HERE.md`, `forms-implementation.md`, `PRD-MODULO-8-STACK.md`. El sistema de
  diseño pasa a `docs/design-system.md`. *(fdf8e20)*

### Interno
- Contrato único de server actions (`src/lib/actions/result.ts` y `safe-audit.ts`; antes
  `ActionResult` estaba copiado en 15 archivos y `safeAudit` en 14); Drizzle crudo fuera de actions,
  webhook y jobs; `src/lib/routes.ts` (creado el 06/09) pasa a alimentar también el shell. *(fdf8e20)*
- `EMAIL_DRY_RUN` para que tests y seeds no manden mails reales; E2E reproducibles con dos familias
  demo. *(682de81)*

## 2026-09-06 — Programa de adecuación: higiene de dependencias

### Seguridad
- Dependencias con CVEs actualizadas: Next 16.3.4, Better-Auth 1.7.3 (con las columnas que exige),
  Sentry 10.73, Trigger.dev SDK 4.5.16, Playwright 1.63. *(16e69f3)*

### Eliminado
- Dependencias sin uso: `lucide-react`, `date-fns`, `date-fns-tz`, `@aws-sdk/s3-request-presigner`;
  assets obsoletos del repo. *(16e69f3)*

### Interno
- `src/lib/routes.ts` como fuente única de prefijos de rutas para el proxy, `robots` y el `returnTo`
  del login. *(16e69f3)*

## 2026-07-27 — CRM de Prospectos

### Agregado
- **Módulo Prospectos** (`/prospectos`): pipeline Kanban y vista tabla; alta suelta, pegado o CSV;
  ficha con timeline de comunicaciones y notas; **outreach por mail** desde un subdominio de
  marketing, con desuscripción en `/baja` y tracking de entrega/apertura por webhook; botón
  "Convertir a colegio cliente". El envío real requiere el DNS de `mkt.jovenesenuk.com` y
  `EMAIL_FROM_OUTREACH`; el tracking de entrega y apertura, además, `RESEND_WEBHOOK_SECRET` (sin ella
  el webhook ignora los eventos). *(783c11d)*

### Corregido
- Portal de Familias, Pagos: con varios viajes, la pestaña arranca en el primero que tiene plan de
  cuotas (antes podía abrir en un estado vacío). *(55d9233)*

## 2026-07-21 — Demo, mobile y PWA

### Agregado
- **Back-office y Portal de Familias usables en el teléfono** (menú hamburguesa, formularios y grillas
  que apilan). *(36cf5e8)*
- **PWA instalable** en Android e iOS, con service worker conservador (nunca cachea datos
  autenticados) y pantalla offline. *(8fca839)*
- Plan y scaffold de la **app nativa con Capacitor** en `docs/mobile-app/`. *(7d48324)*

### Corregido
- "Marcar principal" en los Group Leaders del viaje fallaba siempre. *(3e902f4)*
- Alertas del dashboard con fechas bien formateadas y links que ya no daban 404. *(3e902f4)*
- Guardar proveedor o costo de un paso del viaje ya no borra la cobertura por alumno. *(3e902f4)*
- Los vencimientos de cuotas ya no se desbordan a fin de mes (31/01 → 28/02). *(3e902f4)*
- Portal de Familias: no se vacía con viajes en curso o finalizados; los pasos bloqueados ya no
  muestran "Requiere acción"; la completitud excluye los opcionales. *(3e902f4)*
- B1/B2 pasan a solo lectura en el tablero (su estado lo deriva el plan de cuotas); A3 sincroniza su
  sub-estado; umbral real de cupo mínimo en el dashboard. *(3e902f4)*
- SEO: se quitaron reseñas y calificaciones inventadas del structured data. *(3e902f4)*

## 2026-06-15 — Sitio público

### Agregado
- **Sitio de marketing**: landing, quiénes somos, salidas, programas, contacto, blog `/notas` y
  `/consulta`, con sitemap, canonicals, imágenes OG, JSON-LD, GA4 y redirects del sitio Wix. *(db6b5b2)*
- **Captura de leads** y panel `/consultas` en el back-office, con aviso por mail al equipo. *(db6b5b2)*
- Calendario que navega por meses y años, fecha tipeable (DD/MM/AAAA), DNI con separador de miles y
  botón de cerrar sesión en el back-office. *(37132e9)*

### Corregido
- Login en producción: el proxy no reconocía la cookie segura de sesión y rebotaba en loop. *(73714d5)*

## 2026-06-14 — Portal de Familias por módulos

### Agregado
- Portal de Familias navegable por módulos con URL por DNI: Resumen, Documentación, Pagos, Viaje y
  Mis datos, con menú lateral en desktop y tabs en el teléfono. *(25b124a)*
- La familia puede subir documentación, reportar el ETA, confirmar pasos y reportar un dato
  incorrecto. *(b3aefac)*
- Pagos detallado (abonado, saldo, filtro y detalle por cuota), breadcrumb y alertas accionables en
  el Resumen. *(02cde34)*
- Playground interno: toasts con título y descripción, estado de servicios y preview de
  plantillas. *(bec1e05)*

### Interno
- `.env.local*` ignorado por git; E2E sin carreras con el buscador. *(8df0592, 7298e91, 67c660c)*

## 2026-06-13 — Feedback, slugs y base del Portal de Familias

### Agregado
- **Toasts** del sistema de diseño y aviso de **cambios sin guardar** en los formularios. *(7f7a4c7)*
- **URLs legibles**: el viaje por código (`/viajes/UK-2026-JUL-LONDON`) y el alumno por DNI. *(0162ba1)*
- Base del **Portal de Familias** (rol `familia`, alumnos del grupo, ficha de solo lectura). *(1b4ac38)*
- Foto de fondo opcional en el panel del login; playground interno `/tests`. *(2eeacf5, 461d03f)*

### Interno
- Teardown de E2E: la suite deja de acumular datos en la base de desarrollo. *(1b4ac38)*

## 2026-06-12 — Tablero M6, cuotas, documentos y auditoría

### Agregado
- **Tablero M6** en la ficha del alumno (Paso 0 + grupos A-D) con transiciones validadas y
  auditadas. *(66eb5bf)*
- **Plan de cuotas B1/B2** multi-moneda con sincronización del tablero (C2 se desbloquea con B1). *(8428876)*
- **Dashboard con alertas reales** (pasaporte, mora, pasos bloqueados, police checks), ocupación y
  completitud de viajes. *(a6ad9c3)*
- **Alta de alumnos por el Google Form** con auto-asignación al viaje, y **credenciales del Portal de
  Familias**. *(5cccd5e)*
- **Documentos** adjuntos a los pasos, en R2 con fallback local. *(c054801)*
- **Transfers y tarjetas por alumno** en el M7. *(9bbac7f)*
- **Recordatorios** automáticos de A1 y D1 con deduplicación (el job de Trigger.dev quedó
  implementado, sin desplegar). *(2447736)*
- Lo que faltaba de la spec: sub-estados de ETA y Parental Consent, filtro de alumnos con pasos
  bloqueados, viajes del próximo año, re-validación de pasaportes al cambiar fechas, aviso a
  familias al cancelar, transiciones automáticas por fecha. *(2b77ed5)*
- **Módulo Pagos** global y sección Pagos del viaje. *(d7b9152)*
- **Configuración**: remitentes de mail configurables y envío de prueba. *(5a54159)*
- Confirmaciones del sistema de diseño (sin `window.confirm`), selects con búsqueda, calendario
  propio, paginación de 50 por página y sidebar fijo. *(9ce0f0a)*
- Skeletons en todos los estados de carga y navegación instantánea. *(1e158b8, 3a1f3ce)*
- Cuentas de test y `npm run db:seed:demo` con un dataset que cubre todas las ramas. *(a59b1ae)*

### Cambiado
- **Dirección visual STUDIO** aplicada a toda la app. *(216c4e5)*
- La raíz `/` pasa a ser pública, reservada para la landing que llega el 15/06, y el `returnTo` del
  login solo acepta paths internos. *(cc8f0e9)*

### Corregido
- Revisión adversarial: mora calculada por día calendario, C2 ya no pisa documentos al
  desbloquearse, ownership verificado del lado del server, re-chequeo del estado del viaje al
  asignar. *(ecc858c)*

### Interno
- E2E del recorrido completo del negocio (colegio → viaje → alta por webhook → tablero → cuotas →
  documento → M7 → dashboard). *(c9b88bc)*

### Seguridad
- El registro público de Better-Auth quedó bloqueado (creaba usuarios admin). *(ecc858c)*

## 2026-06-11 — PRDs de junio y fundaciones del modelo

### Agregado
- Specs internas de los 4 PRDs de junio 2026 en `docs/prd/`, con dos rondas de revisión. *(b63c51c, 235c6bf, c8f1e21)*
- Decisiones del 11/06: cero gates rojos (CRIT-04 y CRIT-05 ⭐). *(910c8c3)*
- **Viajes**: tipo grupal/individual, JUK directo y flujo de pago derivado; máquina de
  estados. *(fc232db, 4b84f1b)*
- **Colegios**: configuración documental y tipo de entrada. *(3a3fc8d)*
- **Pasos** Paso 0 + A/B/C/D y **trigger de asignación** (tablero, validación de pasaporte,
  confirmación automática al 5.º). *(ba70fc9, 0e61b8a)*
- **Login**: rate limit de 5 intentos de inicio de sesión cada 15 minutos, guardado en la base.
  Cuenta todos los intentos, no solo los fallidos: Better-Auth no avisa cuándo un login
  falla. *(653db75)*
- **Seguimiento M7** y Group Leaders del viaje. *(8ed793b)*
- Design lab en `/design` y primera aplicación de STUDIO. *(2f2bed8, f88c614)*

### Corregido
- Reasignar un alumno cancelado ya no choca con la restricción de unicidad. *(cb4645e)*
- El login funciona en cualquier puerto de desarrollo. *(3828f36)*

### Interno
- Vitest para el dominio, specs E2E por módulo, `/juk-cierre` como Definition of Done y unit tests
  en el CI. *(6ba2285, f9db556, 787abe5, bd8e57d)*
- `group_leaders_viaje.es_principal` pasa a boolean con FK real al Group Leader;
  `colegios.requiere_test_nivel`. *(c0bec84)*
- Estilos inline pasados a utilidades Tailwind con tokens. *(8934728)*

## 2026-05-23 — ABMs y asignaciones

### Agregado
- ABMs de **Alumnos**, **Group Leaders** y **Gestión de Usuarios**. *(a0ca69f)*
- **Asignar alumnos a viajes** desde el detalle del viaje, con cupo y validación de
  pasaporte. *(d716b95)*
- Dashboard con datos reales, 404 propio, y los ítems del menú todavía no construidos marcados
  "Pronto" (no clickeables) en vez de links a un 404. *(ac0debf)*

### Interno
- Suite de Playwright y documentación de handoff en `.claude/docs/`. *(485d7cb, 50c12cf)*

## 2026-05-22 — La app corre

### Agregado
- ABM completo de **Colegios** y de **Viajes**. *(fe7714d, df80456)*
- `GlobeLoader` como loader de la app (hoy existe pero no se usa: los estados de carga son
  skeletons). *(7266747)*

### Interno
- Migración inicial, compatibilidad con Next 16 y fixes para que la app corra de punta a punta;
  harness con agente de infra, `/juk-setup` y CI. *(2f22927, 4db780d, dadea2b, 51193cc, 834346c)*

## 2026-05-21 — Scaffold

### Agregado
- Scaffold de Next.js 16 (auth, reset de contraseña, shell, sistema de diseño, schemas Drizzle,
  plantillas de mail) y harness de Claude Code. *(1e8779d)*
