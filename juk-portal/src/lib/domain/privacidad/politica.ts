/**
 * Fuente ÚNICA de la Política de Privacidad (MIN-16, Ley 25.326).
 *
 * El texto vive acá y no en la página: la versión que la familia aceptó se
 * guarda junto al consentimiento, así que el copy tiene que ser un dato
 * versionado y no markup suelto. Cambiar una palabra de `POLITICA_ACTUAL`
 * obliga a subir `version` y a sumar la anterior a `HISTORIAL_POLITICAS`
 * (lo fuerza `politica.test.ts`): si no, un consentimiento viejo apuntaría a
 * un texto que ya nadie puede leer.
 *
 * El `cuerpo` de cada sección es texto plano; los párrafos se separan con una
 * línea en blanco (`\n\n`) y quien renderiza decide cómo mostrarlos.
 *
 * REGLA DE CONTENIDO: describe lo que el sistema hace HOY. Donde algo no está
 * resuelto (retención de la ficha del alumno y de los documentos: MIN-16 y
 * TEC-02, abiertas en OPEN_DECISIONS.md) se dice explícitamente, en vez de
 * prometer un borrado automático que no existe.
 */

import { EMAIL } from "@/lib/contact";

export type SeccionPolitica = {
  titulo: string;
  cuerpo: string;
};

export type VersionPolitica = {
  /** Identificador de la versión, en formato AAAA-MM-DD. */
  version: string;
  vigenteDesde: Date;
  /** Una frase para el encabezado de la página y el mail de aviso de cambio. */
  resumen: string;
  secciones: readonly SeccionPolitica[];
};

/** Texto exacto que se linkea dentro del consentimiento. */
export const ENLACE_POLITICA = "Política de Privacidad";

