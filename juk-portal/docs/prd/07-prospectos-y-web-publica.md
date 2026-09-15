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
| Acepta | Consentimiento obligatorio |

Opciones y validación: `src/lib/domain/leads/schema.ts` (la misma para el formulario y la action).

Reglas (`submitLead` en `src/app/(public)/leads/actions.ts`):

1. **Honeypot:** si el campo oculto `website` viene lleno, responde éxito sin guardar nada.
2. **Rate limit** (`src/lib/domain/anti-abuso.ts`): hasta 5 envíos por IP cada 10 minutos y 3 por
   email por hora. Pasado el límite, se le pide a la persona que reintente más tarde.
3. La consulta se guarda en `consultas` con estado **Nueva**.
4. **Aviso al equipo** por mail, encolado en Trigger.dev (`notificar-consulta-nueva`) y con envío
   directo si Trigger no responde. Si el mismo email ya consultó por el mismo interés en las
   últimas 24 h, la consulta se guarda igual pero no se repite el aviso.

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

- **MIN-16** privacidad de los leads (página de política, retención, borrado).
- **MIN-23** calendario de salidas mantenido a mano.
- Suscriptores sin pantalla en el back-office.
