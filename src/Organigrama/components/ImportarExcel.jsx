import { useRef, useState } from "react";

import { leerExcelOrganigrama } from "../services/excelOrganigrama";

import {
  obtenerEmpleados,
  guardarLote,
  desactivarLote,
} from "../services/organigramaService";
import "./ImportarExcel.css";

const TAMANO_LOTE = 25;

export default function ImportarExcel({ onImportacionFinalizada }) {
  const inputArchivoRef = useRef(null);

  const [archivo, setArchivo] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [errores, setErrores] = useState([]);

  const [nombreHoja, setNombreHoja] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);

  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [resultadoImportacion, setResultadoImportacion] = useState(null);

  const [desactivarAusentes, setDesactivarAusentes] = useState(true);

  /* ============================================================
     SELECCIONAR Y LEER ARCHIVO
  ============================================================ */

  const handleSeleccionarArchivo = async (event) => {
    const archivoSeleccionado = event.target.files?.[0];

    limpiarResultadoAnterior();

    if (!archivoSeleccionado) {
      setArchivo(null);
      return;
    }

    setArchivo(archivoSeleccionado);
    setLeyendo(true);
    setMensaje("Leyendo y validando el archivo...");

    try {
      const resultado = await leerExcelOrganigrama(archivoSeleccionado);

      setNombreHoja(resultado.nombreHoja || "");
      setEmpleados(resultado.empleados || []);
      setErrores(resultado.errores || []);

      if (resultado.ok) {
        setMensaje(
          `Archivo válido. Se encontraron ${resultado.cantidadRegistros} empleados.`,
        );
      } else {
        setMensaje("El archivo contiene errores y no puede importarse.");
      }
    } catch (error) {
      console.error("Error al seleccionar el Excel:", error);

      setEmpleados([]);
      setErrores([
        error?.message || "No se pudo leer el archivo seleccionado.",
      ]);

      setMensaje("No se pudo procesar el archivo.");
    } finally {
      setLeyendo(false);
    }
  };

  /* ============================================================
     IMPORTAR A FIRESTORE
  ============================================================ */

  const handleImportar = async () => {
    if (importando || leyendo) return;

    if (!empleados.length) {
      setErrores(["No hay empleados válidos disponibles para importar."]);
      return;
    }

    if (errores.length > 0) {
      setMensaje("Corregí los errores del archivo antes de importar.");
      return;
    }

    setImportando(true);
    setProgreso(0);
    setResultadoImportacion(null);
    setMensaje("Preparando la importación...");

    try {
      const empleadosExistentes = await obtenerEmpleados();

      const mapaExistentes = new Map(
        empleadosExistentes.map((empleado) => [
          String(
            empleado.idEmpleado !== undefined
              ? empleado.idEmpleado
              : empleado.id,
          ),
          empleado,
        ]),
      );

      let cantidadNuevos = 0;
      let cantidadActualizados = 0;

      const empleadosPreparados = empleados.map((empleado) => {
        const existente = mapaExistentes.get(String(empleado.idEmpleado));

        if (existente) {
          cantidadActualizados += 1;

          return {
            ...empleado,

            // Conservamos la fecha original del alta.
            fechaAlta: existente.fechaAlta || empleado.fechaAlta,

            activo: true,
          };
        }

        cantidadNuevos += 1;

        return {
          ...empleado,
          activo: true,
        };
      });

      const idsDelExcel = new Set(
        empleadosPreparados.map((empleado) => String(empleado.idEmpleado)),
      );

      const empleadosAusentes = desactivarAusentes
        ? empleadosExistentes.filter((empleado) => {
            const id = String(
              empleado.idEmpleado !== undefined
                ? empleado.idEmpleado
                : empleado.id,
            );

            return empleado.activo !== false && !idsDelExcel.has(id);
          })
        : [];

      const totalOperaciones =
        empleadosPreparados.length + empleadosAusentes.length;

      let operacionesRealizadas = 0;

      /* ------------------------------------------------------------
         GUARDAR EMPLEADOS EN LOTES
      ------------------------------------------------------------ */

      const lotes = dividirEnLotes(empleadosPreparados, TAMANO_LOTE);

      for (let indice = 0; indice < lotes.length; indice += 1) {
        const lote = lotes[indice];

        setMensaje(
          `Importando empleados: lote ${indice + 1} de ${lotes.length}...`,
        );

        await guardarLote(lote);

        operacionesRealizadas += lote.length;

        actualizarProgreso(operacionesRealizadas, totalOperaciones);
      }

      /* ------------------------------------------------------------
         DESACTIVAR EMPLEADOS AUSENTES
      ------------------------------------------------------------ */

      if (empleadosAusentes.length > 0) {
        setMensaje(
          `Desactivando ${empleadosAusentes.length} empleados ausentes...`,
        );

        const idsAusentes = empleadosAusentes.map((empleado) =>
          empleado.idEmpleado !== undefined ? empleado.idEmpleado : empleado.id,
        );

        await desactivarLote(idsAusentes);

        operacionesRealizadas += empleadosAusentes.length;

        actualizarProgreso(operacionesRealizadas, totalOperaciones);
      }

      setProgreso(100);

      const resumen = {
        total: empleadosPreparados.length,
        nuevos: cantidadNuevos,
        actualizados: cantidadActualizados,
        desactivados: empleadosAusentes.length,
      };

      setResultadoImportacion(resumen);
      setMensaje("Importación finalizada correctamente.");

      if (typeof onImportacionFinalizada === "function") {
        await onImportacionFinalizada(resumen);
      }
    } catch (error) {
      console.error("Error al importar el organigrama:", error);

      setErrores([
        error?.message || "Ocurrió un error durante la importación.",
      ]);

      setMensaje("La importación no pudo completarse.");
    } finally {
      setImportando(false);
    }
  };

  /* ============================================================
     LIMPIAR ARCHIVO
  ============================================================ */

  const handleLimpiar = () => {
    if (importando) return;

    setArchivo(null);
    setEmpleados([]);
    setErrores([]);
    setNombreHoja("");
    setProgreso(0);
    setMensaje("");
    setResultadoImportacion(null);

    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = "";
    }
  };

  /* ============================================================
     AUXILIARES
  ============================================================ */

  const limpiarResultadoAnterior = () => {
    setEmpleados([]);
    setErrores([]);
    setNombreHoja("");
    setProgreso(0);
    setMensaje("");
    setResultadoImportacion(null);
  };

  const actualizarProgreso = (realizadas, total) => {
    if (total <= 0) {
      setProgreso(100);
      return;
    }

    const porcentaje = Math.round((realizadas / total) * 100);

    setProgreso(Math.min(porcentaje, 100));
  };

  const puedeImportar =
    empleados.length > 0 && errores.length === 0 && !leyendo && !importando;

  return (
    <section className="importar-organigrama">
      <div className="importar-organigrama__encabezado">
        <div>
          <h2>Importar organigrama</h2>

          <p>
            Seleccioná el archivo Excel con la estructura de empleados y
            supervisores.
          </p>
        </div>
      </div>

      <div className="importar-organigrama__selector">
        <label
          className="importar-organigrama__label"
          htmlFor="archivo-organigrama"
        >
          Archivo Excel
        </label>

        <input
          ref={inputArchivoRef}
          id="archivo-organigrama"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleSeleccionarArchivo}
          disabled={leyendo || importando}
        />

        {archivo && (
          <div className="importar-organigrama__archivo">
            <strong>{archivo.name}</strong>

            {nombreHoja && (
              <span>
                Hoja leída: <b>{nombreHoja}</b>
              </span>
            )}
          </div>
        )}
      </div>

      {mensaje && (
        <div
          className={`importar-organigrama__mensaje ${
            errores.length > 0
              ? "importar-organigrama__mensaje--error"
              : "importar-organigrama__mensaje--correcto"
          }`}
        >
          {mensaje}
        </div>
      )}

      {errores.length > 0 && (
        <div className="importar-organigrama__errores">
          <h3>Errores encontrados</h3>

          <ul>
            {errores.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {empleados.length > 0 && errores.length === 0 && (
        <>
          <div className="importar-organigrama__resumen">
            <div>
              <span>Empleados encontrados</span>
              <strong>{empleados.length}</strong>
            </div>

            <label className="importar-organigrama__opcion">
              <input
                type="checkbox"
                checked={desactivarAusentes}
                onChange={(event) =>
                  setDesactivarAusentes(event.target.checked)
                }
                disabled={importando}
              />
              Desactivar empleados que no estén en el Excel
            </label>
          </div>

          <div className="importar-organigrama__tabla-contenedor">
            <table className="importar-organigrama__tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Supervisor</th>
                  <th>Cargo</th>
                </tr>
              </thead>

              <tbody>
                {empleados.map((empleado) => (
                  <tr key={empleado.idEmpleado}>
                    <td>{empleado.idEmpleado}</td>
                    <td>{empleado.nombre}</td>
                    <td>
                      {empleado.supervisorId === null
                        ? "Sin supervisor"
                        : empleado.supervisorId}
                    </td>
                    <td>{empleado.cargo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(importando || progreso > 0) && (
        <div className="importar-organigrama__progreso">
          <div className="importar-organigrama__progreso-datos">
            <span>
              {importando ? "Procesando importación" : "Importación completada"}
            </span>

            <strong>{progreso}%</strong>
          </div>

          <div className="importar-organigrama__barra">
            <div
              className="importar-organigrama__barra-valor"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      {resultadoImportacion && (
        <div className="importar-organigrama__resultado">
          <h3>Resumen de importación</h3>

          <div className="importar-organigrama__resultado-grid">
            <div>
              <span>Total importados</span>
              <strong>{resultadoImportacion.total}</strong>
            </div>

            <div>
              <span>Nuevos</span>
              <strong>{resultadoImportacion.nuevos}</strong>
            </div>

            <div>
              <span>Actualizados</span>
              <strong>{resultadoImportacion.actualizados}</strong>
            </div>

            <div>
              <span>Desactivados</span>
              <strong>{resultadoImportacion.desactivados}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="importar-organigrama__acciones">
        <button
          type="button"
          className="importar-organigrama__boton importar-organigrama__boton--secundario"
          onClick={handleLimpiar}
          disabled={importando || (!archivo && !empleados.length)}
        >
          Limpiar
        </button>

        <button
          type="button"
          className="importar-organigrama__boton importar-organigrama__boton--principal"
          onClick={handleImportar}
          disabled={!puedeImportar}
        >
          {importando ? "Importando..." : "Importar a Firestore"}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   DIVIDIR IMPORTACIÓN EN LOTES
============================================================ */

function dividirEnLotes(lista, tamano) {
  const lotes = [];

  for (let indice = 0; indice < lista.length; indice += tamano) {
    lotes.push(lista.slice(indice, indice + tamano));
  }

  return lotes;
}