export const POLITICA_ACTUAL: VersionPolitica = {
  version: "2026-09-16",
  vigenteDesde: new Date("2026-09-16T00:00:00.000Z"),
  resumen:
    "Qué datos nos das, para qué los usamos, con qué proveedores se comparten, quién los ve dentro de Jóvenes en UK y cómo pedís acceder a ellos, corregirlos o borrarlos.",
  secciones: [
    {
      titulo: "Quién es responsable de tus datos",
      cuerpo:
        "Jóvenes en UK es una agencia argentina de viajes de estudio y es la responsable de la base de datos donde se guarda todo lo que sigue. " +
        "Nos regimos por la Ley 25.326 de Protección de los Datos Personales de la República Argentina.\n\n" +
        `Para cualquier tema de privacidad escribinos a ${EMAIL}. Ese es el canal por el que se ejercen los derechos que se explican más abajo.`,
    },
    {
      titulo: "Qué datos pedimos y para qué",
      cuerpo:
        "Formulario de consulta de la web: nombre, apellido, email, teléfono, para quién es el viaje, colegio o institución (si consultás por una institución), modalidad, destino, cuándo pensás viajar y el mensaje que escribas. " +
        "Los usamos para responderte y hacer el seguimiento comercial de esa consulta, y quedan en el panel interno con un estado (nueva, contactada o descartada).\n\n" +
        "Newsletter: solo el email y desde qué parte del sitio te suscribiste. Lo usamos para mandarte novedades, y en cada envío hay un link para darte de baja.\n\n" +
        "Inscripción a un viaje: nombre y apellido tal como figuran en el pasaporte, fecha de nacimiento, DNI, número y vencimiento del pasaporte, teléfono y email del alumno, nombre, celular y email del adulto responsable, alergias y datos de salud relevantes, preferencias de alojamiento y autoevaluación del nivel de inglés. " +
        "Esos datos son los que se necesitan para inscribir al alumno, emitir la documentación del viaje, reservar el alojamiento y atender una urgencia de salud durante la salida. " +
        "Si hace falta facturar, también guardamos razón social, CUIT/CUIL, condición fiscal y domicilio.\n\n" +
        "Cuenta del Portal de Familias: el email del adulto responsable y una contraseña que se guarda siempre cifrada (nunca en texto plano).\n\n" +
        "Datos técnicos: cuando enviás un formulario público guardamos tu dirección IP por un rato, solo para limitar los envíos automatizados (spam). " +
        "Las operaciones importantes dentro del portal quedan en un registro de auditoría con el usuario que las hizo, la fecha, la dirección IP y el navegador.",
    },
    {
      titulo: "Datos de menores de edad",
      cuerpo:
        "La mayoría de los alumnos son menores. La inscripción la completa y la consiente el padre, la madre o el tutor legal: es ese adulto quien autoriza el tratamiento de los datos del chico o la chica.\n\n" +
        "Entre esos datos hay información de salud (alergias, medicación, condiciones a tener en cuenta). Es la información más sensible que manejamos y la pedimos con una sola finalidad: cuidar al alumno durante el viaje. " +
        "Dentro del sistema solo la ve el equipo de Jóvenes en UK. Fuera del sistema se comparte únicamente con quien necesita conocerla para la seguridad del alumno durante la salida (el colegio o el alojamiento en destino, el acompañante del grupo o un servicio médico ante una urgencia).\n\n" +
        "No usamos los datos de los menores para publicidad, ni los vendemos, ni los cedemos a terceros con fines comerciales.",
    },
    {
      titulo: "Quién puede ver tus datos dentro de Jóvenes en UK",
      cuerpo:
        "El equipo de Jóvenes en UK (perfiles de administración) ve el back-office completo: alumnos, viajes, pagos y documentos.\n\n" +
        "Cada familia entra a su propio portal y ve únicamente a sus alumnos: el sistema verifica en el servidor que el alumno pertenezca a esa cuenta antes de mostrar nada.\n\n" +
        "Existe además un perfil de representante (el acompañante del grupo), pensado para ver solo los datos del viaje que acompaña. Su portal todavía no está construido: hoy nadie accede con ese perfil.\n\n" +
        "Los cambios importantes quedan registrados con el usuario que los hizo y la fecha.",
    },
    {
      titulo: "Dónde se guardan y con qué proveedores se comparten",
      cuerpo:
        "Para que el sistema funcione usamos proveedores que tratan los datos por cuenta nuestra, y solo para prestarnos su servicio:\n\n" +
        "· Neon (base de datos PostgreSQL), alojada en São Paulo, Brasil.\n" +
        "· Vercel, que aloja y sirve la aplicación, también desde São Paulo.\n" +
        "· Cloudflare R2, donde se guardan los documentos, en un bucket privado.\n" +
        "· Resend, que entrega los mails que te mandamos y registra si llegaron, rebotaron o se abrieron.\n" +
        "· Sentry, que recibe los errores técnicos de la aplicación para poder arreglarlos.\n" +
        "· Trigger.dev, que ejecuta las tareas programadas (por ejemplo, los recordatorios).\n" +
        "· Google, si completaste el formulario de inscripción que hoy se envía a través de Google Forms.\n" +
        "· Google Analytics, solo si la medición está activada en el sitio (ver la sección de cookies).\n\n" +
        "Guardar los datos en Brasil y usar proveedores del exterior implica una transferencia internacional de datos personales, en los términos del artículo 12 de la Ley 25.326. " +
        "No compartimos tus datos con nadie más, salvo lo indicado en la sección de menores o cuando una autoridad competente nos lo requiera por ley.",
    },
    {
      titulo: "Cookies y medición",
      cuerpo:
        "Cuando iniciás sesión en el portal se usa una cookie propia para mantenerte identificado. Sin esa cookie el portal no funciona.\n\n" +
        "El sitio público puede cargar Google Analytics para medir visitas. Está apagado salvo que el equipo lo active con una configuración explícita, y cuando está apagado no se carga ninguna cookie de medición.\n\n" +
        "Hoy el sitio no tiene un cartel de cookies ni un interruptor propio para rechazar la medición: si no querés que se te mida, podés bloquear las cookies de terceros desde tu navegador.",
    },
    {
      titulo: "Los documentos que subís",
      cuerpo:
        "Pasaportes, autorizaciones y certificados se guardan en un almacenamiento privado. Nunca se publica una dirección abierta de un documento: se sirven a través de la aplicación, que antes verifica que tengas sesión iniciada y que el documento sea tuyo o de tu alumno.\n\n" +
        "Cada archivo se revisa al subirlo (tipo de archivo y tamaño máximo) para evitar contenido que no corresponda.",
    },
    {
      titulo: "Cuánto tiempo los guardamos",
      cuerpo:
        "Lo que ya tiene plazo definido:\n\n" +
        "· El contenido crudo de una inscripción recibida se borra 90 días después de haber sido procesada.\n" +
        "· Una inscripción que nunca llegó a procesarse se borra a los 2 años.\n" +
        "· Una invitación a completar el formulario que nunca se usó se borra 90 días después de su vencimiento.\n\n" +
        "Lo que todavía no tiene plazo, dicho con todas las letras: la ficha del alumno ya procesado, los documentos que subió y las consultas y suscripciones que entran por la web NO tienen hoy un borrado automático. " +
        "Se conservan mientras dure la relación con la familia y después, salvo que nos pidas que los borremos. " +
        `Si querés que los borremos antes, escribinos a ${EMAIL}: lo hacemos a mano y te confirmamos. ` +
        "Estamos trabajando en definir estos plazos y esta política se va a actualizar cuando queden fijados.\n\n" +
        "Hay datos que, aunque los pidas, tenemos que conservar por un tiempo porque una ley nos obliga (por ejemplo, la documentación de facturación).",
    },
    {
      titulo: "Tus derechos",
      cuerpo:
        "Como titular de los datos (o como responsable del menor titular) tenés derecho a:\n\n" +
        "· Acceso: pedirnos qué datos tuyos tenemos. Es gratuito y podés ejercerlo en intervalos no menores a seis meses, salvo que acredites un interés legítimo. Tenemos 10 días corridos para contestarte.\n" +
        "· Rectificación y actualización: pedirnos que corrijamos un dato equivocado o desactualizado.\n" +
        "· Supresión: pedirnos que borremos tus datos, con el límite de lo que estemos obligados a conservar por ley.\n\n" +
        `Todos se ejercen escribiendo a ${EMAIL}. Para rectificar o suprimir, la ley nos da 5 días hábiles.\n\n` +
        "La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos de quien considere que sus datos no fueron tratados como corresponde.",
    },
    {
      titulo: "Seguridad",
      cuerpo:
        "El sitio y el portal viajan siempre cifrados (HTTPS). Las contraseñas se guardan cifradas y no las conocemos. Los documentos están en un almacenamiento privado y cada acceso pasa por una verificación de sesión y de titularidad. Las operaciones importantes quedan auditadas.\n\n" +
        "Ningún sistema es invulnerable. Si detectamos un incidente que afecte tus datos, te vamos a avisar.",
    },
    {
      titulo: "Cambios en esta política",
      cuerpo:
        "Esta política está versionada por fecha. Cuando aceptás un formulario queda registrada la versión vigente en ese momento, así siempre se puede saber qué texto aceptaste. " +
        "Si el cambio es importante, te lo avisamos por los canales de contacto que nos dejaste.",
    },
  ],
};

/**
 * Todas las versiones publicadas, de la más nueva a la más vieja. La actual
 * está siempre acá: un consentimiento guarda una `version` y tiene que poder
 * resolverse a un texto, incluso años después.
 */
export const HISTORIAL_POLITICAS: readonly VersionPolitica[] = [POLITICA_ACTUAL];

/** Devuelve el texto de una versión guardada en un consentimiento. */
export function buscarPolitica(version: string): VersionPolitica | null {
  return HISTORIAL_POLITICAS.find((p) => p.version === version) ?? null;
}

/**
 * Versión del texto del checkbox. Se versiona aparte de la política: el copy
 * del consentimiento puede cambiar sin que cambie la política, y al revés.
 */
export const VERSION_CONSENTIMIENTO = "2026-09-16";

/**
 * Texto exacto del checkbox de los formularios públicos. Incluye la finalidad
 * (por qué pedimos los datos) y nombra la política, que se muestra como link
 * usando `ENLACE_POLITICA` para partir la frase.
 */
export const TEXTO_CONSENTIMIENTO =
  "Acepto que Jóvenes en UK use mis datos para responder esta consulta y contactarme por sus viajes de estudio, " +
  `y declaro haber leído la ${ENLACE_POLITICA}.`;
