import * as XLSX from "xlsx";

import buscarColumnas from "./buscarColumnas";
import limpiarDatos from "./limpiarDatos";
import validarExcel from "./validarExcel";
import validarJerarquia from "./validarJerarquia";

/**
 * Lee y valida un archivo Excel de organigrama.
 *
 * Devuelve:
 *
 * {
 *   ok: boolean,
 *   empleados: Array,
 *   errores: Array<string>,
 *   nombreHoja: string,
 *   cantidadRegistros: number
 * }
 */
export async function leerExcelOrganigrama(archivo) {
  try {
    validarArchivoSeleccionado(archivo);

    const contenido = await archivo.arrayBuffer();

    const libro = XLSX.read(contenido, {
      type: "array",
      cellDates: true,
    });

    if (!libro.SheetNames || libro.SheetNames.length === 0) {
      return crearResultadoError(
        "El archivo Excel no contiene hojas disponibles.",
      );
    }

    const nombreHoja = libro.SheetNames[0];
    const hoja = libro.Sheets[nombreHoja];

    if (!hoja) {
      return crearResultadoError(`No se pudo leer la hoja "${nombreHoja}".`);
    }

    const filas = XLSX.utils.sheet_to_json(hoja, {
      defval: "",
      raw: false,
      blankrows: false,
    });

    if (!Array.isArray(filas) || filas.length === 0) {
      return {
        ok: false,
        empleados: [],
        errores: ["La hoja seleccionada no contiene registros."],
        nombreHoja,
        cantidadRegistros: 0,
      };
    }

    const encabezados = Object.keys(filas[0]);

    const resultadoColumnas = buscarColumnas(encabezados);

    if (!resultadoColumnas.ok) {
      return {
        ok: false,
        empleados: [],
        errores: resultadoColumnas.errores,
        nombreHoja,
        cantidadRegistros: filas.length,
      };
    }

    const empleados = limpiarDatos(filas, resultadoColumnas.columnas);

    const resultadoExcel = validarExcel(empleados);

    const resultadoJerarquia = validarJerarquia(empleados);

    const errores = eliminarErroresDuplicados([
      ...resultadoExcel.errores,
      ...resultadoJerarquia.errores,
    ]);

    return {
      ok: errores.length === 0,
      empleados,
      errores,
      nombreHoja,
      cantidadRegistros: empleados.length,
    };
  } catch (error) {
    console.error("Error al leer el Excel del organigrama:", error);

    return crearResultadoError(
      error?.message || "Ocurrió un error inesperado al leer el archivo Excel.",
    );
  }
}

/**
 * Exportación por defecto para poder importar de ambas formas:
 *
 * import leerExcelOrganigrama from "...";
 *
 * o:
 *
 * import { leerExcelOrganigrama } from "...";
 */
export default leerExcelOrganigrama;

/* ============================================================
   FUNCIONES AUXILIARES
============================================================ */

function validarArchivoSeleccionado(archivo) {
  if (!archivo) {
    throw new Error("No se seleccionó ningún archivo.");
  }

  const nombre = String(archivo.name || "").toLowerCase();

  const extensionValida = nombre.endsWith(".xlsx") || nombre.endsWith(".xls");

  if (!extensionValida) {
    throw new Error(
      "El archivo seleccionado debe tener extensión .xlsx o .xls.",
    );
  }

  if (archivo.size !== undefined && archivo.size <= 0) {
    throw new Error("El archivo seleccionado está vacío.");
  }
}

function crearResultadoError(mensaje) {
  return {
    ok: false,
    empleados: [],
    errores: [mensaje],
    nombreHoja: "",
    cantidadRegistros: 0,
  };
}

function eliminarErroresDuplicados(errores) {
  return [...new Set(errores.filter(Boolean))];
}
