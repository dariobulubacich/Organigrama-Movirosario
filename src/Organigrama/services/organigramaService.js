import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../firebase";

const COLECCION_EMPLEADOS = "empleados";
const LIMITE_OPERACIONES_BATCH = 450;

/* ============================================================
   OBTENER TODOS LOS EMPLEADOS
============================================================ */

export async function obtenerEmpleados({ soloActivos = false } = {}) {
  try {
    const referencia = collection(db, COLECCION_EMPLEADOS);

    let consulta;

    if (soloActivos) {
      consulta = query(
        referencia,
        where("activo", "==", true),
        orderBy("orden", "asc"),
      );
    } else {
      consulta = query(referencia, orderBy("orden", "asc"));
    }

    const snapshot = await getDocs(consulta);

    return snapshot.docs
      .map((documento) =>
        normalizarEmpleadoFirestore(documento.id, documento.data()),
      )
      .sort(ordenarEmpleados);
  } catch (error) {
    console.error("Error al obtener los empleados:", error);

    /*
    |--------------------------------------------------------------------------
    | Si Firestore solicita un índice para la consulta combinada,
    | hacemos una consulta simple y filtramos en memoria.
    |--------------------------------------------------------------------------
    */

    if (soloActivos) {
      const snapshot = await getDocs(collection(db, COLECCION_EMPLEADOS));

      return snapshot.docs
        .map((documento) =>
          normalizarEmpleadoFirestore(documento.id, documento.data()),
        )
        .filter((empleado) => empleado.activo !== false)
        .sort(ordenarEmpleados);
    }

    throw crearErrorServicio(error, "No se pudieron obtener los empleados.");
  }
}

/* ============================================================
   OBTENER UN EMPLEADO
============================================================ */

export async function obtenerEmpleado(idEmpleado) {
  validarIdentificador(idEmpleado);

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      return null;
    }

    return normalizarEmpleadoFirestore(snapshot.id, snapshot.data());
  } catch (error) {
    console.error("Error al obtener el empleado:", error);

    throw crearErrorServicio(error, "No se pudo obtener el empleado.");
  }
}

/* ============================================================
   COMPROBAR SI EXISTE
============================================================ */

export async function existeEmpleado(idEmpleado) {
  validarIdentificador(idEmpleado);

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

    const snapshot = await getDoc(referencia);

    return snapshot.exists();
  } catch (error) {
    console.error("Error al comprobar el empleado:", error);

    throw crearErrorServicio(
      error,
      "No se pudo comprobar si el empleado existe.",
    );
  }
}

/* ============================================================
   CREAR O ACTUALIZAR EMPLEADO
============================================================ */

export async function guardarEmpleado(empleado) {
  const datos = prepararEmpleadoParaGuardar(empleado);

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(datos.idEmpleado));

    const snapshot = await getDoc(referencia);

    const datosGuardar = {
      ...datos,

      fechaActualizacion: serverTimestamp(),
    };

    if (!snapshot.exists()) {
      datosGuardar.fechaAlta = empleado?.fechaAlta || serverTimestamp();
    } else {
      const datosExistentes = snapshot.data();

      datosGuardar.fechaAlta =
        datosExistentes.fechaAlta || empleado?.fechaAlta || serverTimestamp();
    }

    await setDoc(referencia, datosGuardar, {
      merge: true,
    });

    return {
      idEmpleado: datos.idEmpleado,
      creado: !snapshot.exists(),
    };
  } catch (error) {
    console.error("Error al guardar el empleado:", error);

    throw crearErrorServicio(error, "No se pudo guardar el empleado.");
  }
}

/* ============================================================
   ACTUALIZAR EMPLEADO
============================================================ */

export async function actualizarEmpleado(idEmpleado, datos) {
  validarIdentificador(idEmpleado);

  if (!datos || typeof datos !== "object") {
    throw new Error("Los datos del empleado son inválidos.");
  }

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      throw new Error(`No existe el empleado con identificador ${idEmpleado}.`);
    }

    const datosPreparados = prepararDatosActualizacion(datos);

    await updateDoc(referencia, {
      ...datosPreparados,
      fechaActualizacion: serverTimestamp(),
    });

    return {
      idEmpleado: convertirIdentificador(idEmpleado),
      actualizado: true,
    };
  } catch (error) {
    console.error("Error al actualizar el empleado:", error);

    throw crearErrorServicio(error, "No se pudo actualizar el empleado.");
  }
}

/* ============================================================
   ACTIVAR EMPLEADO
============================================================ */

export async function activarEmpleado(idEmpleado) {
  return actualizarEstadoEmpleado(idEmpleado, true);
}

/* ============================================================
   DESACTIVAR EMPLEADO
============================================================ */

