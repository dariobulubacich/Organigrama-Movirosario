/*
|--------------------------------------------------------------------------
| Validaciones de la estructura jerárquica del organigrama
|--------------------------------------------------------------------------
|
| Valida:
|   ✔ Existe una única raíz (Director General)
|   ✔ Todos los supervisores existen
|   ✔ No hay empleados que se supervisen a sí mismos
|   ✔ No existen ciclos en la jerarquía
|
*/

export default function validarJerarquia(empleados) {
  const errores = [];

  /* ============================================================
     MAPA DE EMPLEADOS
  ============================================================ */

  const mapa = new Map();

  empleados.forEach((empleado) => {
    mapa.set(empleado.idEmpleado, empleado);
  });

  /* ============================================================
     UNA SOLA RAÍZ
  ============================================================ */

  const raices = empleados.filter((e) => e.supervisorId === null);

  if (raices.length === 0) {
    errores.push(
      "No existe un empleado sin supervisor (raíz del organigrama).",
    );
  }

  if (raices.length > 1) {
    errores.push("Existe más de un empleado sin supervisor.");
  }

  /* ============================================================
     SUPERVISORES EXISTENTES
  ============================================================ */

  empleados.forEach((empleado) => {
    if (empleado.supervisorId !== null && !mapa.has(empleado.supervisorId)) {
      errores.push(
        `El empleado ${empleado.idEmpleado} tiene un supervisor inexistente (${empleado.supervisorId}).`,
      );
    }
  });

  /* ============================================================
     AUTO SUPERVISIÓN
  ============================================================ */

  empleados.forEach((empleado) => {
    if (empleado.idEmpleado === empleado.supervisorId) {
      errores.push(
        `El empleado ${empleado.idEmpleado} no puede supervisarse a sí mismo.`,
      );
    }
  });

  /* ============================================================
     CICLOS
  ============================================================ */

  empleados.forEach((empleado) => {
    detectarCiclo(empleado.idEmpleado, mapa, errores);
  });

  return {
    ok: errores.length === 0,
    errores,
  };
}

/* ============================================================
   DETECTAR CICLOS
============================================================ */

function detectarCiclo(idEmpleado, mapa, errores) {
  const visitados = new Set();

  let actual = idEmpleado;

  while (actual !== null) {
    if (visitados.has(actual)) {
      errores.push(
        `Se detectó un ciclo jerárquico que involucra al empleado ${idEmpleado}.`,
      );

      return;
    }

    visitados.add(actual);

    const empleado = mapa.get(actual);

    if (!empleado) {
      return;
    }

    actual = empleado.supervisorId;
  }
}
