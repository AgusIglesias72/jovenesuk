# JUK Portal — Probemos esto 🧪

Esto es el portal de **Jóvenes en UK** corriendo en un entorno de prueba. Hay dos
mundos para mirar: el **back-office** (donde el equipo gestiona viajes, alumnos,
pagos y documentación) y la **web pública** (lo que ve una familia que llega
buscando un viaje de estudio). Todos los datos son ficticios, así que metete
tranquilo y tocá lo que quieras: no hay nada que se pueda romper.

Abajo te cuento cómo entrar, qué hay en cada parte y qué nos sirve que mires.

---

## Cómo entrar

**Portal interno:** https://jovenesuk.vercel.app/login

Hay dos cuentas, según cuánto quieras ver. La contraseña **te la pasamos por privado**
(WhatsApp o mail); no la compartas ni la pegues en ningún grupo.

| Cuenta              | Email                              | Qué ve                                            |
| ------------------- | ---------------------------------- | ------------------------------------------------- |
| **Acceso total**    | `test.superadmin@jovenesenuk.com`  | Todo, incluido Usuarios y Configuración del sistema |
| **Admin del equipo**| `test.admin@jovenesenuk.com`       | La experiencia del día a día del equipo JUK         |

La **web pública** no necesita login: entrás directo a https://jovenesuk.vercel.app.

---

## El back-office, por dentro

Es el sistema con el que el equipo lleva toda la operación. Lo que vas a encontrar:

**Dashboard.** La foto del día: alertas que requieren atención, viajes próximos,
pagos vencidos. La idea es que de un vistazo sepas dónde hay que meter mano.

**Alumnos.** El corazón del sistema. Cada alumno tiene una **ficha completa** —su
expediente— con un **tablero de pasos** que ordena toda la burocracia del viaje:
documentación que pide cada colegio, estado del pasaporte, consentimientos de los
padres si es menor, pagos, etc. El tablero se arma solo según la edad del alumno,
el destino y el tipo de viaje, así que no es la misma checklist para todos.
Si cargás un alumno nuevo vas a ver el **calendario** (podés saltar por mes y año,
o tipear la fecha directo) y el **DNI con separador de miles**.

**Viajes.** Cada viaje es una salida concreta, con su colegio de destino, fechas,
cupos, group leaders y el seguimiento alumno por alumno. Hay de los cuatro
sabores: grupales e individuales, a distintos países y con distintos orígenes
(salida propia, instituto, colegio cliente).

**Colegios y Group Leaders.** El catálogo de instituciones (cada una con su propia
exigencia documental y tipo de entrada al país) y los líderes que acompañan los
grupos, con el estado de su *police check* (la habilitación para viajar con menores).

**Pagos.** Planes de cuotas por alumno, registro de pagos y mora.

**Consultas.** Acá caen los formularios que la gente completa en la web pública
(ver más abajo). Es el puente entre el marketing y la gestión.

**Usuarios y Configuración** (solo con la cuenta de acceso total): alta de gente
del equipo y ajustes generales.

Para salir: el botón abajo a la izquierda, en el recuadro con tu nombre.

---

## La web pública

Es el sitio que ve una familia buscando un viaje de inglés al exterior. Está la
home, las páginas de **Salidas**, **Programas**, **Quiénes somos** y **Contacto**,
más un **blog** con notas y guías (pensado para que la gente nos encuentre en Google).

Lo más importante para probar es el formulario **"Pedí tu propuesta"**
(https://jovenesuk.vercel.app/consulta): completalo y enviá. Esa consulta aparece
después en la sección **Consultas** del back-office. Ese es el circuito completo
"familia interesada → equipo la atiende".

---

## Qué estás mirando (el set de datos demo)

Para que el portal no esté vacío, cargamos un escenario ficticio que cubre los
casos típicos del negocio. Algunos detalles para que sepas qué tenés delante:

- **Cuatro viajes** que representan las variantes reales: *Wimbledon Septiembre*
  (grupal a Reino Unido, el más completo y avanzado), *Dublín Octubre* (grupal a
  Irlanda), *NEA Londres* (un colegio cliente) e *Individual Toronto* (un alumno solo).
- **Seis alumnos** de distintas edades (15 a 19), con pasaportes en distinto
  estado: alguno OK, otro a punto de vencer, otro demasiado corto para el viaje.
- **Group leaders** con la habilitación en tres estados: una al día, una en
  trámite y una vencida (esta última **bloquea** el viaje hasta resolverse).

Un par de cosas interesantes para gatillar a propósito:

- En *Wimbledon Septiembre* vas a ver un tablero bien poblado: un alumno bastante
  avanzado y otro recién arrancando.
- Si asignás al alumno **"Juan Demo Pasaporte"** a un viaje, salta una **advertencia**
  porque su pasaporte vence antes de que termine la salida.
- Comparando *Dublín* (Irlanda) con *Wimbledon* (UK) vas a notar que la
  documentación pedida es distinta: cada destino exige cosas diferentes.

---

## Qué nos sirve que mires

No hace falta que sigas ningún libreto: entrá, curioseá y anotá lo que te llame
la atención. Lo que más nos sirve:

- ¿Se entiende solo, sin que nadie te explique? ¿Dónde te trabaste o dudaste?
- Textos confusos, raros o con errores.
- Algo que esperabas encontrar y no estaba, o que está pero en un lugar raro.
- Lo que se vea feo, desalineado o lento.
- En el celular: ¿se usa cómodo?

---

## Para pasarnos el feedback

Juntá todo (con captura si podés) y mandanos por **[WhatsApp / mail / el canal que usemos]**.
No hay comentario chico — todo suma para dejarlo redondo antes del lanzamiento.

> *Las cuentas y los datos de esta prueba son temporales y se borran antes de salir
> en vivo. No cargues datos personales reales.*
