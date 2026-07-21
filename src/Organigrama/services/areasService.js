import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../firebase";

const ESTRUCTURA_PREDETERMINADA = [
  {
    id: "gerente",
    nombre: "Gerente",
    nivel: 1,
    orden: 1,
    puestoSupervisorId: null,
  },
  {
    id: "jefe",
    nombre: "Jefe",
    nivel: 2,
    orden: 2,
    puestoSupervisorId: "gerente",
  },
  {
    id: "supervisor",
    nombre: "Supervisor",
    nivel: 3,
    orden: 3,
    puestoSupervisorId: "jefe",
  },
  {
    id: "coordinador",
    nombre: "Coordinador",
    nivel: 4,
    orden: 4,
    puestoSupervisorId: "supervisor",
  },
  {
    id: "personal",
    nombre: "Personal",
    nivel: 5,
    orden: 5,
    puestoSupervisorId: "coordinador",
  },
];

export async function crearArea(nombreArea) {
  const nombre = String(nombreArea || "").trim();

  if (!nombre) {
    throw new Error("Ingresá el nombre del área.");
  }

  const areaRef = await addDoc(collection(db, "areas"), {
    nombre,
    activo: true,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });

  const batch = writeBatch(db);

  ESTRUCTURA_PREDETERMINADA.forEach((puesto) => {
    const puestoRef = doc(db, "areas", areaRef.id, "puestos", puesto.id);

    batch.set(puestoRef, {
      ...puesto,
      empleadoId: null,
      activo: true,
      creadoEn: serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    id: areaRef.id,
    nombre,
  };
}

export async function obtenerAreas() {
  const snapshot = await getDocs(collection(db, "areas"));

  return snapshot.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }))
    .filter((area) => area.activo !== false)
    .sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
        sensitivity: "base",
      }),
    );
}

export async function modificarNombreArea(areaId, nuevoNombre) {
  const nombre = String(nuevoNombre || "").trim();

  if (!areaId) {
    throw new Error("No se encontró el área.");
  }

  if (!nombre) {
    throw new Error("Ingresá el nuevo nombre.");
  }

  await updateDoc(doc(db, "areas", areaId), {
    nombre,
    actualizadoEn: serverTimestamp(),
  });
}

export async function eliminarArea(areaId) {
  if (!areaId) {
    throw new Error("No se encontró el área.");
  }

  await deleteDoc(doc(db, "areas", areaId));
}
