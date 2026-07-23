import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../../../firebase";

const DOCUMENTO_ID = "principal";

export const ESTRUCTURA_INICIAL = {
  directorEjecutivo: {
    id: "director-ejecutivo",
    nombreSector: "Dirección Ejecutiva",
    nombrePersona: "",
    posicion: {
      x: 600,
      y: 40,
    },
  },

  directores: [
    {
      id: "director-1",
      nombreSector: "Dirección 1",
      nombrePersona: "",
      posicion: {
        x: 250,
        y: 280,
      },
    },
    {
      id: "director-2",
      nombreSector: "Dirección 2",
      nombrePersona: "",
      posicion: {
        x: 950,
        y: 280,
      },
    },
  ],

  gerencias: [
    {
      id: "gerencia-1",
      nombreSector: "Gerencia 1",
      nombrePersona: "",
      posicion: {
        x: 0,
        y: 560,
      },
    },
    {
      id: "gerencia-2",
      nombreSector: "Gerencia 2",
      nombrePersona: "",
      posicion: {
        x: 300,
        y: 560,
      },
    },
    {
      id: "gerencia-3",
      nombreSector: "Gerencia 3",
      nombrePersona: "",
      posicion: {
        x: 600,
        y: 560,
      },
    },
    {
      id: "gerencia-4",
      nombreSector: "Gerencia 4",
      nombrePersona: "",
      posicion: {
        x: 900,
        y: 560,
      },
    },
    {
      id: "gerencia-5",
      nombreSector: "Gerencia 5",
      nombrePersona: "",
      posicion: {
        x: 1200,
        y: 560,
      },
    },
  ],

  jefaturas: [
    {
      id: "jefatura-1",
      nombreSector: "Jefatura 1",
      nombrePersona: "",
      gerenciaId: "gerencia-1",
      posicion: {
        x: 0,
        y: 900,
      },
    },
    {
      id: "jefatura-2",
      nombreSector: "Jefatura 2",
      nombrePersona: "",
      gerenciaId: "gerencia-1",
      posicion: {
        x: 230,
        y: 900,
      },
    },
    {
      id: "jefatura-3",
      nombreSector: "Jefatura 3",
      nombrePersona: "",
      gerenciaId: "gerencia-2",
      posicion: {
        x: 460,
        y: 900,
      },
    },
    {
      id: "jefatura-4",
      nombreSector: "Jefatura 4",
      nombrePersona: "",
      gerenciaId: "gerencia-3",
      posicion: {
        x: 690,
        y: 900,
      },
    },
    {
      id: "jefatura-5",
      nombreSector: "Jefatura 5",
      nombrePersona: "",
      gerenciaId: "gerencia-4",
      posicion: {
        x: 920,
        y: 900,
      },
    },
    {
      id: "jefatura-6",
      nombreSector: "Jefatura 6",
      nombrePersona: "",
      gerenciaId: "gerencia-5",
      posicion: {
        x: 1150,
        y: 900,
      },
    },
    {
      id: "jefatura-7",
      nombreSector: "Jefatura 7",
      nombrePersona: "",
      gerenciaId: "gerencia-5",
      posicion: {
        x: 1380,
        y: 900,
      },
    },
  ],
};

export async function obtenerOrganigramaEstructural() {
  const referencia = doc(db, "organigrama_estructural", DOCUMENTO_ID);

  const snapshot = await getDoc(referencia);

  if (!snapshot.exists()) {
    await setDoc(referencia, {
      ...ESTRUCTURA_INICIAL,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });

    return ESTRUCTURA_INICIAL;
  }

  const datos = snapshot.data();

  return {
    directorEjecutivo:
      datos.directorEjecutivo || ESTRUCTURA_INICIAL.directorEjecutivo,

    directores: Array.isArray(datos.directores)
      ? datos.directores
      : ESTRUCTURA_INICIAL.directores,

    gerencias: Array.isArray(datos.gerencias)
      ? datos.gerencias
      : ESTRUCTURA_INICIAL.gerencias,

    jefaturas: Array.isArray(datos.jefaturas)
      ? datos.jefaturas
      : Array.isArray(datos.jefes)
        ? datos.jefes.map((jefe) => ({
            ...jefe,
            gerenciaId: jefe.gerenciaId || jefe.gerenteId || "",
          }))
        : ESTRUCTURA_INICIAL.jefaturas,
  };
}

export async function guardarOrganigramaEstructural(estructura) {
  const referencia = doc(db, "organigrama_estructural", DOCUMENTO_ID);

  await setDoc(
    referencia,
    {
      directorEjecutivo: estructura.directorEjecutivo,

      directores: estructura.directores,

      gerencias: estructura.gerencias,

      jefaturas: estructura.jefaturas,

      actualizadoEn: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}
