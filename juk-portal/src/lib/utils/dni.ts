/**
 * Formateo VISUAL del DNI con punto separador de miles: "45102338" → "45.102.338".
 * El valor guardado y el slug de la URL siguen siendo dígitos puros; esto es
 * solo para mostrar y para el input (que vuelve a dígitos con soloDigitos).
 */
export function formatearDni(dni: string): string {
  const d = dni.replace(/\D/g, "");
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Deja solo dígitos (DNI sin el formateo visual). */
export function soloDigitos(v: string): string {
  return v.replace(/\D/g, "");
}
