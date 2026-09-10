/**
 * Une varios ids para atributos ARIA que aceptan una lista separada por
 * espacios (`aria-describedby`, `aria-labelledby`), descartando los vacíos.
 */
export function unirIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const lista = ids.filter((id): id is string => typeof id === "string" && id.trim() !== "");
  return lista.length > 0 ? lista.join(" ") : undefined;
}
