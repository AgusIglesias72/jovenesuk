/**
 * Preguntas frecuentes del Portal de Familias (PRD 04 · US-10.2), por tema.
 *
 * Contenido fijo por ahora: la edición desde el panel interno (US-10.2.2) y el
 * buscador (US-10.2.3) quedan para cuando exista la configuración de contenido.
 * Las respuestas NO inventan reglas de negocio: solo cuentan lo que el portal
 * ya hace hoy.
 */

export type Pregunta = { pregunta: string; respuesta: string };
export type TemaFaq = { tema: string; preguntas: Pregunta[] };

export const FAQ_FAMILIAS: TemaFaq[] = [
  {
    tema: "Documentación",
    preguntas: [
      {
        pregunta: "¿Qué tengo que hacer yo y qué hacen ustedes?",
        respuesta:
          "En Documentación cada trámite dice quién lo mueve. Los que dicen «Lo hacés vos» tienen un botón para subir el archivo o contarnos cómo va. El resto lo gestionamos nosotros y vas a ver el avance ahí mismo.",
      },
      {
        pregunta: "¿Qué es el Parental Consent?",
        respuesta:
          "Es un permiso que firman los padres o tutores para que el colegio pueda cuidar al alumno mientras es menor de edad. Alcanza con la firma de uno de los dos. Se firma a mano, le sacás una foto o lo escaneás, y lo subís en Documentación.",
      },
      {
        pregunta: "¿Qué es el ETA y cómo lo saco?",
        respuesta:
          "Es el permiso electrónico para entrar al Reino Unido. Se pide desde la app oficial del gobierno británico con el pasaporte del alumno. Cuando lo enviás, marcalo «En trámite» en Documentación, y cuando te llega la aprobación, marcalo «Aprobado».",
      },
      {
        pregunta: "Tuve un problema con el ETA, ¿qué hago?",
        respuesta:
          "No te preocupes, pasa. En Documentación, dentro del ETA, tocá «Tuve un problema con el ETA», contanos qué pasó y, si podés, adjuntá una captura. Nos llega el aviso y te ayudamos con los próximos pasos.",
      },
      {
        pregunta: "¿Qué archivos puedo subir?",
        respuesta:
          "PDF, JPG o PNG. Una foto con el celular sirve, siempre que se lea bien. Si te equivocaste de archivo, escribinos y lo resolvemos.",
      },
    ],
  },
  {
    tema: "Pagos",
    preguntas: [
      {
        pregunta: "¿Puedo pagar desde el portal?",
        respuesta:
          "No. El portal te muestra el estado de cada cuota, pero los pagos se hacen por los medios habituales. Cuando nos llega un pago, lo registramos y lo ves reflejado en Pagos.",
      },
      {
        pregunta: "Ya pagué y la cuota sigue figurando pendiente o vencida",
        respuesta:
          "Puede tardar en actualizarse, porque cargamos los pagos a mano cuando nos confirman que llegaron. Si te quedó la duda, escribinos y lo revisamos.",
      },
      {
        pregunta: "Tengo una cuota vencida, ¿se cae el viaje?",
        respuesta:
          "No se bloquea nada: podés seguir completando la documentación. Te pedimos que la regularices cuando puedas para asegurar el lugar, y si necesitás hablarlo, escribinos.",
      },
    ],
  },
  {
    tema: "Datos del alumno y el viaje",
    preguntas: [
      {
        pregunta: "Veo un dato mal cargado, ¿cómo lo corrijo?",
        respuesta:
          "En Mis datos tocá «Reportar un dato incorrecto», elegí qué dato está mal y contanos cuál es el correcto. Le llega un aviso al equipo y lo corregimos.",
      },
      {
        pregunta: "¿Hasta cuándo tiene que estar vigente el pasaporte?",
        respuesta:
          "Para el Reino Unido alcanza con que esté vigente hasta el último día del viaje. Si vence antes, te lo avisamos en Mis datos.",
      },
      {
        pregunta: "¿Cuándo voy a ver el itinerario?",
        respuesta:
          "Lo publicamos más cerca de la salida. Cuando esté, lo vas a ver en Viaje y te avisamos por email.",
      },
    ],
  },
];
