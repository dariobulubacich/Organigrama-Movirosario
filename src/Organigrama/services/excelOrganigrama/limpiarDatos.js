/*
|--------------------------------------------------------------------------
| Convierte las filas del Excel al formato interno del sistema.
|--------------------------------------------------------------------------
|
| Recibe:
|   filas -> Datos obtenidos desde XLSX
|   columnas -> Mapeo devuelto por buscarColumnas()
|
| Devuelve:
|   Array de empleados listo para guardar en Firestore.
|
*/

export default function limpiarDatos(filas, columnas) {
  return filas.map((fila, index) => {
    const idEmpleado = convertirNumero(fila[columnas.idEmpleado]);

    const supervisor = fila[columnas.supervisorId];

    return {
      idEmpleado,

      nombre: limpiarTexto(fila[columnas.nombre]),

      cargo: limpiarTexto(fila[columnas.cargo]),

      supervisorId:
        supervisor === "" || supervisor === null || supervisor === undefined
          ? null
          : convertirNumero(supervisor),

      // Campos preparados para futuras funcionalidades

      area: "",

      nivel: "",

      telefono: "",

      interno: "",

      email: "",

      foto: "",

      color: "",

      activo: true,

      orden: index + 1,

      fechaAlta: new Date(),

      fechaActualizacion: new Date(),
    };
  });
}

/* ============================================================
   FUNCIONES AUXILIARES
============================================================ */

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

function convertirNumero(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  return Number.isNaN(numero) ? null : numero;
}
