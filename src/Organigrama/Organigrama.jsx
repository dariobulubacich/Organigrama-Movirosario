import { useCallback, useState } from "react";

import ImportarExcel from "../organigrama/components/ImportarExcel";
import VistaOrganigrama from "../components/VistaOrganigrama";
import FormEmpleado from "../organigrama/components/FormEmpleado";

import {
  obtenerEmpleados,
  obtenerEmpleado,
  guardarEmpleado,
  actualizarEmpleado,
  desactivarEmpleado,
} from "../organigrama/services/organigramaService";

import "./organigrama.css";

export default function Organigrama() {
  const [mostrarImportador, setMostrarImportador] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [empleadoEditar, setEmpleadoEditar] = useState(null);

  const [empleadosFormulario, setEmpleadosFormulario] = useState([]);

  const [guardandoEmpleado, setGuardandoEmpleado] = useState(false);

  const [recargaToken, setRecargaToken] = useState(0);

  const [ultimaImportacion, setUltimaImportacion] = useState(null);

  const [mensajeOperacion, setMensajeOperacion] = useState(null);

  /* ============================================================
     IMPORTADOR
  ============================================================ */

  const handleMostrarImportador = useCallback(() => {
    setMostrarFormulario(false);
    setEmpleadoEditar(null);
    setMostrarImportador(true);
    setMensajeOperacion(null);

    desplazarAElemento("seccion-importar-organigrama");
  }, []);

  const handleOcultarImportador = useCallback(() => {
    setMostrarImportador(false);
  }, []);

  const handleImportacionFinalizada = useCallback(async (resultado) => {
    setUltimaImportacion({
      ...resultado,
      fecha: new Date(),
    });

    setMostrarImportador(false);
    setRecargaToken((valorActual) => valorActual + 1);

    setMensajeOperacion({
      tipo: "correcto",
      texto:
        "El archivo se importó correctamente y el organigrama fue actualizado.",
    });

    desplazarAElemento("seccion-vista-organigrama", 150);
  }, []);

  /* ============================================================
     CARGAR EMPLEADOS PARA EL FORMULARIO
  ============================================================ */

  const cargarEmpleadosFormulario = useCallback(async () => {
    const empleados = await obtenerEmpleados();

    setEmpleadosFormulario(
      Array.isArray(empleados)
        ? empleados.filter((empleado) => empleado.activo !== false)
        : [],
    );
  }, []);

  /* ============================================================
     AGREGAR EMPLEADO
  ============================================================ */

  const handleAgregarEmpleado = useCallback(async () => {
    try {
      setMensajeOperacion(null);
      setMostrarImportador(false);
      setEmpleadoEditar(null);

      await cargarEmpleadosFormulario();

      setMostrarFormulario(true);

      desplazarAElemento("seccion-formulario-empleado");
    } catch (error) {
      console.error("Error al preparar el formulario:", error);

      setMensajeOperacion({
        tipo: "error",
        texto:
          error?.message ||
          "No se pudo abrir el formulario para agregar empleados.",
      });
    }
  }, [cargarEmpleadosFormulario]);

  /* ============================================================
     EDITAR EMPLEADO
  ============================================================ */

  const handleEditarEmpleado = useCallback(
    async (empleadoSeleccionado) => {
      if (!empleadoSeleccionado) return;

      try {
        setMensajeOperacion(null);
        setMostrarImportador(false);

        const [empleadoActualizado] = await Promise.all([
          obtenerEmpleado(empleadoSeleccionado.idEmpleado),
          cargarEmpleadosFormulario(),
        ]);

        if (!empleadoActualizado) {
          throw new Error("El empleado seleccionado ya no existe.");
        }

        setEmpleadoEditar(empleadoActualizado);
        setMostrarFormulario(true);

        desplazarAElemento("seccion-formulario-empleado");
      } catch (error) {
        console.error("Error al cargar el empleado:", error);

        setMensajeOperacion({
          tipo: "error",
          texto:
            error?.message || "No se pudo cargar el empleado seleccionado.",
        });
      }
    },
    [cargarEmpleadosFormulario],
  );

  /* ============================================================
     GUARDAR EMPLEADO
  ============================================================ */

  const handleGuardarEmpleado = useCallback(
    async (empleado) => {
      if (!empleado) return;

      setGuardandoEmpleado(true);
      setMensajeOperacion(null);

      try {
        if (empleadoEditar) {
          await actualizarEmpleado(empleadoEditar.idEmpleado, {
            nombre: empleado.nombre,
            cargo: empleado.cargo,
            supervisorId: empleado.supervisorId,
            area: empleado.area,
            nivel: empleado.nivel,
            telefono: empleado.telefono,
            interno: empleado.interno,
            email: empleado.email,
            foto: empleado.foto,
            orden: empleado.orden,
            activo: empleado.activo,
          });

          setMensajeOperacion({
            tipo: "correcto",
            texto: `${empleado.nombre} fue actualizado correctamente.`,
          });
        } else {
          await guardarEmpleado({
            ...empleado,
            fechaAlta: new Date(),
          });

          setMensajeOperacion({
            tipo: "correcto",
            texto: `${empleado.nombre} fue agregado correctamente.`,
          });
        }

        setMostrarFormulario(false);
        setEmpleadoEditar(null);
        setEmpleadosFormulario([]);

        setRecargaToken((valorActual) => valorActual + 1);

        desplazarAElemento("seccion-vista-organigrama", 150);
      } catch (error) {
        console.error("Error al guardar el empleado:", error);

        setMensajeOperacion({
          tipo: "error",
          texto: error?.message || "No se pudo guardar el empleado.",
        });

        throw error;
      } finally {
        setGuardandoEmpleado(false);
      }
    },
    [empleadoEditar],
  );

  /* ============================================================
     CANCELAR FORMULARIO
  ============================================================ */

  const handleCancelarFormulario = useCallback(() => {
    if (guardandoEmpleado) return;

    setMostrarFormulario(false);
    setEmpleadoEditar(null);
    setEmpleadosFormulario([]);

    desplazarAElemento("seccion-vista-organigrama");
  }, [guardandoEmpleado]);

  /* ============================================================
     ELIMINAR / DESACTIVAR EMPLEADO
  ============================================================ */

  const handleEliminarEmpleado = useCallback(async (empleado) => {
    if (!empleado) return;

    const confirmar = window.confirm(
      `¿Querés quitar a "${empleado.nombre}" del organigrama?\n\nEl empleado no se eliminará definitivamente. Quedará marcado como inactivo.`,
    );

    if (!confirmar) return;

    try {
      setMensajeOperacion(null);

      const empleados = await obtenerEmpleados();

      const subordinados = empleados.filter(
        (item) =>
          item.activo !== false &&
          String(item.supervisorId) === String(empleado.idEmpleado),
      );

      if (subordinados.length > 0) {
        const nombres = subordinados
          .slice(0, 5)
          .map((item) => item.nombre)
          .join(", ");

        const adicionales =
          subordinados.length > 5 ? ` y ${subordinados.length - 5} más` : "";

        setMensajeOperacion({
          tipo: "error",
          texto:
            `${empleado.nombre} no puede quitarse porque tiene ` +
            `${subordinados.length} empleado(s) a cargo: ` +
            `${nombres}${adicionales}. Primero cambiá el supervisor de esos empleados.`,
        });

        return;
      }

      await desactivarEmpleado(empleado.idEmpleado);

      setMensajeOperacion({
        tipo: "correcto",
        texto: `${empleado.nombre} fue quitado del organigrama.`,
      });

      setRecargaToken((valorActual) => valorActual + 1);
    } catch (error) {
      console.error("Error al desactivar el empleado:", error);

      setMensajeOperacion({
        tipo: "error",
        texto:
          error?.message || "No se pudo quitar el empleado del organigrama.",
      });
    }
  }, []);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <main className="organigrama-pagina">
      <header className="organigrama-pagina__encabezado">
        <div>
          <h1>Organigrama de la empresa</h1>

          <p>
            Administración, importación y visualización de la estructura
            jerárquica de empleados.
          </p>
        </div>

        <button
          type="button"
          className="organigrama-pagina__boton-importar"
          onClick={
            mostrarImportador
              ? handleOcultarImportador
              : handleMostrarImportador
          }
        >
          {mostrarImportador ? "Cerrar importador" : "Importar Excel"}
        </button>
      </header>

      {mensajeOperacion && (
        <section
          className={`organigrama-pagina__mensaje organigrama-pagina__mensaje--${mensajeOperacion.tipo}`}
        >
          <span>{mensajeOperacion.texto}</span>

          <button
            type="button"
            onClick={() => setMensajeOperacion(null)}
            aria-label="Cerrar mensaje"
            title="Cerrar mensaje"
          >
            ×
          </button>
        </section>
      )}

      {ultimaImportacion && (
        <section className="organigrama-pagina__ultima-importacion">
          <div className="organigrama-pagina__ultima-icono">✓</div>

          <div className="organigrama-pagina__ultima-contenido">
            <h2>Última importación realizada</h2>

            <p>
              Se procesaron <strong>{ultimaImportacion.total}</strong>{" "}
              empleados.
            </p>

            <div className="organigrama-pagina__ultima-datos">
              <span>
                Nuevos: <strong>{ultimaImportacion.nuevos}</strong>
              </span>

              <span>
                Actualizados: <strong>{ultimaImportacion.actualizados}</strong>
              </span>

              <span>
                Desactivados: <strong>{ultimaImportacion.desactivados}</strong>
              </span>

              <span>
                Fecha:{" "}
                <strong>{formatearFechaHora(ultimaImportacion.fecha)}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="organigrama-pagina__cerrar-resumen"
            onClick={() => setUltimaImportacion(null)}
            aria-label="Cerrar resumen"
            title="Cerrar resumen"
          >
            ×
          </button>
        </section>
      )}

      {mostrarImportador && (
        <section
          id="seccion-importar-organigrama"
          className="organigrama-pagina__seccion"
        >
          <ImportarExcel
            onImportacionFinalizada={handleImportacionFinalizada}
          />
        </section>
      )}

      {mostrarFormulario && (
        <section
          id="seccion-formulario-empleado"
          className="organigrama-pagina__seccion"
        >
          <FormEmpleado
            empleadoEditar={empleadoEditar}
            empleados={empleadosFormulario}
            guardando={guardandoEmpleado}
            onGuardar={handleGuardarEmpleado}
            onCancelar={handleCancelarFormulario}
          />
        </section>
      )}

      <section
        id="seccion-vista-organigrama"
        className="organigrama-pagina__seccion"
      >
        <VistaOrganigrama
          recargaToken={recargaToken}
          onImportar={handleMostrarImportador}
          onAgregar={handleAgregarEmpleado}
          onEditar={handleEditarEmpleado}
          onEliminar={handleEliminarEmpleado}
        />
      </section>
    </main>
  );
}

/* ============================================================
   AUXILIARES
============================================================ */

function formatearFechaHora(fecha) {
  if (!(fecha instanceof Date)) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function desplazarAElemento(idElemento, demora = 50) {
  window.setTimeout(() => {
    const elemento = document.getElementById(idElemento);

    elemento?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, demora);
}
