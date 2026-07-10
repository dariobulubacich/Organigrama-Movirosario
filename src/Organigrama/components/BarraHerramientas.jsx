import { useState } from "react";

import "./BarraHerramientas.css";

export default function BarraHerramientas({
  cantidadEmpleados = 0,
  buscando = false,
  empleadoSeleccionado = null,

  onBuscar,
  onLimpiarBusqueda,

  onAgregar,
  onEditar,
  onEliminar,

  onCentrar,
  onAcercar,
  onAlejar,

  onImportar,
  onImprimir,
  onExportarPDF,
}) {
  const [textoBusqueda, setTextoBusqueda] = useState("");

  /* ============================================================
     BUSCAR EMPLEADO
  ============================================================ */

  const handleCambiarBusqueda = (event) => {
    const valor = event.target.value;

    setTextoBusqueda(valor);

    if (typeof onBuscar === "function") {
      onBuscar(valor);
    }
  };

  const handleEnviarBusqueda = (event) => {
    event.preventDefault();

    if (typeof onBuscar === "function") {
      onBuscar(textoBusqueda.trim());
    }
  };

  const handleLimpiarBusqueda = () => {
    setTextoBusqueda("");

    if (typeof onLimpiarBusqueda === "function") {
      onLimpiarBusqueda();
      return;
    }

    if (typeof onBuscar === "function") {
      onBuscar("");
    }
  };

  /* ============================================================
     ACCIONES DEL EMPLEADO
  ============================================================ */

  const handleEditar = () => {
    if (!empleadoSeleccionado) return;

    if (typeof onEditar === "function") {
      onEditar(empleadoSeleccionado);
    }
  };

  const handleEliminar = () => {
    if (!empleadoSeleccionado) return;

    if (typeof onEliminar === "function") {
      onEliminar(empleadoSeleccionado);
    }
  };

  const nombreSeleccionado = empleadoSeleccionado?.nombre || "";

  return (
    <section className="barra-organigrama">
      <div className="barra-organigrama__superior">
        <div className="barra-organigrama__titulo">
          <h2>Vista del organigrama</h2>

          <span className="barra-organigrama__contador">
            {cantidadEmpleados}{" "}
            {cantidadEmpleados === 1 ? "empleado" : "empleados"}
          </span>
        </div>

        {empleadoSeleccionado && (
          <div className="barra-organigrama__seleccion">
            <span>Seleccionado:</span>

            <strong>{nombreSeleccionado}</strong>

            <small>ID: {empleadoSeleccionado.idEmpleado}</small>
          </div>
        )}
      </div>

      <div className="barra-organigrama__contenido">
        <form
          className="barra-organigrama__busqueda"
          onSubmit={handleEnviarBusqueda}
        >
          <label
            htmlFor="buscar-empleado-organigrama"
            className="barra-organigrama__label"
          >
            Buscar empleado
          </label>

          <div className="barra-organigrama__busqueda-contenido">
            <input
              id="buscar-empleado-organigrama"
              type="search"
              value={textoBusqueda}
              onChange={handleCambiarBusqueda}
              placeholder="Nombre, cargo o ID..."
              autoComplete="off"
              disabled={buscando}
            />

            {textoBusqueda && (
              <button
                type="button"
                className="barra-organigrama__limpiar"
                onClick={handleLimpiarBusqueda}
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}

            <button
              type="submit"
              className="barra-organigrama__boton barra-organigrama__boton--buscar"
              disabled={buscando || !textoBusqueda.trim()}
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>

        <div className="barra-organigrama__grupos">
          <div className="barra-organigrama__grupo">
            <span className="barra-organigrama__grupo-titulo">Empleados</span>

            <div className="barra-organigrama__acciones">
              <button
                type="button"
                className="barra-organigrama__boton barra-organigrama__boton--principal"
                onClick={onAgregar}
                disabled={typeof onAgregar !== "function"}
              >
                + Agregar
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={handleEditar}
                disabled={
                  !empleadoSeleccionado || typeof onEditar !== "function"
                }
              >
                Editar
              </button>

              <button
                type="button"
                className="barra-organigrama__boton barra-organigrama__boton--peligro"
                onClick={handleEliminar}
                disabled={
                  !empleadoSeleccionado || typeof onEliminar !== "function"
                }
              >
                Eliminar
              </button>
            </div>
          </div>

          <div className="barra-organigrama__grupo">
            <span className="barra-organigrama__grupo-titulo">Vista</span>

            <div className="barra-organigrama__acciones">
              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onAlejar}
                disabled={typeof onAlejar !== "function"}
                title="Alejar organigrama"
              >
                − Zoom
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onAcercar}
                disabled={typeof onAcercar !== "function"}
                title="Acercar organigrama"
              >
                + Zoom
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onCentrar}
                disabled={typeof onCentrar !== "function"}
              >
                Centrar
              </button>
            </div>
          </div>

          <div className="barra-organigrama__grupo">
            <span className="barra-organigrama__grupo-titulo">Archivos</span>

            <div className="barra-organigrama__acciones">
              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onImportar}
                disabled={typeof onImportar !== "function"}
              >
                Importar
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onImprimir}
                disabled={typeof onImprimir !== "function"}
              >
                Imprimir
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onExportarPDF}
                disabled={typeof onExportarPDF !== "function"}
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
