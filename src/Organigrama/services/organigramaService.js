import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../firebase";

const COLECCION = "empleados";

/* ============================= */
/* OBTENER TODOS */
/* ============================= */

export async function obtenerEmpleados() {
  const snap = await getDocs(collection(db, COLECCION));

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* ============================= */
/* OBTENER UNO */
/* ============================= */

export async function obtenerEmpleado(idEmpleado) {
  const ref = doc(db, COLECCION, String(idEmpleado));

  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

/* ============================= */
/* CREAR / ACTUALIZAR */
/* ============================= */

export async function guardarEmpleado(empleado) {
  const ref = doc(db, COLECCION, String(empleado.idEmpleado));

  await setDoc(
    ref,
    {
      ...empleado,
      fechaActualizacion: new Date(),
    },
    { merge: true },
  );
}

/* ============================= */
/* MODIFICAR */
/* ============================= */

export async function actualizarEmpleado(idEmpleado, datos) {
  const ref = doc(db, COLECCION, String(idEmpleado));

  await updateDoc(ref, {
    ...datos,
    fechaActualizacion: new Date(),
  });
}

/* ============================= */
/* ELIMINAR */
/* ============================= */

export async function eliminarEmpleado(idEmpleado) {
  await deleteDoc(doc(db, COLECCION, String(idEmpleado)));
}

/* ============================= */
/* DESACTIVAR */
/* ============================= */

export async function desactivarEmpleado(idEmpleado) {
  const ref = doc(db, COLECCION, String(idEmpleado));

  await updateDoc(ref, {
    activo: false,
    fechaActualizacion: new Date(),
  });
}

/* ============================= */
/* ACTIVAR */
/* ============================= */

export async function activarEmpleado(idEmpleado) {
  const ref = doc(db, COLECCION, String(idEmpleado));

  await updateDoc(ref, {
    activo: true,
    fechaActualizacion: new Date(),
  });
}

/* ============================= */
/* BUSCAR POR SUPERVISOR */
/* ============================= */

export async function obtenerSubordinados(supervisorId) {
  const q = query(
    collection(db, COLECCION),
    where("supervisorId", "==", supervisorId),
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* ============================= */
/* IMPORTACIÓN MASIVA */
/* ============================= */

export async function guardarLote(lista) {
  const batch = writeBatch(db);

  lista.forEach((empleado) => {
    const ref = doc(db, COLECCION, String(empleado.idEmpleado));

    batch.set(
      ref,
      {
        ...empleado,
        fechaActualizacion: new Date(),
      },
      { merge: true },
    );
  });

  await batch.commit();
}
