import { paisEnum } from "./schema";

/**
 * Parser CSV puro (sin dependencias) para importar prospectos.
 * Soporta delimitador coma / punto y coma / tab (autodetectado por la primera
 * línea), campos entre comillas dobles con comillas escapadas ("") y saltos de
 * línea dentro de comillas. Mapeo flexible de headers (case/acento-insensible).
 */

type Pais = (typeof paisEnum.options)[number];

export type ProspectoImportado = {
  nombre: string;
  emails: string[];
  telefonos: string[];
  ciudad?: string;
  pais?: Pais;
  sitioWeb?: string;
  ubicacionUrl?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  fuente?: string;
  notas?: string;
};

export type ParseProspectosResult = {
  filas: ProspectoImportado[];
  errores: string[];
};

const DELIMITADORES = [",", ";", "\t"] as const;
type Delimitador = (typeof DELIMITADORES)[number];

function detectarDelimitador(primeraLinea: string): Delimitador {
  let mejor: Delimitador = ",";
  let maxCount = -1;
  for (const d of DELIMITADORES) {
    const count = primeraLinea.split(d).length - 1;
    if (count > maxCount) {
      maxCount = count;
      mejor = d;
    }
  }
  return mejor;
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Tokeniza el CSV completo en filas de celdas, respetando comillas. */
function tokenizar(texto: string, delim: Delimitador): string[][] {
  const filas: string[][] = [];
  let celda = "";
  let fila: string[] = [];
  let enComillas = false;
  let i = 0;

  const pushCelda = () => {
    fila.push(celda);
    celda = "";
  };
  const pushFila = () => {
    pushCelda();
    filas.push(fila);
    fila = [];
  };

  while (i < texto.length) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i += 2;
          continue;
        }
        enComillas = false;
        i++;
        continue;
      }
      celda += c;
      i++;
      continue;
    }
    if (c === '"') {
      enComillas = true;
      i++;
      continue;
    }
    if (c === delim) {
      pushCelda();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      pushFila();
      i++;
      continue;
    }
    celda += c;
    i++;
  }
  // última celda/fila si el texto no termina en salto de línea
  if (celda !== "" || fila.length > 0) {
    pushFila();
  }
  return filas;
}

const PAIS_ALIASES: Record<string, Pais> = {
  "reino unido": "reino_unido",
  "reino_unido": "reino_unido",
  uk: "reino_unido",
  inglaterra: "reino_unido",
  irlanda: "irlanda",
  ireland: "irlanda",
  canada: "canada",
  malta: "malta",
  australia: "australia",
  argentina: "argentina",
  otro: "otro",
};

function mapearPais(valor: string): Pais | undefined {
  return PAIS_ALIASES[normalizar(valor)];
}

const HEADER_MAP: Record<string, keyof ProspectoImportado> = {
  nombre: "nombre",
  email: "emails",
  mail: "emails",
  emails: "emails",
  correo: "emails",
  telefono: "telefonos",
  tel: "telefonos",
  telefonos: "telefonos",
  ciudad: "ciudad",
  pais: "pais",
  sitio_web: "sitioWeb",
  sitio: "sitioWeb",
  web: "sitioWeb",
  ubicacion: "ubicacionUrl",
  maps: "ubicacionUrl",
  mapa: "ubicacionUrl",
  contacto: "contactoNombre",
  contacto_nombre: "contactoNombre",
  cargo: "contactoCargo",
  fuente: "fuente",
  notas: "notas",
};

function mapearHeader(header: string): keyof ProspectoImportado | undefined {
  const norm = normalizar(header).replace(/\s+/g, "_");
  return HEADER_MAP[norm];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitMultiples(celda: string): string[] {
  return celda
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseProspectosCsv(texto: string): ParseProspectosResult {
  const errores: string[] = [];
  const filas: ProspectoImportado[] = [];

  const limpio = texto.replace(/^﻿/, "");
  if (limpio.trim() === "") {
    return { filas, errores: ["El archivo está vacío"] };
  }

  const primeraLinea = limpio.split(/\r?\n/)[0] ?? "";
  const delim = detectarDelimitador(primeraLinea);
  const matriz = tokenizar(limpio, delim);

  const headerRow = matriz[0];
  if (!headerRow) {
    return { filas, errores: ["El archivo no tiene encabezados"] };
  }
  const campos = headerRow.map(mapearHeader);

  if (!campos.includes("nombre")) {
    errores.push('No se encontró la columna "nombre" en los encabezados');
    return { filas, errores };
  }

  for (let r = 1; r < matriz.length; r++) {
    const celdas = matriz[r];
    if (!celdas) continue;
    if (celdas.every((c) => c.trim() === "")) continue;

    const numeroFila = r + 1;
    let nombre = "";
    const emails: string[] = [];
    const telefonos: string[] = [];
    let ciudad: string | undefined;
    let pais: Pais | undefined;
    let sitioWeb: string | undefined;
    let ubicacionUrl: string | undefined;
    let contactoNombre: string | undefined;
    let contactoCargo: string | undefined;
    let fuente: string | undefined;
    let notas: string | undefined;

    for (let c = 0; c < campos.length; c++) {
      const campo = campos[c];
      if (!campo) continue;
      const valor = (celdas[c] ?? "").trim();
      if (valor === "") continue;

      switch (campo) {
        case "nombre":
          nombre = valor;
          break;
        case "emails":
          for (const e of splitMultiples(valor)) {
            if (EMAIL_RE.test(e)) emails.push(e);
            else errores.push(`Fila ${numeroFila}: email inválido "${e}" (ignorado)`);
          }
          break;
        case "telefonos":
          telefonos.push(...splitMultiples(valor));
          break;
        case "pais": {
          const p = mapearPais(valor);
          if (p) pais = p;
          break;
        }
        case "ciudad":
          ciudad = valor;
          break;
        case "sitioWeb":
          sitioWeb = valor;
          break;
        case "ubicacionUrl":
          ubicacionUrl = valor;
          break;
        case "contactoNombre":
          contactoNombre = valor;
          break;
        case "contactoCargo":
          contactoCargo = valor;
          break;
        case "fuente":
          fuente = valor;
          break;
        case "notas":
          notas = valor;
          break;
      }
    }

    if (nombre === "") {
      errores.push(`Fila ${numeroFila}: sin nombre (descartada)`);
      continue;
    }

    filas.push({
      nombre,
      emails,
      telefonos,
      ciudad,
      pais,
      sitioWeb,
      ubicacionUrl,
      contactoNombre,
      contactoCargo,
      fuente,
      notas,
    });
  }

  return { filas, errores };
}
