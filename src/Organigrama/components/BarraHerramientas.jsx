import { useMemo, useState } from "react";

import "./BarraHerramientas.css";

export default function BarraHerramientas({
  cantidadEmpleados = 0,
  empleados = [],
  buscando = false,
  empleadoSeleccionado = null,

  onBuscar,
  onSeleccionarResultado,
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
  const [mostrarResultados, setMostrarResultados] = useState(false);

  /* ============================================================
     EMPLEADOS VÁLIDOS
  ============================================================ */

  const empleadosValidos = useMemo(() => {
    if (!Array.isArray(empleados)) {
      return [];
    }

    return empleados.filter((empleado) => {
      if (!empleado || typeof empleado !== "object") {
        return false;
      }

      if (empleado.activo === false) {
        return false;
      }

      return empleado.idEmpleado !== null && empleado.idEmpleado !== undefined;
    });
  }, [empleados]);

  /* ============================================================
     RESULTADOS DE BÚSQUEDA
  ============================================================ */

  const resultados = useMemo(() => {
    const texto = normalizarTexto(textoBusqueda);

    if (texto.length < 3) {
      return [];
    }

    return empleadosValidos
      .filter((empleado) => {
        const valores = [
          empleado.idEmpleado,
          empleado.nombre,
          empleado.cargo,
          empleado.puesto,
          empleado.area,
          empleado.email,
          empleado.interno,
        ];

        return valores.some((valor) => normalizarTexto(valor).includes(texto));
      })
      .slice(0, 12);
  }, [textoBusqueda, empleadosValidos]);

  /* ============================================================
     CAMBIAR BÚSQUEDA
  ============================================================ */

  const handleCambiarBusqueda = (event) => {
    const valor = event.target.value;

    setTextoBusqueda(valor);

    setMostrarResultados(normalizarTexto(valor).length >= 3);
  };

  /* ============================================================
     ENVIAR BÚSQUEDA
  ============================================================ */

  const handleEnviarBusqueda = (event) => {
    event.preventDefault();

    const texto = textoBusqueda.trim();

    if (texto.length < 3) {
      return;
    }

    if (resultados.length > 0) {
      handleSeleccionarEmpleado(resultados[0]);
      return;
    }

    if (typeof onBuscar === "function") {
      onBuscar(texto);
    }

    setMostrarResultados(false);
  };

  /* ============================================================
     SELECCIONAR RESULTADO
  ============================================================ */

  const handleSeleccionarEmpleado = (empleado) => {
    if (!empleado) {
      return;
    }

    setTextoBusqueda(
      limpiarTexto(empleado.nombre) || String(empleado.idEmpleado),
    );

    setMostrarResultados(false);

    if (typeof onSeleccionarResultado === "function") {
      onSeleccionarResultado(empleado);
      return;
    }

    if (typeof onBuscar === "function") {
      onBuscar(String(empleado.idEmpleado));
    }
  };

  /* ============================================================
     LIMPIAR BÚSQUEDA
  ============================================================ */

  const handleLimpiarBusqueda = () => {
    setTextoBusqueda("");
    setMostrarResultados(false);

    if (typeof onLimpiarBusqueda === "function") {
      onLimpiarBusqueda();
      return;
    }

    if (typeof onBuscar === "function") {
      onBuscar("");
    }
  };

  /* ============================================================
     EDITAR
  ============================================================ */

  const handleEditar = () => {
    if (!empleadoSeleccionado) {
      return;
    }

    if (typeof onEditar === "function") {
      onEditar(empleadoSeleccionado);
    }
  };

  /* ============================================================
     ELIMINAR
  ============================================================ */

  const handleEliminar = () => {
    if (!empleadoSeleccionado) {
      return;
    }

    if (typeof onEliminar === "function") {
      onEliminar(empleadoSeleccionado);
    }
  };

  const nombreSeleccionado = limpiarTexto(empleadoSeleccionado?.nombre) || "";

  const idSeleccionado =
    empleadoSeleccionado?.idEmpleado ?? empleadoSeleccionado?.id ?? "";

  return (
    <section className="barra-organigrama">
      <div className="barra-organigrama__superior">
        <div className="barra-organigrama__titulo">
          <h2>Vista del organigrama</h2>

          <span className="barra-organigrama__contador">
            {Number(cantidadEmpleados) || 0}{" "}
            {Number(cantidadEmpleados) === 1 ? "empleado" : "empleados"}
          </span>
        </div>

        {empleadoSeleccionado && (
          <div className="barra-organigrama__seleccion">
            <span>Seleccionado:</span>

            <strong>{nombreSeleccionado || "Sin nombre"}</strong>

            {idSeleccionado !== "" && (
              <small>ID: {String(idSeleccionado)}</small>
            )}
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
            <div className="barra-organigrama__buscador-wrapper">
              <input
                id="buscar-empleado-organigrama"
                type="search"
                value={textoBusqueda}
                onChange={handleCambiarBusqueda}
                onFocus={() => {
                  if (normalizarTexto(textoBusqueda).length >= 3) {
                    setMostrarResultados(true);
                  }
                }}
                placeholder="Escribí al menos 3 letras..."
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

              {mostrarResultados &&
                normalizarTexto(textoBusqueda).length >= 3 && (
                  <div className="barra-organigrama__resultados">
                    {resultados.length > 0 ? (
                      resultados.map((empleado, index) => {
                        const idEmpleado =
                          empleado.idEmpleado ??
                          empleado.id ??
                          `resultado-${index}`;

                        const nombre =
                          limpiarTexto(empleado.nombre) || "Sin nombre";

                        const cargo =
                          limpiarTexto(empleado.cargo || empleado.puesto) ||
                          "Sin cargo";

                        return (
                          <button
                            key={String(idEmpleado)}
                            type="button"
                            className="barra-organigrama__resultado"
                            onClick={() => handleSeleccionarEmpleado(empleado)}
                          >
                            <strong>{nombre}</strong>

                            <span>{cargo}</span>

                            <small>
                              ID:{" "}
                              {String(empleado.idEmpleado ?? empleado.id ?? "")}
                            </small>
                          </button>
                        );
                      })
                    ) : (
                      <div className="barra-organigrama__sin-resultados">
                        No se encontraron coincidencias.
                      </div>
                    )}
                  </div>
                )}
            </div>

            <button
              type="submit"
              className="barra-organigrama__boton barra-organigrama__boton--buscar"
              disabled={buscando || textoBusqueda.trim().length < 3}
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
              >
                − Zoom
              </button>

              <button
                type="button"
                className="barra-organigrama__boton"
                onClick={onAcercar}
                disabled={typeof onAcercar !== "function"}
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

/* ============================================================
   FUNCIONES AUXILIARES
============================================================ */

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
