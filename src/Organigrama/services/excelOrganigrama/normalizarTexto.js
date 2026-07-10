/**
 * Normaliza un texto para facilitar comparaciones.
 *
 * Convierte:
 * - Mayúsculas → minúsculas
 * - Elimina acentos
 * - Elimina espacios al principio y al final
 * - Reemplaza múltiples espacios por uno solo
 *
 * Ejemplos:
 *
 * " Identificador Único "
 * → "identificador unico"
 *
 * "Nombre    del   empleado"
 * → "nombre del empleado"
 */

export default function normalizarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
