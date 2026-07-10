import * as XLSX from "xlsx";

/* ===========================================
   CONFIGURACIÓN
=========================================== */

const COLUMNAS_OBLIGATORIAS = [
  "Identificador único",
  "Nombre del empleado",
  "Persona que supervisa al empleado",
  "Puesto",
];

/* ===========================================
   FUNCIÓN PRINCIPAL
=========================================== */

export async function leerExcelOrganigrama(file) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  if (!workbook.SheetNames.length) {
    throw new Error("El archivo no contiene hojas.");
  }

  const hoja = workbook.Sheets[workbook.SheetNames[0]];

  const datos = XLSX.utils.sheet_to_json(hoja, {
    defval: "",
  });

  const errores = [];

  validarColumnas(datos, errores);

  const empleados = limpiarDatos(datos);

  validarIdsDuplicados(empleados, errores);

  validarSupervisor(empleados, errores);

  validarRaiz(empleados, errores);

  validarCiclos(empleados, errores);

  return {
    ok: errores.length === 0,
    empleados,
    errores,
  };
}

/* ===========================================
   VALIDAR COLUMNAS
=========================================== */

function validarColumnas(datos, errores) {
  if (!datos.length) {
    errores.push("El Excel está vacío.");
    return;
  }

  const columnas = Object.keys(datos[0]);

  COLUMNAS_OBLIGATORIAS.forEach((columna) => {
    if (!columnas.includes(columna)) {
      errores.push(`Falta la columna "${columna}".`);
    }
  });
}

/* ===========================================
   LIMPIAR DATOS
=========================================== */

function limpiarDatos(datos) {
  return datos.map((fila) => ({
    idEmpleado: Number(fila["Identificador único"]),

    nombre: String(fila["Nombre del empleado"] || "").trim(),

    cargo: String(fila["Puesto"] || "").trim(),

    supervisorId:
      fila["Persona que supervisa al empleado"] === ""
        ? null
        : Number(fila["Persona que supervisa al empleado"]),

    area: "",

    telefono: "",

    interno: "",

    email: "",

    foto: "",

    nivel: "",

    orden: 0,

    activo: true,

    fechaAlta: new Date(),

    fechaActualizacion: new Date(),
  }));
}

/* ===========================================
   IDS DUPLICADOS
=========================================== */

function validarIdsDuplicados(lista, errores) {
  const ids = new Set();

  lista.forEach((emp) => {
    if (ids.has(emp.idEmpleado)) {
      errores.push(`ID duplicado: ${emp.idEmpleado}`);
    }

    ids.add(emp.idEmpleado);
  });
}

/* ===========================================
   SUPERVISOR
=========================================== */

function validarSupervisor(lista, errores) {
  const ids = new Set(lista.map((e) => e.idEmpleado));

  lista.forEach((emp) => {
    if (emp.supervisorId !== null && !ids.has(emp.supervisorId)) {
      errores.push(
        `El empleado ${emp.idEmpleado} tiene un supervisor inexistente (${emp.supervisorId}).`,
      );
    }
  });
}

/* ===========================================
   RAÍZ
=========================================== */

function validarRaiz(lista, errores) {
  const raiz = lista.filter((e) => e.supervisorId === null);

  if (raiz.length === 0) {
    errores.push("No existe un Director General (supervisor vacío).");
  }

  if (raiz.length > 1) {
    errores.push("Existe más de un empleado sin supervisor.");
  }
}

/* ===========================================
   CICLOS
=========================================== */

function validarCiclos(lista, errores) {
  const mapa = {};

  lista.forEach((e) => {
    mapa[e.idEmpleado] = e.supervisorId;
  });

  lista.forEach((empleado) => {
    const visitados = new Set();

    let actual = empleado.idEmpleado;

    while (actual !== null) {
      if (visitados.has(actual)) {
        errores.push(
          `Se detectó un ciclo jerárquico en el empleado ${empleado.idEmpleado}.`,
        );
        return;
      }

      visitados.add(actual);

      actual = mapa[actual] ?? null;
    }
  });
}
