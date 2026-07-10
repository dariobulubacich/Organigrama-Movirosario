/*
|--------------------------------------------------------------------------
| Validaciones generales del Excel
|--------------------------------------------------------------------------
|
| Este archivo NO valida la jerarquía.
| Solo valida la calidad de los datos.
|
*/

export default function validarExcel(empleados) {
  const errores = [];

  if (!Array.isArray(empleados) || empleados.length === 0) {
    errores.push("El archivo Excel no contiene registros.");

    return {
      ok: false,
      errores,
    };
  }

  const ids = new Set();

  empleados.forEach((empleado, index) => {
    const fila = index + 2; // +2 porque la fila 1 es el encabezado

    /* =======================================
       ID EMPLEADO
    ======================================= */

    if (empleado.idEmpleado === null) {
      errores.push(
        `Fila ${fila}: el identificador del empleado es obligatorio.`,
      );
    } else if (!Number.isInteger(empleado.idEmpleado)) {
      errores.push(`Fila ${fila}: el identificador debe ser numérico.`);
    } else {
      if (ids.has(empleado.idEmpleado)) {
        errores.push(
          `Fila ${fila}: el identificador ${empleado.idEmpleado} está duplicado.`,
        );
      }

      ids.add(empleado.idEmpleado);
    }

    /* =======================================
       NOMBRE
    ======================================= */

    if (!empleado.nombre) {
      errores.push(`Fila ${fila}: el nombre del empleado es obligatorio.`);
    }

    /* =======================================
       CARGO
    ======================================= */

    if (!empleado.cargo) {
      errores.push(`Fila ${fila}: el cargo es obligatorio.`);
    }

    /* =======================================
       SUPERVISOR
    ======================================= */

    if (
      empleado.supervisorId !== null &&
      !Number.isInteger(empleado.supervisorId)
    ) {
      errores.push(`Fila ${fila}: el supervisor debe ser un número.`);
    }
  });

  return {
    ok: errores.length === 0,
    errores,
  };
}