export async function desactivarEmpleado(idEmpleado) {
  return actualizarEstadoEmpleado(idEmpleado, false);
}

/* ============================================================
   CAMBIAR ESTADO
============================================================ */

async function actualizarEstadoEmpleado(idEmpleado, activo) {
  validarIdentificador(idEmpleado);

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      throw new Error(`No existe el empleado con identificador ${idEmpleado}.`);
    }

    await updateDoc(referencia, {
      activo,
      fechaActualizacion: serverTimestamp(),
    });

    return {
      idEmpleado: convertirIdentificador(idEmpleado),
      activo,
    };
  } catch (error) {
    console.error("Error al cambiar el estado del empleado:", error);

    throw crearErrorServicio(
      error,
      "No se pudo cambiar el estado del empleado.",
    );
  }
}

/* ============================================================
   ELIMINAR DEFINITIVAMENTE
============================================================ */

export async function eliminarEmpleado(idEmpleado) {
  validarIdentificador(idEmpleado);

  try {
    const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

    await deleteDoc(referencia);

    return {
      idEmpleado: convertirIdentificador(idEmpleado),
      eliminado: true,
    };
  } catch (error) {
    console.error("Error al eliminar el empleado:", error);

    throw crearErrorServicio(error, "No se pudo eliminar el empleado.");
  }
}

/* ============================================================
   OBTENER SUBORDINADOS
============================================================ */

export async function obtenerSubordinados(
  supervisorId,
  { soloActivos = true } = {},
) {
  validarIdentificador(supervisorId);

  try {
    const consulta = query(
      collection(db, COLECCION_EMPLEADOS),
      where("supervisorId", "==", convertirIdentificador(supervisorId)),
    );

    const snapshot = await getDocs(consulta);

    return snapshot.docs
      .map((documento) =>
        normalizarEmpleadoFirestore(documento.id, documento.data()),
      )
      .filter((empleado) => !soloActivos || empleado.activo !== false)
      .sort(ordenarEmpleados);
  } catch (error) {
    console.error("Error al obtener subordinados:", error);

    throw crearErrorServicio(error, "No se pudieron obtener los subordinados.");
  }
}

/* ============================================================
   GUARDAR LOTE
============================================================ */

