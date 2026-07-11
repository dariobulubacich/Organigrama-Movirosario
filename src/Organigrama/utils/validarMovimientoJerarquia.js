/**
 * Valida si un empleado puede cambiar de supervisor.
 *
 * Evita:
 * - Mover un empleado sobre sí mismo.
 * - Asignar como supervisor a un subordinado directo o indirecto.
 * - Crear ciclos jerárquicos.
 * - Utilizar empleados inexistentes o inactivos.
 *
 * Devuelve:
 *
 * {
 *   ok: boolean,
 *   error: string
 * }
 */

export default function validarMovimientoJerarquia({
  idEmpleado,
  nuevoSupervisorId,
  empleados,
}) {
  if (!Array.isArray(empleados)) {
    return crearError("La lista de empleados es inválida.");
  }

  const empleadoId = convertirIdentificador(idEmpleado);

  const supervisorId = convertirIdentificador(nuevoSupervisorId);

  if (empleadoId === null) {
    return crearError("No se pudo identificar al empleado que se desea mover.");
  }

  /*
  |--------------------------------------------------------------------------
  | Permitir dejar al empleado sin supervisor
  |--------------------------------------------------------------------------
  |
  | Esto lo convierte en una raíz del organigrama. La interfaz podrá decidir
  | después si permite o no más de una raíz.
  |
  */

  if (supervisorId === null) {
    return {
      ok: true,
      error: "",
    };
  }

  if (String(empleadoId) === String(supervisorId)) {
    return crearError("Un empleado no puede ser su propio supervisor.");
  }

  const mapaEmpleados = construirMapaEmpleados(empleados);

  const empleado = mapaEmpleados.get(String(empleadoId));

  if (!empleado) {
    return crearError(`No existe el empleado ${empleadoId}.`);
  }

  if (empleado.activo === false) {
    return crearError("No se puede mover un empleado inactivo.");
  }

  const nuevoSupervisor = mapaEmpleados.get(String(supervisorId));

  if (!nuevoSupervisor) {
    return crearError(`No existe el supervisor ${supervisorId}.`);
  }

  if (nuevoSupervisor.activo === false) {
    return crearError("No se puede asignar un supervisor inactivo.");
  }

  /*
  |--------------------------------------------------------------------------
  | Sin cambios
  |--------------------------------------------------------------------------
  */

  if (
    empleado.supervisorId !== null &&
    String(empleado.supervisorId) === String(supervisorId)
  ) {
    return crearError(
      `${nuevoSupervisor.nombre} ya es el supervisor de ${empleado.nombre}.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Detectar si el nuevo supervisor está debajo del empleado
  |--------------------------------------------------------------------------
  |
  | Ejemplo inválido:
  |
  | Juan
  |   └── Pedro
  |        └── Carlos
  |
  | No se puede mover Juan debajo de Carlos porque se formaría:
  |
  | Juan → Pedro → Carlos → Juan
  |
  */

  const descendientes = obtenerDescendientes({
    idEmpleado: empleadoId,
    empleados,
  });

  if (descendientes.has(String(supervisorId))) {
    return crearError(
      `${nuevoSupervisor.nombre} depende jerárquicamente de ${empleado.nombre}. Ese movimiento generaría un ciclo.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validación adicional recorriendo la cadena del nuevo supervisor
  |--------------------------------------------------------------------------
  */

  const resultadoCadena = validarCadenaSupervisores({
    empleadoId,
    supervisorId,
    mapaEmpleados,
  });

  if (!resultadoCadena.ok) {
    return resultadoCadena;
  }

  return {
    ok: true,
    error: "",
  };
}

/* ============================================================
   OBTENER DESCENDIENTES
============================================================ */

/**
 * Devuelve un Set con todos los empleados que dependen directa o
 * indirectamente del empleado indicado.
 */

export function obtenerDescendientes({ idEmpleado, empleados }) {
  const idInicial = convertirIdentificador(idEmpleado);

  const resultado = new Set();

  if (idInicial === null || !Array.isArray(empleados)) {
    return resultado;
  }

  const hijosPorSupervisor = new Map();

  empleados.forEach((empleado) => {
    if (
      empleado?.activo === false ||
      empleado?.supervisorId === null ||
      empleado?.supervisorId === undefined
    ) {
      return;
    }

    const supervisor = String(empleado.supervisorId);

    if (!hijosPorSupervisor.has(supervisor)) {
      hijosPorSupervisor.set(supervisor, []);
    }

    hijosPorSupervisor
      .get(supervisor)
      .push(convertirIdentificador(empleado.idEmpleado ?? empleado.id));
  });

  const pendientes = [String(idInicial)];

  while (pendientes.length > 0) {
    const actual = pendientes.shift();

    const hijos = hijosPorSupervisor.get(actual) || [];

    hijos.forEach((hijoId) => {
      if (hijoId === null) {
        return;
      }

      const clave = String(hijoId);

      if (resultado.has(clave)) {
        return;
      }

      resultado.add(clave);
      pendientes.push(clave);
    });
  }

  return resultado;
}

/* ============================================================
   VALIDAR CADENA DE SUPERVISORES
============================================================ */

function validarCadenaSupervisores({
  empleadoId,
  supervisorId,
  mapaEmpleados,
}) {
  const visitados = new Set();

  let actual = supervisorId;

  while (actual !== null) {
    const clave = String(actual);

    if (clave === String(empleadoId)) {
      return crearError("El movimiento generaría un ciclo en el organigrama.");
    }

    if (visitados.has(clave)) {
      return crearError(
        "La estructura actual ya contiene un ciclo jerárquico.",
      );
    }

    visitados.add(clave);

    const empleado = mapaEmpleados.get(clave);

    if (!empleado) {
      return {
        ok: true,
        error: "",
      };
    }

    actual = convertirIdentificador(empleado.supervisorId);
  }

  return {
    ok: true,
    error: "",
  };
}

/* ============================================================
   CREAR MAPA
============================================================ */

function construirMapaEmpleados(empleados) {
  const mapa = new Map();

  empleados.forEach((empleado) => {
    const id = convertirIdentificador(empleado?.idEmpleado ?? empleado?.id);

    if (id === null) {
      return;
    }

    mapa.set(String(id), {
      ...empleado,

      idEmpleado: id,

      supervisorId: convertirIdentificador(empleado?.supervisorId),
    });
  });

  return mapa;
}

/* ============================================================
   IDENTIFICADORES
============================================================ */

function convertirIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const numero = Number(valor);

  if (Number.isFinite(numero) && Number.isInteger(numero)) {
    return numero;
  }

  return String(valor).trim();
}

/* ============================================================
   RESULTADO DE ERROR
============================================================ */

function crearError(mensaje) {
  return {
    ok: false,
    error: mensaje,
  };
}
