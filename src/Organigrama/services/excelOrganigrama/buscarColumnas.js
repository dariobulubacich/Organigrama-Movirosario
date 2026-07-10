import normalizarTexto from "./normalizarTexto";

/*
|--------------------------------------------------------------------------
| Equivalencias de columnas
|--------------------------------------------------------------------------
|
| El importador aceptará cualquiera de estos nombres.
| Si RR.HH. cambia el encabezado del Excel, no habrá que modificar código.
|
*/

const COLUMNAS = {
  idEmpleado: [
    "Identificador único",
    "Identificador Unico",
    "Identificador",
    "ID",
    "Id",
    "id",
    "idEmpleado",
    "Empleado ID",
  ],

  nombre: [
    "Nombre del empleado",
    "Empleado",
    "Nombre",
    "Nombre Completo",
    "Nombre y Apellido",
  ],

  supervisorId: [
    "Persona que supervisa al empleado",
    "Supervisor",
    "Jefe",
    "Supervisor ID",
    "Id Supervisor",
    "supervisorId",
  ],

  cargo: ["Puesto", "Cargo", "Función", "Funcion"],
};

/*
|--------------------------------------------------------------------------
| Busca automáticamente qué columna corresponde a cada dato
|--------------------------------------------------------------------------
*/

export default function buscarColumnas(encabezados) {
  const columnasEncontradas = {};
  const errores = [];

  const encabezadosNormalizados = encabezados.map((columna) => ({
    original: columna,
    normalizado: normalizarTexto(columna),
  }));

  Object.entries(COLUMNAS).forEach(([campoInterno, aliases]) => {
    const aliasNormalizados = aliases.map(normalizarTexto);

    const encontrada = encabezadosNormalizados.find((columna) =>
      aliasNormalizados.includes(columna.normalizado),
    );

    if (encontrada) {
      columnasEncontradas[campoInterno] = encontrada.original;
    } else {
      errores.push(
        `No se encontró la columna correspondiente a "${campoInterno}".`,
      );
    }
  });

  return {
    ok: errores.length === 0,
    columnas: columnasEncontradas,
    errores,
  };
}
