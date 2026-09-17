# 07 · Web pública, consultas y CRM de prospectos

> **Fuente:** estos módulos **no tienen PRD de producto**. Se construyeron a pedido (web pública y
> leads en junio, CRM en julio, endurecimiento en septiembre de 2026). Esta spec describe lo
> construido y funciona como contrato vigente: un cambio de regla se discute, se escribe acá y,
> si queda una duda, se registra en [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md).
> Gaps en [06 §B](06-deltas-implementacion.md#fuera-de-los-prds-de-junio-spec-07).

El objetivo común es **captar**: la web pública trae familias y colegios interesados; las consultas
les dan seguimiento; el CRM organiza la venta a colegios e instituciones. Ninguno de los tres crea
alumnos: el alta de alumnos sigue siendo el webhook del Google Form o la carga manual (spec 02, M5).

---

## 1. Web pública

### Rutas y dominio

- Páginas públicas (fuente: `PUBLIC_PAGES` y `PUBLIC_PREFIXES` en `src/lib/routes.ts`): `/`,
  `/quienes-somos`, `/salidas`, `/programas`, `/contacto`, `/consulta` y `/notas` (con
  `/notas/[slug]` e imagen OG por nota). No piden sesión.
- **Dos dominios sobre el mismo deploy:** si están `NEXT_PUBLIC_PORTAL_URL` y
  `NEXT_PUBLIC_SITE_URL`, el marketing vive en la raíz y la gestión en `portal.*`; el proxy
  redirige cada ruta a su dominio. Sin esas variables, todo convive en un solo dominio.
- Redirects 301 desde las URLs del sitio Wix anterior (`next.config.ts`).
- Medición con GA4 (`src/app/(public)/analytics.tsx`).

### Próxima salida grupal

- La portada y `/salidas` anuncian la próxima salida grupal (dos por año: febrero y julio).
- La fuente es un calendario en código (`src/lib/domain/salidas/proxima-salida.ts`), no la tabla
  `viajes`. Una salida sigue siendo "la próxima" durante todo su mes. Si el calendario se agota, el
  banner desaparece: nunca muestra una fecha vencida. Hoy llega hasta julio 2028 (MIN-23).

### Formulario de consulta

| Campo | Regla |
|---|---|
| Nombre, apellido | Obligatorios, 2 a 60 caracteres |
| Email, teléfono | Obligatorios |
| Para quién | Para mí · Para mi hijo/a · Para mi colegio o institución |
| Institución | Opcional |
| Modalidad | Asesoramiento · Salida grupal · Salida individual · Study & Work |
| Destino | Opcional (lista de países o "Todavía no lo decidí") |
| Cuándo | Próximos 3 meses · Este año · El año que viene · Solo averiguando |
| Mensaje | Opcional |
| Acepta | Consentimiento obligatorio. El texto sale de `TEXTO_CONSENTIMIENTO` (`src/lib/domain/privacidad/politica.ts`), dice para qué se usan los datos y **linkea la [Política de Privacidad](#politica-de-privacidad)** |

Opciones y validación: `src/lib/domain/leads/schema.ts` (la misma para el formulario y la action).

Reglas (`submitLead` en `src/app/(public)/leads/actions.ts`):

1. **Honeypot:** si el campo oculto `website` viene lleno, responde éxito sin guardar nada.
2. **Rate limit** (`src/lib/domain/anti-abuso.ts`): hasta 5 envíos por IP cada 10 minutos y 3 por
   email por hora. Pasado el límite, se le pide a la persona que reintente más tarde.
3. La consulta se guarda en `consultas` con estado **Nueva**.
4. **Aviso al equipo** por mail, encolado en Trigger.dev (`notificar-consulta-nueva`) y con envío
   directo si Trigger no responde. Si el mismo email ya consultó por el mismo interés en las
   últimas 24 h, la consulta se guarda igual pero no se repite el aviso.

### Formulario de inscripción (`/inscripcion`)

El **Application Form propio**, que reemplaza al Google Form externo. La familia llega por el link
de un mail; la ficha tiene los mismos campos que aceptaba el webhook (alumno, pasaporte, tutor,
salud, preferencias) y se guarda **siempre** en la tabla de aterrizaje `inscripciones`.

Reglas (`enviarInscripcion` en `src/app/inscripcion/actions.ts`), en este orden:

1. **Validación** con `inscripcionSchema`. El DNI se normaliza a dígitos (TEC-12). El schema no
   acepta `viajeId`, `alumnoId` ni `estado`: se derivan del token en el servidor.
2. **Honeypot** `website`: si viene relleno, responde éxito sin guardar nada.
3. **Rate limit** por IP (20 cada 10 minutos, más ancho que los otros formularios porque varias
   familias del mismo colegio comparten red), por email (3/h) y por token (60/h).
4. **El token resuelve la campaña**, no la identidad: de él salen el viaje, el prospecto de origen y
   la variante visual. No lleva datos personales, así que el link se puede reenviar a muchas
   familias y cada una carga lo suyo. Un token inválido, vencido o revocado no frena la carga: la
   ficha se guarda igual, sin contexto y marcada para revisión.
5. **Persistencia y después los mails**: acuse a quien completó (con su código `INS-000123`, y sin
   un solo dato sensible: el mail queda en un buzón que no controlamos) y aviso al equipo. Si un
   mail falla, la familia igual ve el éxito: su ficha ya está guardada.

Abrir el link **no escribe nada**: solo un envío del formulario crea la ficha. Es deliberado — los
escáneres de links de Outlook y los antivirus corporativos abren las URLs de un mail solos.

Estados de una ficha: `recibida` · `procesada` · `duplicada` (ese DNI ya estaba) ·
`requiere_revision` (llegó sin token válido, o el alta tocaría una cuenta de familia que ya existe)
· `error` (con el motivo, y se puede reintentar) · `anulada`. La bandeja `/inscripciones` los filtra
y muestra los conteos por estado y por variante.

### Política de Privacidad

`/privacidad` publica el texto vigente y `/privacidad/<version>` una versión anterior. El texto es
un **dato versionado** (`POLITICA_ACTUAL` e `HISTORIAL_POLITICAS` en
`src/lib/domain/privacidad/politica.ts`), no markup suelto: cada consentimiento guarda qué versión
aceptó la persona, así que una versión vieja tiene que poder seguir leyéndose. Editar el copy
**obliga a subir la versión** (lo exige `politica.test.ts`).

La política declara lo que el sistema hace hoy, incluido lo que todavía no hace: el borrado de la
ficha de un alumno ya procesado, de sus documentos y de las consultas es manual y a pedido, porque
la purga automática recién llega con el módulo de inscripciones. Los plazos de retención ya están
definidos en `src/lib/domain/privacidad/retencion.ts`. Falta la revisión legal del texto y los datos
registrales del responsable (`docs/estado-actual.md` §7).

### Newsletter

- Email + honeypot, con el mismo rate limit. Se guarda en `suscriptores` (email único, estado
  activo/baja, origen).
- No hay pantalla en el back-office para verlos ni exportarlos (gap).

### Herramienta interna de diseño

`DesignTweaker` (`src/app/(public)/design-tweaker.tsx`) permite probar colores, radios y textos en
vivo con `?tweak` en la URL. Se monta solo en desarrollo o con `NEXT_PUBLIC_ENABLE_TWEAK=1`. **No
es para el público:** esa variable no se activa en producción.

---

## 2. Consultas (back-office `/consultas`)

- Listado paginado en SQL con búsqueda y filtro por estado.
- Estados: **Nueva · Contactada · Descartada**. El cambio se hace desde la fila, sin orden
  obligatorio, y queda auditado (`cambiarEstadoConsultaAction`).
- No se puede borrar ni exportar una consulta (MIN-16).

---

## 3. CRM de prospectos (back-office `/prospectos`)

Seguimiento comercial de colegios e instituciones que JUK quiere captar.

### Pipeline

- Estados en orden de columna: **Nuevo → Contactado → Interesado → Propuesta → Negociación →
  Ganado / Perdido** (Ganado y Perdido son terminales). Fuente: `src/lib/domain/prospectos/pipeline.ts`.
- Cualquier movimiento manual entre columnas es válido; mover una tarjeta a su propia columna no
  es un cambio.
- Dos vistas: **kanban** (las 7 columnas completas, sin paginar; en pantallas táctiles cada
  tarjeta ofrece "Mover a…" porque el arrastre de HTML5 no funciona con el dedo) y **tabla**
  paginada (`?vista=tabla`).

### Alta e importación

- De a uno desde el formulario, o en lote desde `/prospectos/importar` pegando texto o subiendo un
  CSV.
- El parser (`src/lib/domain/prospectos/csv.ts`) detecta el separador (coma, punto y coma o tab),
  soporta comillas y saltos de línea dentro de comillas, y reconoce los encabezados sin importar
  mayúsculas ni acentos. Devuelve las filas válidas y la lista de errores.

### Ficha

- Datos del colegio y del contacto, imagen (hasta 5 MB, al storage privado), notas.
- **Timeline de comunicaciones** (`prospecto_comunicaciones`): email, nota, llamada, reunión,
  cambio de estado y conversión.

### Outreach por mail

- Se envía desde el remitente de marketing (tipo `marketing` en `src/lib/email/index.ts`, un
  subdominio propio para no comprometer la reputación del dominio principal).
- Cada mail lleva `List-Unsubscribe` de un clic y guarda el id de Resend.
- El webhook `/api/webhooks/resend` verifica la firma Svix (HMAC propio, tolerancia de 5 minutos)
  y actualiza el estado de la comunicación: entregado, abierto, click, rebotado o spam.
- **Baja:** `/baja?token=…` (token único por prospecto) da de baja al prospecto de las
  comunicaciones sin pedir sesión.
- El envío real depende del DNS del subdominio de marketing y de `RESEND_WEBHOOK_SECRET` (estado en
  `docs/estado-actual.md`). Sin eso, el resto del CRM funciona.

### Conversión

"Convertir a colegio cliente" crea el colegio en el ABM de Colegios y marca el prospecto como
Ganado.

---

## 4. Puntos de contacto con el portal interno

| Dato | Dueño | Cómo lo consume el resto |
|---|---|---|
| Colegio convertido | CRM | Aparece en el ABM de Colegios (spec 02, M3) |
| Remitentes de mail | `/configuracion` (MIN-09) | Outreach, avisos de consultas y todos los mails del portal |
| Rutas públicas | `src/lib/routes.ts` | Proxy, `robots.ts` y saneo de `returnTo` |

## 5. Pendiente y decisiones

- **MIN-16** privacidad de los leads: **parcialmente resuelta** (política publicada y versionada,
  consentimiento que la linkea, plazos de retención definidos). Queda la purga automática y el
  borrado a pedido de consultas y suscriptores.
- **MIN-23** calendario de salidas mantenido a mano.
- Suscriptores sin pantalla en el back-office.
