export default function filtrarRamasVisibles(empleados, idsExpandidos) {
  if (!Array.isArray(empleados)) {
    return [];
  }

  const activos = empleados.filter((empleado) => empleado.activo !== false);

  const mapaPorId = new Map(
    activos.map((empleado) => [String(empleado.idEmpleado), empleado]),
  );

  const hijosPorSupervisor = new Map();

  activos.forEach((empleado) => {
    if (
      empleado.supervisorId === null ||
      empleado.supervisorId === undefined ||
      empleado.supervisorId === ""
    ) {
      return;
    }

    const claveSupervisor = String(empleado.supervisorId);

    if (!hijosPorSupervisor.has(claveSupervisor)) {
      hijosPorSupervisor.set(claveSupervisor, []);
    }

    hijosPorSupervisor.get(claveSupervisor).push(empleado);
  });

  const raices = activos.filter(
    (empleado) =>
      empleado.supervisorId === null ||
      empleado.supervisorId === undefined ||
      empleado.supervisorId === "" ||
      !mapaPorId.has(String(empleado.supervisorId)),
  );

  const visibles = [];
  const visitados = new Set();

  function recorrer(empleado) {
    const id = String(empleado.idEmpleado);

    if (visitados.has(id)) {
      return;
    }

    visitados.add(id);
    visibles.push(empleado);

    if (!idsExpandidos.has(id)) {
      return;
    }

    const hijos = hijosPorSupervisor.get(id) || [];

    hijos.sort(ordenarEmpleados).forEach(recorrer);
  }

  raices.sort(ordenarEmpleados).forEach(recorrer);

  return visibles;
}

export function obtenerIdsConHijos(empleados) {
  const ids = new Set();

  if (!Array.isArray(empleados)) {
    return ids;
  }

  empleados.forEach((empleado) => {
    if (
      empleado.activo !== false &&
      empleado.supervisorId !== null &&
      empleado.supervisorId !== undefined &&
      empleado.supervisorId !== ""
    ) {
      ids.add(String(empleado.supervisorId));
    }
  });

  return ids;
}

function ordenarEmpleados(a, b) {
  const ordenA = Number(a.orden) || 0;
  const ordenB = Number(b.orden) || 0;

  if (ordenA !== ordenB) {
    return ordenA - ordenB;
  }

  return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
    sensitivity: "base",
  });
}