export async function guardarLote(empleados) {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return {
      total: 0,
      lotes: 0,
    };
  }

  const empleadosPreparados = empleados.map(prepararEmpleadoParaGuardar);

  const lotes = dividirEnLotes(empleadosPreparados, LIMITE_OPERACIONES_BATCH);

  try {
    for (let indice = 0; indice < lotes.length; indice += 1) {
      const batch = writeBatch(db);

      lotes[indice].forEach((empleado) => {
        const referencia = doc(
          db,
          COLECCION_EMPLEADOS,
          String(empleado.idEmpleado),
        );

        batch.set(
          referencia,
          {
            ...empleado,

            fechaAlta: empleado.fechaAlta || serverTimestamp(),

            fechaActualizacion: serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      });

      await batch.commit();
    }

    return {
      total: empleadosPreparados.length,
      lotes: lotes.length,
    };
  } catch (error) {
    console.error("Error al guardar el lote:", error);

    throw crearErrorServicio(
      error,
      "No se pudo completar la importación masiva.",
    );
  }
}

/* ============================================================
   DESACTIVAR VARIOS EMPLEADOS
============================================================ */

export async function desactivarLote(idsEmpleados) {
  if (!Array.isArray(idsEmpleados) || idsEmpleados.length === 0) {
    return {
      total: 0,
      lotes: 0,
    };
  }

  const idsValidos = [
    ...new Set(
      idsEmpleados
        .map(convertirIdentificador)
        .filter(
          (id) => id !== null && id !== undefined && String(id).trim() !== "",
        ),
    ),
  ];

  const lotes = dividirEnLotes(idsValidos, LIMITE_OPERACIONES_BATCH);

  try {
    for (const lote of lotes) {
      const batch = writeBatch(db);

      lote.forEach((idEmpleado) => {
        const referencia = doc(db, COLECCION_EMPLEADOS, String(idEmpleado));

        batch.update(referencia, {
          activo: false,
          fechaActualizacion: serverTimestamp(),
        });
      });

      await batch.commit();
    }

    return {
      total: idsValidos.length,
      lotes: lotes.length,
    };
  } catch (error) {
    console.error("Error al desactivar empleados en lote:", error);

    throw crearErrorServicio(error, "No se pudieron desactivar los empleados.");
  }
}

/* ============================================================
   PREPARAR EMPLEADO
============================================================ */

function prepararEmpleadoParaGuardar(empleado) {
  if (!empleado || typeof empleado !== "object") {
    throw new Error("El empleado recibido es inválido.");
  }

  const idEmpleado = convertirIdentificador(empleado.idEmpleado);

  validarIdentificador(idEmpleado);

  const nombre = limpiarTexto(empleado.nombre);

  const cargo = limpiarTexto(empleado.cargo || empleado.puesto);

  if (!nombre) {
    throw new Error(`El empleado ${idEmpleado} no tiene nombre.`);
  }

  if (!cargo) {
    throw new Error(`El empleado ${idEmpleado} no tiene cargo.`);
  }

  return {
    idEmpleado,

    nombre,

    cargo,

    supervisorId: convertirIdentificador(empleado.supervisorId),

    area: limpiarTexto(empleado.area),

    nivel: limpiarTexto(empleado.nivel),

    telefono: limpiarTexto(empleado.telefono),

    interno: limpiarTexto(empleado.interno),

    email: limpiarTexto(empleado.email),

    foto: limpiarTexto(empleado.foto),

    color: limpiarTexto(empleado.color),

    orden: convertirOrden(empleado.orden),

    activo: empleado.activo !== false,

    ...(empleado.fechaAlta
      ? {
          fechaAlta: empleado.fechaAlta,
        }
      : {}),
  };
}

/* ============================================================
   PREPARAR ACTUALIZACIÓN
============================================================ */

function prepararDatosActualizacion(datos) {
  const permitidos = {};

  if ("nombre" in datos) {
    const nombre = limpiarTexto(datos.nombre);

    if (!nombre) {
      throw new Error("El nombre del empleado es obligatorio.");
    }

    permitidos.nombre = nombre;
  }

  if ("cargo" in datos || "puesto" in datos) {
    const cargo = limpiarTexto(datos.cargo || datos.puesto);

    if (!cargo) {
      throw new Error("El cargo del empleado es obligatorio.");
    }

    permitidos.cargo = cargo;
  }

  if ("supervisorId" in datos) {
    permitidos.supervisorId = convertirIdentificador(datos.supervisorId);
  }

  if ("area" in datos) {
    permitidos.area = limpiarTexto(datos.area);
  }

  if ("nivel" in datos) {
    permitidos.nivel = limpiarTexto(datos.nivel);
  }

  if ("telefono" in datos) {
    permitidos.telefono = limpiarTexto(datos.telefono);
  }

  if ("interno" in datos) {
    permitidos.interno = limpiarTexto(datos.interno);
  }

  if ("email" in datos) {
    permitidos.email = limpiarTexto(datos.email);
  }

  if ("foto" in datos) {
    permitidos.foto = limpiarTexto(datos.foto);
  }

  if ("color" in datos) {
    permitidos.color = limpiarTexto(datos.color);
  }

  if ("orden" in datos) {
    permitidos.orden = convertirOrden(datos.orden);
  }

  if ("activo" in datos) {
    permitidos.activo = datos.activo !== false;
  }

  return permitidos;
}

/* ============================================================
   NORMALIZAR DATOS DE FIRESTORE
============================================================ */

function normalizarEmpleadoFirestore(idDocumento, datos) {
  const idEmpleado = convertirIdentificador(datos?.idEmpleado ?? idDocumento);

  return {
    id: idDocumento,

    ...datos,

    idEmpleado,

    nombre: limpiarTexto(datos?.nombre),

    cargo: limpiarTexto(datos?.cargo || datos?.puesto),

    supervisorId: convertirIdentificador(datos?.supervisorId),

    area: limpiarTexto(datos?.area),

    nivel: limpiarTexto(datos?.nivel),

    telefono: limpiarTexto(datos?.telefono),

    interno: limpiarTexto(datos?.interno),

    email: limpiarTexto(datos?.email),

    foto: limpiarTexto(datos?.foto),

    color: limpiarTexto(datos?.color),

    orden: convertirOrden(datos?.orden),

    activo: datos?.activo !== false,
  };
}

/* ============================================================
   VALIDACIONES Y UTILIDADES
============================================================ */

function validarIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    throw new Error("El identificador del empleado es obligatorio.");
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero <= 0) {
    throw new Error(
      "El identificador debe ser un número entero mayor que cero.",
    );
  }
}

function convertirIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const numero = Number(valor);

  if (Number.isFinite(numero)) {
    return numero;
  }

  return String(valor).trim();
}

function convertirOrden(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numero));
}

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
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

function dividirEnLotes(lista, tamano) {
  const lotes = [];

  for (let indice = 0; indice < lista.length; indice += tamano) {
    lotes.push(lista.slice(indice, indice + tamano));
  }

  return lotes;
}

function crearErrorServicio(error, mensajePredeterminado) {
  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error(mensajePredeterminado);
}
