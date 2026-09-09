/*
 * Contenido de las notas del blog público (SEO/GEO). Redacción propia de JUK;
 * los datos migratorios se verificaron en junio 2026 — revisarlos al actualizar.
 */

export type NotaSeccion = {
  titulo: string;
  parrafos?: string[];
  lista?: Array<{ titulo?: string; texto: string }>;
  tabla?: { encabezados: string[]; filas: string[][] };
};

export type Nota = {
  slug: string;
  titulo: string;
  tituloSeo: string;
  descripcion: string;
  categoria: string;
  fecha: string; // ISO
  lecturaMin: number;
  img: string;
  alt: string;
  /**
   * Imagen Open Graph (preview al compartir). Si se omite, se genera una
   * imagen branded automática en /notas/<slug>/og con el título de la nota.
   * Para usar una imagen propia, seteá una ruta acá (ej. "/landing/foo.jpg").
   */
  ogImage?: string;
  intro: string[];
  resumen: string[]; // puntos clave (GEO: extractables por motores generativos)
  secciones: NotaSeccion[];
  faqs: Array<{ q: string; a: string }>;
  enlaces?: Array<{ label: string; href: string }>;
  aviso?: string;
  cta: { titulo: string; texto: string; label: string; href: string };
};

export const NOTAS: Nota[] = [
  {
    slug: "que-se-puede-hacer-en-londres",
    titulo: "Qué se puede hacer en Londres: la guía para tu viaje de estudio",
    tituloSeo: "Qué hacer en Londres: guía para estudiantes",
    descripcion:
      "Museos gratis, parques reales, mercados y los clásicos imperdibles: todo lo que podés hacer en Londres durante un viaje de estudio, con tips para estudiantes.",
    categoria: "Destinos",
    fecha: "2026-06-12",
    lecturaMin: 7,
    img: "/landing/trips/london-bigben.jpg",
    alt: "Big Ben y el Parlamento, Londres",
    intro: [
      "Londres es, probablemente, la mejor aula de inglés del mundo: todo lo que hagas fuera de clase —pedir un café, preguntar una dirección, leer el cartel de un museo— es práctica real del idioma. Por eso nuestras salidas combinan clases por la mañana con actividades por la tarde.",
      "La buena noticia es que muchísimo de lo mejor de Londres es gratis o cuesta muy poco. Acá va la guía que les damos a nuestros juks antes de viajar.",
    ],
    resumen: [
      "Los grandes museos públicos de Londres (British Museum, National Gallery, Tate Modern) son gratuitos.",
      "Los Parques Reales y los mercados como Borough, Camden y Portobello no cuestan nada y son práctica real de inglés.",
      "Con una tarjeta contactless u Oyster, el transporte tiene tope de gasto diario.",
      "En las salidas grupales de JUK, las actividades de la tarde ya vienen organizadas con equipo acompañante.",
    ],
    secciones: [
      {
        titulo: "Museos de primer nivel, gratis",
        parrafos: [
          "Los grandes museos públicos de Londres no cobran entrada (aceptan donaciones voluntarias). Es uno de los mejores planes de tarde para un estudiante, y se puede volver las veces que haga falta.",
        ],
        lista: [
          {
            titulo: "British Museum",
            texto:
              "historia de todas las civilizaciones bajo un mismo techo: la Piedra Rosetta, las momias egipcias y los mármoles griegos.",
          },
          {
            titulo: "National Gallery",
            texto:
              "en pleno Trafalgar Square, con obras de Van Gogh, Monet y Rembrandt.",
          },
          {
            titulo: "Tate Modern",
            texto:
              "arte contemporáneo dentro de una antigua central eléctrica a orillas del Támesis, con vista gratuita desde sus terrazas.",
          },
          {
            titulo: "Natural History Museum",
            texto:
              "los dinosaurios y la ballena azul del hall principal son un clásico, y el edificio es una joya en sí mismo.",
          },
        ],
      },
      {
        titulo: "Los clásicos que no te podés perder",
        parrafos: [
          "Hay una lista de postales que hay que tachar sí o sí en la primera visita: el Big Ben y el Parlamento en Westminster, el cambio de guardia en el Palacio de Buckingham, el Tower Bridge y la Torre de Londres, Trafalgar Square y las luces de Piccadilly Circus.",
          "Un truco de local: la mayoría se concentra en un radio caminable. Con un buen par de zapatillas se conocen todas en una sola tarde, cruzando parques en el camino.",
        ],
      },
      {
        titulo: "Parques reales para desconectar",
        parrafos: [
          "Londres es una de las capitales más verdes de Europa y sus Parques Reales son gratuitos: Hyde Park con su lago Serpentine y el famoso Speakers' Corner, Kensington Gardens con la estatua de Peter Pan, Regent's Park y St James's Park, que tiene la mejor vista al Palacio de Buckingham.",
          "Si querés la mejor panorámica de la ciudad, subí a Primrose Hill o a Parliament Hill en Hampstead Heath: atardecer con skyline completo, sin pagar un centavo.",
        ],
      },
      {
        titulo: "Mercados para comer y pasear",
        parrafos: [
          "Los mercados son el plan perfecto para mezclarse con londinenses y practicar inglés pidiendo comida.",
        ],
        lista: [
          {
            titulo: "Borough Market",
            texto:
              "el mercado gastronómico por excelencia, bajo las vías del tren: quesos ingleses, comida del mundo y puestos históricos.",
          },
          {
            titulo: "Camden Market",
            texto:
              "el lado alternativo de Londres: música, moda vintage y comida callejera de todos los continentes.",
          },
          {
            titulo: "Portobello Road",
            texto:
              "en Notting Hill, entre casitas de colores: antigüedades, ropa de época y mucho ambiente de barrio. Nuestros grupos siempre vuelven con fotos de acá.",
          },
        ],
      },
      {
        titulo: "Planes que cuestan poco y nada",
        parrafos: [
          "Cruzar el Millennium Bridge con San Pablo de fondo, recorrer el South Bank a la tarde, tomarse el ferry o el DLR a Greenwich para pisar el meridiano cero, ver los músicos de Covent Garden o subir gratis al jardín de altura Sky Garden (reservando con anticipación) son planes que no mueven el presupuesto y quedan para siempre.",
        ],
      },
      {
        titulo: "Tips de estudiante para moverse",
        lista: [
          {
            titulo: "Transporte",
            texto:
              "con una tarjeta contactless o la Oyster pagás el subte y el bus con tope diario: a partir de cierto monto, los viajes del día no se cobran más.",
          },
          {
            titulo: "Clima",
            texto:
              "el famoso clima inglés existe: vestite en capas y llevá siempre un piloto o paraguas chico en la mochila.",
          },
          {
            titulo: "Inglés en la calle",
            texto:
              "animate a preguntar, pedir y charlar. La diferencia entre un viaje y un viaje de estudio está en cuánto usás el idioma fuera del aula.",
          },
          {
            titulo: "En grupo, mejor",
            texto:
              "en nuestras salidas grupales las actividades de la tarde ya vienen organizadas, con el equipo de JUK acompañando: aprovechás la ciudad sin perder tiempo en logística.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "¿Los museos de Londres son gratis?",
        a: "Los grandes museos públicos sí: British Museum, National Gallery, Tate Modern y Natural History Museum no cobran entrada (aceptan donaciones voluntarias). Algunas exposiciones temporales son pagas.",
      },
      {
        q: "¿Cuánto cuesta moverse en Londres?",
        a: "Con una tarjeta contactless o la Oyster pagás subte y bus con tope de gasto diario: pasado cierto monto, el resto de los viajes del día no se cobra. Además, el centro es muy caminable: muchos imperdibles están a distancia de caminata entre sí.",
      },
      {
        q: "¿Cuál es la mejor época para un viaje de estudio a Londres?",
        a: "Nuestras salidas grupales son en febrero y julio, en vacaciones. Julio tiene días larguísimos y clima más amable; febrero tiene menos turistas y la ciudad se disfruta más tranquila. Las dos funcionan muy bien.",
      },
      {
        q: "¿Se puede conocer Londres durante un viaje de estudio?",
        a: "Sí: el formato de clases por la mañana y actividades por la tarde está pensado justamente para eso. En dos o tres semanas se recorren los imprescindibles y queda tiempo para los planes de barrio.",
      },
    ],
    enlaces: [
      { label: "Salidas grupales a Londres y Cambridge", href: "/salidas#grupal" },
      { label: "Conocé todos nuestros programas", href: "/programas" },
    ],
    cta: {
      titulo: "¿Querés vivir Londres estudiando inglés?",
      texto:
        "Nuestras salidas grupales de febrero y julio incluyen alojamiento, actividades y equipo acompañante durante todo el viaje.",
      label: "Conocé las salidas",
      href: "/salidas",
    },
  },
  {
    slug: "opciones-para-viajar-a-inglaterra",
    titulo: "Opciones para viajar a Inglaterra a estudiar inglés: guía para argentinos",
    tituloSeo: "Cómo viajar a Inglaterra a estudiar inglés desde Argentina",
    descripcion:
      "ETA, pasaporte, cursos de hasta 6 meses sin visa y las tres modalidades para viajar: salida grupal, con tu colegio o individual. Todo lo que un argentino necesita saber.",
    categoria: "Guías",
    fecha: "2026-06-11",
    lecturaMin: 8,
    img: "/landing/trips/london-westminster.jpg",
    alt: "Westminster y el Big Ben, Londres",
    intro: [
      "Si querés estudiar inglés en Inglaterra, lo más difícil suele ser arrancar: ¿necesito visa?, ¿qué es el ETA?, ¿viajo solo o en grupo?, ¿campus o casa de familia? En esta guía ordenamos todo el camino, paso a paso, pensado para estudiantes argentinos.",
    ],
    resumen: [
      "Los argentinos necesitan el ETA para entrar al Reino Unido: cuesta £20 y sirve para múltiples viajes durante 2 años.",
      "Para cursos de inglés de hasta 6 meses no hace falta visa de estudiante.",
      "El pasaporte debe estar vigente durante toda la estadía (el Reino Unido no exige 6 meses extra).",
      "Hay tres maneras de viajar: salida grupal en febrero/julio, con tu colegio, o individual en cualquier momento del año.",
    ],
    secciones: [
      {
        titulo: "Lo primero: el ETA (la autorización electrónica de viaje)",
        parrafos: [
          "Desde 2025, los argentinos necesitamos una Electronic Travel Authorisation (ETA) para entrar al Reino Unido. No es una visa: es una autorización digital que se tramita online o desde la app oficial UK ETA antes de viajar.",
          "Cuesta £20 (subió de £16 en abril de 2026), queda vinculada a tu pasaporte y sirve para múltiples entradas durante 2 años, con estadías de hasta 6 meses por visita. Importante: ya no se puede embarcar sin la ETA aprobada, así que conviene tramitarla con varios días de anticipación.",
        ],
      },
      {
        titulo: "¿Necesito visa de estudiante?",
        parrafos: [
          "Para cursos de inglés de hasta 6 meses de duración, no: los argentinos podemos cursar como visitantes con la ETA. Solo se necesita una visa específica para estudios más largos o programas formales (carreras, posgrados).",
          "La gran mayoría de los programas de JUK —salidas grupales, cursos intensivos, preparación de exámenes— entran cómodamente en esa ventana de 6 meses.",
        ],
      },
      {
        titulo: "El pasaporte: un detalle que no es detalle",
        parrafos: [
          "El pasaporte tiene que estar vigente durante toda tu estadía. A diferencia de otros destinos, el Reino Unido no exige 6 meses extra de validez: alcanza con que cubra el viaje completo. Igual, si está cerca de vencer, conviene renovarlo antes para evitar sustos con cambios de fecha.",
        ],
      },
      {
        titulo: "Opción 1: la salida grupal",
        parrafos: [
          "Es la manera más elegida para un primer viaje, sobre todo para adolescentes. Hay dos salidas por año —febrero y julio, en vacaciones— con destino a Cambridge o Londres.",
          "Incluye curso, alojamiento en campus universitario o casa de familia, actividades sociales y culturales todos los días, y un equipo de JUK que acompaña al grupo desde Ezeiza hasta la vuelta. Para las familias, esto último cambia todo: siempre hay un adulto del equipo cerca.",
        ],
      },
      {
        titulo: "Opción 2: con tu colegio o instituto",
        parrafos: [
          "Si tu institución quiere organizar su propio viaje de estudio, armamos el programa a medida: el grupo viaja con sus líderes y JUK gestiona todo lo demás —pasajes, alojamiento, excursiones, transfers y seguros— con reuniones informativas previas para familias y acompañamiento permanente desde Argentina.",
        ],
      },
      {
        titulo: "Opción 3: la salida individual",
        parrafos: [
          "Para jóvenes, adultos y profesionales que quieren elegir todo: cuándo viajar, por cuánto tiempo, qué tipo de curso (general, intensivo, preparación de Cambridge o IELTS) y dónde alojarse. Se puede salir en cualquier momento del año y el programa se arma alrededor de tu objetivo.",
        ],
      },
      {
        titulo: "¿Campus o casa de familia?",
        lista: [
          {
            titulo: "Campus universitario",
            texto:
              "independencia, vida estudiantil y todo a mano: clases, habitación y actividades en el mismo predio. Ideal para la primera experiencia en grupo.",
          },
          {
            titulo: "Casa de familia",
            texto:
              "inmersión total: desayunás y cenás conversando en inglés, conocés la cultura desde adentro y practicás el idioma sin darte cuenta.",
          },
        ],
      },
      {
        titulo: "¿Cuál me conviene?",
        parrafos: [
          "Una regla simple: si es tu primer viaje y tenés entre 13 y 18, la salida grupal es imbatible. Si tu colegio puede armar grupo, la experiencia institucional suma muchísimo. Y si ya sos independiente o tenés un objetivo puntual (un examen, tu carrera, tu trabajo), la salida individual te da el traje a medida.",
          "Sea cual sea la opción, el proceso con JUK arranca igual: evaluamos tu nivel de inglés sin costo y te asesoramos sobre destino, curso y alojamiento antes de que tomes cualquier decisión.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Necesito visa para estudiar inglés en Inglaterra?",
        a: "Para cursos de hasta 6 meses, no: los argentinos entramos como visitantes con el ETA. Solo se necesita visa de estudiante para programas más largos o estudios formales como carreras y posgrados.",
      },
      {
        q: "¿Cuánto cuesta el ETA y cuánto tarda?",
        a: "Cuesta £20 por persona y se tramita online o desde la app oficial UK ETA. Suele resolverse en horas o pocos días, pero conviene hacerlo con al menos una semana de anticipación: sin el ETA aprobado no se puede embarcar.",
      },
      {
        q: "¿Puedo trabajar en Inglaterra con el ETA?",
        a: "No: el ETA habilita turismo y cursos cortos, pero no permite trabajar. Si tu objetivo es estudiar y trabajar a la vez, la opción es el programa Study & Work en Irlanda.",
      },
      {
        q: "¿Qué pasa si mi pasaporte vence pronto?",
        a: "Tiene que estar vigente durante todo el viaje. El Reino Unido no exige una validez extra de 6 meses, pero si está cerca de vencer conviene renovarlo antes para no depender de las fechas exactas del regreso.",
      },
    ],
    aviso:
      "Los requisitos migratorios pueden cambiar. Verificá siempre la información oficial del gobierno del Reino Unido al momento de planificar tu viaje.",
    enlaces: [
      { label: "Mirá las salidas a Inglaterra", href: "/salidas" },
      { label: "Pedí asesoramiento personalizado", href: "/consulta" },
    ],
    cta: {
      titulo: "¿Arrancamos con tu viaje a Inglaterra?",
      texto:
        "Contanos tu edad, tu nivel y tus fechas, y te recomendamos la modalidad y el curso justos para vos.",
      label: "Pedir asesoramiento",
      href: "/consulta",
    },
  },
  {
    slug: "study-work-irlanda-guia-argentinos",
    titulo: "Study & Work en Irlanda: la guía completa para argentinos",
    tituloSeo: "Study & Work en Irlanda para argentinos: guía completa",
    descripcion:
      "Cómo estudiar inglés y trabajar legalmente en Irlanda: permiso Stamp 2, 20 horas semanales de trabajo, requisitos, fondos y diferencias con la Working Holiday.",
    categoria: "Programas",
    fecha: "2026-06-10",
    lecturaMin: 9,
    img: "/landing/programa-04.webp",
    alt: "Clase internacional de inglés",
    intro: [
      "Es el programa que más nos consultan, y con razón: Study & Work te permite estudiar inglés en Irlanda y trabajar legalmente mientras tanto, ayudándote a financiar la estadía. Acá va la guía completa, con los números reales y los pasos en orden.",
    ],
    resumen: [
      "El programa combina 6 meses de curso de inglés con 2 de vacaciones (8 en total), renovable estando en Irlanda.",
      "Permite trabajar 20 horas semanales durante el curso y 40 en los períodos oficiales de vacaciones.",
      "Los argentinos no tramitan visa antes de viajar: el permiso de estudiante (Stamp 2) se gestiona al llegar.",
      "Hay que demostrar fondos de manutención (hoy ~€6.665) y tener curso pago con carta de aceptación.",
    ],
    secciones: [
      {
        titulo: "Qué es el Study & Work",
        parrafos: [
          "Es un esquema que combina un curso de inglés de 6 meses con 2 meses de vacaciones: 8 meses en total, renovables estando allá. Durante el curso podés trabajar part-time, y en las vacaciones, full-time.",
          "Hoy JUK lo ofrece en Irlanda, que es el destino ideal para este formato: país de habla inglesa, con institutos acreditados y un esquema migratorio claro para estudiantes.",
        ],
      },
      {
        titulo: "Por qué Irlanda es ideal para los argentinos",
        parrafos: [
          "Los argentinos no necesitamos tramitar una visa antes de viajar a Irlanda: entrás con tu pasaporte argentino vigente y, una vez allá, te registrás ante la oficina de inmigración para obtener tu permiso de estudiante (el famoso Stamp 2), que es el que habilita a trabajar.",
          "El instituto donde estudiás te acompaña en ese proceso: te orienta con el registro, el permiso laboral, el número de seguridad social (PPS) y hasta la apertura de una cuenta bancaria.",
        ],
      },
      {
        titulo: "Cuántas horas se puede trabajar",
        lista: [
          {
            titulo: "Durante el curso",
            texto: "hasta 20 horas semanales (part-time).",
          },
          {
            titulo: "En vacaciones oficiales",
            texto:
              "hasta 40 horas semanales (full-time), en los períodos de junio a septiembre y del 15 de diciembre al 15 de enero.",
          },
          {
            titulo: "El sueldo",
            texto:
              "Irlanda tiene salario mínimo por ley, y los trabajos típicos de estudiante (gastronomía, retail, delivery) lo pagan. Muchos juks cubren buena parte de sus gastos mensuales con el trabajo part-time.",
          },
        ],
      },
      {
        titulo: "Requisitos para aplicar",
        lista: [
          {
            texto: "Pasaporte argentino vigente para toda la estadía.",
          },
          {
            texto:
              "Curso contratado en un instituto elegible y carta de aceptación (esto se resuelve antes de viajar, con JUK).",
          },
          {
            texto:
              "Demostrar fondos de manutención al registrarte (hoy son aproximadamente €6.665).",
          },
          {
            texto: "Seguro médico por la duración de la estadía.",
          },
        ],
      },
      {
        titulo: "Qué pasa cuando termina el programa",
        parrafos: [
          "Al final de los 8 meses tenés tres caminos: volver a Argentina con un inglés de otro nivel, usar los 2 meses de vacaciones para viajar por Europa y después renovar el programa por otros 8 meses, o dedicar las vacaciones a trabajar full-time y ahorrar.",
          "La renovación se hace estando en Irlanda, sin volver a empezar el proceso desde cero.",
        ],
      },
      {
        titulo: "¿Y la Working Holiday? Las diferencias",
        parrafos: [
          "Argentina e Irlanda también tienen un acuerdo de Working Holiday, pero es un programa distinto: son 200 cupos por año para jóvenes de 18 a 35, dura un máximo de 1 año y no es renovable. Además exige fondos propios (unos €1.500 si ya tenés pasaje de vuelta, €3.000 si no) y los cupos se agotan rapidísimo.",
          "La diferencia clave: la Working Holiday depende de conseguir uno de esos 200 cupos; el Study & Work no tiene cupo, porque entrás como estudiante con tu curso contratado. Y de paso, estudiás: volvés con el idioma certificado, no solo con la experiencia.",
        ],
        tabla: {
          encabezados: ["", "Study & Work", "Working Holiday"],
          filas: [
            ["Cupos", "Sin cupo (entrás como estudiante)", "200 por año"],
            ["Duración", "8 meses (6 de curso + 2 de vacaciones)", "Hasta 1 año"],
            ["Visa previa", "No (Stamp 2 al llegar)", "Sí (hay que conseguir cupo)"],
            ["Horas de trabajo", "20 hs semanales (40 en vacaciones)", "Sin límite especial"],
            ["Renovable", "Sí, estando en Irlanda", "No"],
          ],
        },
      },
      {
        titulo: "Cómo te acompaña JUK",
        parrafos: [
          "Elegimos juntos el instituto y la ciudad según tu presupuesto y tus objetivos, gestionamos la inscripción, el pasaje y el seguro, y te preparamos para el registro migratorio. Durante la estadía seguimos en contacto, desde Argentina y con el instituto en destino.",
          "Antes de todo eso, evaluamos tu nivel de inglés sin costo: así el curso que contratás es exactamente el que necesitás.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Necesito visa antes de viajar a Irlanda?",
        a: "No: los argentinos entramos a Irlanda con pasaporte vigente y sin visa previa. Una vez allá te registrás ante la oficina de inmigración y obtenés el permiso de estudiante Stamp 2, que es el que habilita a trabajar.",
      },
      {
        q: "¿Cuántas horas puedo trabajar como estudiante en Irlanda?",
        a: "Hasta 20 horas semanales durante el curso, y hasta 40 horas (full-time) en los períodos oficiales de vacaciones: de junio a septiembre y del 15 de diciembre al 15 de enero.",
      },
      {
        q: "¿Cuánta plata tengo que demostrar para el Stamp 2?",
        a: "Al registrarte hay que acreditar fondos de manutención: hoy son aproximadamente €6.665. El monto lo fija inmigración de Irlanda y puede actualizarse, así que conviene verificarlo al planificar el viaje.",
      },
      {
        q: "¿Qué conviene: Study & Work o Working Holiday?",
        a: "Depende del objetivo. La Working Holiday tiene solo 200 cupos anuales para argentinos, dura 1 año y no es renovable. El Study & Work no depende de cupos, incluye un curso de inglés con certificación y se puede renovar estando allá.",
      },
    ],
    aviso:
      "Los montos y requisitos migratorios pueden cambiar. Verificá siempre la información oficial de inmigración de Irlanda al momento de planificar tu viaje.",
    enlaces: [
      { label: "Programas para jóvenes y adultos", href: "/programas#jovenes-adultos" },
      { label: "Pedí tu propuesta de Study & Work", href: "/consulta" },
    ],
    cta: {
      titulo: "¿Te imaginás estudiando y trabajando en Irlanda?",
      texto:
        "Escribinos y armamos tu Study & Work: instituto, ciudad, fechas y presupuesto, todo a tu medida.",
      label: "Quiero mi propuesta",
      href: "/consulta",
    },
  },
  {
    slug: "ielts-toefl-cambridge-que-examen-conviene",
    titulo: "IELTS, TOEFL o Cambridge: qué examen de inglés te conviene rendir",
    tituloSeo: "IELTS, TOEFL o Cambridge: cuál examen de inglés rendir",
    descripcion:
      "Comparamos los exámenes internacionales de inglés: validez, puntajes, para qué sirve cada uno y cómo elegir entre IELTS, TOEFL, Cambridge (B2 First, C1 Advanced) y Trinity.",
    categoria: "Programas",
    fecha: "2026-06-09",
    lecturaMin: 8,
    img: "/landing/programa-08.webp",
    alt: "Estudiante con su diploma de inglés",
    intro: [
      "“¿Qué examen me conviene rendir?” es una de las preguntas que más escuchamos. Y la respuesta corta es: depende de para qué lo necesites. Cada certificación internacional tiene su público, su formato y su validez, y elegir bien te ahorra tiempo, plata y frustración.",
      "Acá va la comparación completa, con los criterios que usamos para asesorar a nuestros juks.",
    ],
    resumen: [
      "Los certificados de Cambridge (B2 First, C1 Advanced) no vencen; IELTS y TOEFL tienen una validez de 2 años.",
      "IELTS es el preferido en Reino Unido, Australia y Canadá; TOEFL, en Estados Unidos.",
      "Para universidades suele pedirse IELTS 6.5+ o TOEFL ~100, según la institución.",
      "Prepararlos en el país donde se habla el idioma acelera muchísimo el resultado.",
    ],
    secciones: [
      {
        titulo: "Primero: ¿para qué lo necesitás?",
        parrafos: [
          "Antes de mirar formatos y puntajes, definí el objetivo. ¿Es para entrar a una universidad? ¿Para tu CV y el mundo laboral? ¿Para emigrar? ¿O para certificar tu nivel de una vez y para siempre? Cada respuesta apunta a un examen distinto.",
        ],
        lista: [
          { titulo: "Universidad en Reino Unido, Australia o Canadá", texto: "IELTS Academic es el estándar." },
          { titulo: "Universidad en Estados Unidos", texto: "TOEFL iBT es el más aceptado." },
          { titulo: "CV y certificación de por vida", texto: "Cambridge B2 First o C1 Advanced." },
          { titulo: "Migración o trabajo en países anglófonos", texto: "depende del país: suele ser IELTS General Training." },
        ],
      },
      {
        titulo: "Cambridge: B2 First y C1 Advanced",
        parrafos: [
          "Los exámenes de Cambridge certifican un nivel del Marco Común Europeo (MCER) y tienen una ventaja única: el certificado no vence. Lo rendís una vez y queda para siempre (aunque algunas instituciones piden que no tenga más de 2 o 3 años para admisiones).",
          "El B2 First (ex FCE) certifica nivel B2 a partir de 160 puntos, y el C1 Advanced (ex CAE) certifica C1 a partir de 180. Son muy valorados en Europa y en el mundo profesional, y son el broche perfecto para un viaje de estudio: volvés con el nivel certificado.",
        ],
      },
      {
        titulo: "IELTS: el estándar británico",
        parrafos: [
          "El IELTS califica con bandas de 0 a 9 y tiene dos versiones: Academic (para universidades) y General Training (para migración y trabajo). Su resultado vale 2 años.",
          "Es el examen más aceptado en Reino Unido, Australia, Nueva Zelanda y Canadá. Como referencia general, las universidades suelen pedir una banda total de 6.5 o más, aunque cada institución fija su propio piso.",
        ],
      },
      {
        titulo: "TOEFL iBT: el camino a Estados Unidos",
        parrafos: [
          "El TOEFL iBT se rinde íntegramente en computadora, usa inglés americano y puntúa de 0 a 120, con una validez de 2 años. Es el preferido de las universidades estadounidenses: las más exigentes suelen pedir alrededor de 100 puntos.",
          "Si tu plan pasa por Estados Unidos —grado, posgrado o intercambio—, este es tu examen.",
        ],
      },
      {
        titulo: "Trinity: la alternativa británica",
        parrafos: [
          "Trinity College London ofrece sus propias certificaciones (como ISE y GESE), reconocidas especialmente en el Reino Unido. Son una buena alternativa cuando el formato de Cambridge o IELTS no se ajusta a tu forma de rendir: el componente oral tiene mucho peso y el formato es más conversacional.",
        ],
      },
      {
        titulo: "Entonces, ¿cuál rindo?",
        parrafos: [
          "Ninguno es “más fácil”: todos miden las mismas habilidades (comprensión oral y escrita, expresión oral y escrita) con formatos distintos. La elección correcta es la que pide la institución o el país al que apuntás.",
          "Si todavía no lo tenés claro, empezá al revés: evaluá tu nivel actual (en JUK lo hacemos sin costo) y definí el objetivo. Con esas dos puntas, el examen se elige solo.",
        ],
        tabla: {
          encabezados: ["", "IELTS", "TOEFL", "Cambridge"],
          filas: [
            ["Validez", "2 años", "2 años", "No vence"],
            ["Variante de inglés", "Británico", "Americano", "Británico"],
            ["Dónde se prefiere", "Reino Unido, Australia, Canadá", "Estados Unidos", "Europa y mundo profesional"],
            ["Puntaje de referencia", "6.5+ (banda 0–9)", "~100 (escala 0–120)", "B2 First desde 160 · C1 Advanced desde 180"],
          ],
        },
      },
      {
        titulo: "El secreto: prepararlo donde se habla el idioma",
        parrafos: [
          "Nuestros cursos de preparación de exámenes en destino combinan profesores especializados, simulacros reales y la inmersión de vivir en inglés las 24 horas. Esa combinación acelera el resultado de una manera que ningún curso a distancia iguala: practicás el listening en la calle y el speaking en la cena.",
          "Ofrecemos preparación para Cambridge, Trinity, IELTS y TOEFL en varios de nuestros 8 destinos, con fechas flexibles dentro de la salida individual.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Qué examen de inglés es más fácil?",
        a: "Ninguno: todos miden las mismas cuatro habilidades con formatos distintos. La diferencia real está en cuál acepta la institución o el país al que apuntás, y con qué formato rendís más cómodo.",
      },
      {
        q: "¿Cuánto dura la validez de cada certificado?",
        a: "Los certificados de Cambridge (B2 First, C1 Advanced) no vencen. IELTS y TOEFL valen 2 años desde la fecha del examen, porque se usan principalmente para admisiones y migración.",
      },
      {
        q: "¿Qué puntaje necesito para entrar a una universidad?",
        a: "Como referencia general: IELTS 6.5 o más para universidades de Reino Unido, Australia o Canadá, y TOEFL alrededor de 100 para las estadounidenses más exigentes. Cada institución publica su propio requisito.",
      },
      {
        q: "¿Puedo preparar el examen durante un viaje de estudio?",
        a: "Sí, y es lo que más recomendamos: los cursos de preparación en destino combinan docentes especializados y simulacros con la inmersión total en el idioma. JUK los ofrece para Cambridge, Trinity, IELTS y TOEFL.",
      },
    ],
    enlaces: [
      { label: "Cursos de preparación de exámenes", href: "/programas" },
      { label: "Salidas para preparar tu examen en destino", href: "/salidas" },
    ],
    cta: {
      titulo: "¿Listo para certificar tu inglés?",
      texto:
        "Evaluamos tu nivel sin costo y armamos tu curso de preparación en el destino que más te convenga.",
      label: "Ver los programas",
      href: "/programas",
    },
  },
  {
    slug: "viaje-de-estudio-adolescentes-guia-para-padres",
    titulo: "El primer viaje de estudio de tu hijo: guía completa para padres",
    tituloSeo: "Viaje de estudio para adolescentes: guía para padres",
    descripcion:
      "Todo lo que una familia argentina necesita saber antes del primer viaje de estudio: acompañamiento, alojamiento, documentación del menor, comunicación durante el viaje y cómo prepararse.",
    categoria: "Guías",
    fecha: "2026-06-08",
    lecturaMin: 8,
    img: "/landing/salida-grupal.webp",
    alt: "Estudiantes de JUK de viaje en Chester, Inglaterra",
    intro: [
      "Que un hijo adolescente viaje solo al exterior por primera vez genera la misma mezcla en todas las familias: entusiasmo por la oportunidad y mil preguntas sobre la seguridad, la organización y el día a día. Las dos cosas son válidas.",
      "Después de más de 10 años acompañando salidas grupales, armamos esta guía con las respuestas que les damos a los padres en cada reunión informativa.",
    ],
    resumen: [
      "En las salidas grupales, un equipo de JUK acompaña al grupo desde Ezeiza hasta la vuelta, las 24 horas.",
      "El alojamiento (campus o casa de familia) está supervisado y elegido por JUK de primera mano.",
      "Los menores de 18 necesitan pasaporte vigente, ETA y autorización de viaje para salir de Argentina.",
      "Las familias participan de reuniones informativas previas y reciben comunicación durante todo el viaje.",
    ],
    secciones: [
      {
        titulo: "La pregunta de fondo: ¿está listo?",
        parrafos: [
          "Un viaje de estudio a esta edad deja tres cosas que ningún curso local da junto: independencia real (manejarse, organizarse, resolver), un salto de inglés que solo da la inmersión, y amigos de todas partes del mundo. Para muchos juks es, literalmente, el viaje que les cambia la cabeza.",
          "¿Cómo saber si es el momento? Una buena señal es que la iniciativa venga de él o ella. Otra, que ya tenga alguna experiencia corta fuera de casa (campamentos, viajes con el colegio). Y la tranquilidad de fondo la da el formato: en una salida grupal nunca está solo.",
        ],
      },
      {
        titulo: "Cómo es una salida grupal por dentro",
        parrafos: [
          "Las salidas son en febrero y julio —en vacaciones— con destino a Cambridge o Londres. El grupo viaja junto desde Ezeiza, acompañado por el equipo de JUK durante todo el viaje: en el vuelo, en el traslado, en la escuela y en las actividades.",
          "La rutina típica: clases de inglés por la mañana en instituciones acreditadas (cada chico en el nivel que le corresponde, porque evaluamos su inglés antes de viajar) y actividades sociales y culturales por la tarde, organizadas y supervisadas.",
        ],
      },
      {
        titulo: "El alojamiento: campus o casa de familia",
        lista: [
          {
            titulo: "Campus universitario",
            texto:
              "habitaciones dentro del predio o en residencias cercanas, pensión completa, y todo —clases, comidas, actividades— a pocos minutos a pie. El grupo convive y el equipo está en el mismo lugar.",
          },
          {
            titulo: "Casa de familia",
            texto:
              "familias anfitrionas seleccionadas y verificadas por las instituciones con las que trabajamos hace años. Inmersión total en el idioma y la cultura, con la contención de un hogar.",
          },
        ],
        parrafos: [
          "En ambos casos, los alojamientos los conocemos de primera mano: es parte de la selección meticulosa que hacemos de cada destino, curso y actividad.",
        ],
      },
      {
        titulo: "La documentación del menor, en orden",
        lista: [
          {
            titulo: "Pasaporte",
            texto:
              "vigente durante toda la estadía. Si está por vencer, renovarlo con tiempo: los turnos y la emisión pueden demorar.",
          },
          {
            titulo: "ETA del Reino Unido",
            texto:
              "la autorización electrónica de viaje (£20) se tramita online antes de viajar, también para menores. Sin ETA aprobada no se puede embarcar.",
          },
          {
            titulo: "Autorización de viaje",
            texto:
              "los menores de 18 que salen de Argentina sin ambos padres necesitan una autorización de viaje (la exige Migraciones al egresar del país). Se tramita ante escribano, en los registros habilitados o en dependencias de Migraciones, con DNI del menor, DNI de los autorizantes y partida que acredite el vínculo.",
          },
          {
            titulo: "Seguro médico",
            texto: "se contrata cobertura médica para toda la estadía; es parte de la gestión del viaje.",
          },
        ],
        parrafos: [
          "Parece mucho, pero no lo es: antes de cada salida entregamos el checklist completo con fechas límite y acompañamos a cada familia para que ningún papel quede para último momento.",
        ],
      },
      {
        titulo: "Comunicación durante el viaje",
        parrafos: [
          "La regla es simple: las familias nunca se quedan sin saber. El equipo acompañante está en contacto permanente con la oficina de JUK en Argentina, y las familias reciben novedades del grupo durante toda la estadía, además de tener un canal directo para cualquier consulta.",
          "Mientras el viaje sucede, también validamos que el programa cumpla lo prometido: si algo no está a la altura, lo resolvemos en el momento, no a la vuelta.",
        ],
      },
      {
        titulo: "La plata del viaje",
        parrafos: [
          "El programa incluye lo grande (curso, alojamiento, comidas según modalidad, actividades), así que los gastos del día a día son acotados: algún almuerzo fuera, souvenirs, salidas extra.",
          "Recomendamos llevar una tarjeta prepaga o de débito internacional —en Inglaterra todo se paga contactless— y un presupuesto semanal acordado en familia. En la reunión previa damos una referencia concreta según el destino y la duración.",
        ],
      },
      {
        titulo: "Las reuniones informativas: el viaje también es de la familia",
        parrafos: [
          "Antes de cada salida organizamos reuniones informativas donde contamos el itinerario, presentamos al equipo acompañante, repasamos la documentación y respondemos absolutamente todas las preguntas. Salir de esa reunión con la cabeza tranquila es parte del servicio.",
          "Y si después aparecen más dudas —siempre aparecen—, el canal queda abierto hasta el día del embarque y durante todo el viaje.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Desde qué edad puede viajar un adolescente a estudiar inglés?",
        a: "Las salidas grupales están pensadas para adolescentes en edad de colegio secundario, siempre acompañados por el equipo de JUK. La edad ideal depende de la madurez de cada chico: contanos el caso y te asesoramos sin compromiso.",
      },
      {
        q: "¿Qué autorización necesita un menor para salir de Argentina?",
        a: "Los menores de 18 que viajan sin ambos padres necesitan una autorización de viaje, exigida por Migraciones al egresar del país. Se tramita ante escribano, registros habilitados o dependencias de Migraciones, con el DNI del menor, el de los autorizantes y la partida que acredite el vínculo.",
      },
      {
        q: "¿Qué pasa si mi hijo se enferma durante el viaje?",
        a: "Todos los viajes incluyen cobertura médica por la estadía completa, y el equipo acompañante gestiona la atención en el momento y avisa a la familia de inmediato. Nunca atraviesa algo así solo.",
      },
      {
        q: "¿Cómo me entero de cómo está mi hijo durante el viaje?",
        a: "Las familias reciben novedades del grupo durante toda la estadía y tienen un canal directo con JUK en Argentina, que está en contacto permanente con el equipo acompañante en destino.",
      },
    ],
    aviso:
      "Los requisitos de documentación para menores pueden variar según el caso familiar. Verificá la información oficial de Migraciones y consultanos por tu situación particular.",
    enlaces: [
      { label: "Conocé la salida grupal para adolescentes", href: "/salidas#grupal" },
      { label: "Sumate a la próxima reunión informativa", href: "/contacto" },
    ],
    cta: {
      titulo: "¿Hablamos del viaje de tu hijo?",
      texto:
        "Contanos su edad y su nivel de inglés, y te invitamos a la próxima reunión informativa de la salida grupal.",
      label: "Conocer la salida grupal",
      href: "/salidas#grupal",
    },
  },
];

export function getNota(slug: string): Nota | undefined {
  return NOTAS.find((n) => n.slug === slug);
}

export function fechaCorta(iso: string): string {
  const [y = "", m = "", d = ""] = iso.split("-");
  return `${d}/${m}/${y}`;
}
