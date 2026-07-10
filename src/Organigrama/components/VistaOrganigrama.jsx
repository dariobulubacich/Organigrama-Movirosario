import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import NodoEmpleado from "./Nodoempleado";
import BarraHerramientas from "./BarraHerramientas";

import construirOrganigramaFlow from "../utils/construirOrganigramaFlow";

import { obtenerEmpleados } from "../services/organigramaService";

import "./VistaOrganigrama.css";

const nodeTypes = {
  empleado: NodoEmpleado,
};

const ZOOM_MINIMO = 0.1;
const ZOOM_MAXIMO = 2;

function OrganigramaInterno({
  recargaToken = 0,
  onImportar,
  onAgregar,
  onEditar,
  onEliminar,
  onImprimir,
  onExportarPDF,
}) {
  const { fitView, setCenter, zoomIn, zoomOut, getZoom } = useReactFlow();

  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);

  const [empleados, setEmpleados] = useState([]);
  const [erroresCarga, setErroresCarga] = useState([]);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const [idEmpleadoSeleccionado, setIdEmpleadoSeleccionado] = useState(null);

  const [mensajeBusqueda, setMensajeBusqueda] = useState("");

  /* ============================================================
     CARGAR EMPLEADOS
  ============================================================ */

  const cargarEmpleados = useCallback(async () => {
    setCargando(true);
    setErroresCarga([]);
    setMensajeBusqueda("");

    try {
      const datos = await obtenerEmpleados();

      setEmpleados(Array.isArray(datos) ? datos : []);

      setEmpleadoSeleccionado(null);
      setIdEmpleadoSeleccionado(null);
    } catch (error) {
      console.error("Error al cargar los empleados:", error);

      setEmpleados([]);

      setErroresCarga([
        error?.message ||
          "No fue posible obtener los empleados desde Firestore.",
      ]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarEmpleados();
  }, [cargarEmpleados, recargaToken]);

  /* ============================================================
     CONSTRUIR EL ORGANIGRAMA
  ============================================================ */

  const resultado = useMemo(() => {
    return construirOrganigramaFlow(empleados);
  }, [empleados]);

  const nodes = useMemo(() => {
    return resultado.nodes.map((node) => ({
      ...node,

      selected:
        idEmpleadoSeleccionado !== null &&
        node.id === String(idEmpleadoSeleccionado),
    }));
  }, [resultado.nodes, idEmpleadoSeleccionado]);

  const edges = resultado.edges;

  /* ============================================================
     CENTRAR AL CARGAR
  ============================================================ */

  useEffect(() => {
    if (cargando || resultado.nodes.length === 0) {
      return;
    }

    const temporizador = window.setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: 600,
        minZoom: ZOOM_MINIMO,
        maxZoom: 1,
      });
    }, 100);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [cargando, resultado.nodes, fitView]);

  /* ============================================================
     SELECCIONAR EMPLEADO
  ============================================================ */

  const handleSeleccionarNodo = useCallback((_event, node) => {
    const empleado = node?.data?.empleado;

    if (!empleado) return;

    setEmpleadoSeleccionado(empleado);
    setIdEmpleadoSeleccionado(empleado.idEmpleado);

    setMensajeBusqueda("");
  }, []);

  const handleDeseleccionar = useCallback(() => {
    setEmpleadoSeleccionado(null);
    setIdEmpleadoSeleccionado(null);
  }, []);

  /* ============================================================
     BUSCAR EMPLEADO
  ============================================================ */

  const handleBuscar = useCallback(
    async (texto) => {
      const busqueda = normalizarTexto(texto);

      setMensajeBusqueda("");

      if (!busqueda) {
        setEmpleadoSeleccionado(null);
        setIdEmpleadoSeleccionado(null);
        return;
      }

      setBuscando(true);

      try {
        const coincidencia = resultado.nodes.find((node) => {
          const empleado = node?.data?.empleado || {};

          const valores = [
            empleado.idEmpleado,
            empleado.nombre,
            empleado.cargo,
            empleado.area,
            empleado.email,
            empleado.interno,
          ];

          return valores.some((valor) =>
            normalizarTexto(valor).includes(busqueda),
          );
        });

        if (!coincidencia) {
          setEmpleadoSeleccionado(null);
          setIdEmpleadoSeleccionado(null);

          setMensajeBusqueda(`No se encontró ningún empleado para "${texto}".`);

          return;
        }

        const empleado = coincidencia.data.empleado;

        setEmpleadoSeleccionado(empleado);
        setIdEmpleadoSeleccionado(empleado.idEmpleado);

        centrarEnNodo(coincidencia);
      } finally {
        setBuscando(false);
      }
    },
    [resultado.nodes],
  );

  const handleLimpiarBusqueda = useCallback(() => {
    setMensajeBusqueda("");
    setEmpleadoSeleccionado(null);
    setIdEmpleadoSeleccionado(null);

    fitView({
      padding: 0.2,
      duration: 500,
      minZoom: ZOOM_MINIMO,
      maxZoom: 1,
    });
  }, [fitView]);

  /* ============================================================
     CENTRAR EN UN EMPLEADO
  ============================================================ */

  const centrarEnNodo = useCallback(
    (node) => {
      if (!node) return;

      const ancho = node.measured?.width || node.width || 260;

      const alto = node.measured?.height || node.height || 145;

      const centroX = node.position.x + ancho / 2;

      const centroY = node.position.y + alto / 2;

      setCenter(centroX, centroY, {
        zoom: Math.max(getZoom(), 1),
        duration: 600,
      });
    },
    [setCenter, getZoom],
  );

  /* ============================================================
     CONTROLES DE VISTA
  ============================================================ */

  const handleCentrar = useCallback(() => {
    if (empleadoSeleccionado) {
      const node = resultado.nodes.find(
        (item) => item.id === String(empleadoSeleccionado.idEmpleado),
      );

      if (node) {
        centrarEnNodo(node);
        return;
      }
    }

    fitView({
      padding: 0.2,
      duration: 500,
      minZoom: ZOOM_MINIMO,
      maxZoom: 1,
    });
  }, [empleadoSeleccionado, resultado.nodes, centrarEnNodo, fitView]);

  const handleAcercar = useCallback(() => {
    zoomIn({
      duration: 250,
    });
  }, [zoomIn]);

  const handleAlejar = useCallback(() => {
    zoomOut({
      duration: 250,
    });
  }, [zoomOut]);

  /* ============================================================
     EDITAR Y ELIMINAR
  ============================================================ */

  const handleEditar = useCallback(
    (empleado) => {
      if (typeof onEditar === "function") {
        onEditar(empleado);
      }
    },
    [onEditar],
  );

  const handleEliminar = useCallback(
    (empleado) => {
      if (typeof onEliminar === "function") {
        onEliminar(empleado);
      }
    },
    [onEliminar],
  );

  /* ============================================================
     ESTADOS DE CARGA Y VACÍO
  ============================================================ */

  if (cargando) {
    return (
      <div className="vista-organigrama-mensaje">Cargando organigrama...</div>
    );
  }

  if (resultado.nodes.length === 0 && erroresCarga.length === 0) {
    return (
      <div className="vista-organigrama-contenedor">
        <BarraHerramientas
          cantidadEmpleados={0}
          onImportar={onImportar}
          onAgregar={onAgregar}
        />

        <div className="vista-organigrama-mensaje">
          No existen empleados activos para mostrar. Primero importá el archivo
          Excel.
        </div>
      </div>
    );
  }

  const todosLosErrores = [...erroresCarga, ...resultado.errores];

  return (
    <div className="vista-organigrama-contenedor">
      <BarraHerramientas
        cantidadEmpleados={resultado.nodes.length}
        buscando={buscando}
        empleadoSeleccionado={empleadoSeleccionado}
        onBuscar={handleBuscar}
        onLimpiarBusqueda={handleLimpiarBusqueda}
        onAgregar={onAgregar}
        onEditar={typeof onEditar === "function" ? handleEditar : undefined}
        onEliminar={
          typeof onEliminar === "function" ? handleEliminar : undefined
        }
        onCentrar={handleCentrar}
        onAcercar={handleAcercar}
        onAlejar={handleAlejar}
        onImportar={onImportar}
        onImprimir={onImprimir}
        onExportarPDF={onExportarPDF}
      />

      {mensajeBusqueda && (
        <div className="vista-organigrama-busqueda-mensaje">
          {mensajeBusqueda}
        </div>
      )}

      <div className="vista-organigrama">
        {todosLosErrores.length > 0 && (
          <div className="vista-organigrama-errores">
            <h3>Se encontraron problemas</h3>

            <ul>
              {todosLosErrores.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleSeleccionarNodo}
          onPaneClick={handleDeseleccionar}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: ZOOM_MINIMO,
            maxZoom: 1,
          }}
          minZoom={ZOOM_MINIMO}
          maxZoom={ZOOM_MAXIMO}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          zoomOnScroll
          panOnDrag
          zoomOnDoubleClick={false}
          preventScrolling
          attributionPosition="bottom-left"
        >
          <MiniMap pannable zoomable />

          <Controls showInteractive={false} />

          <Background gap={18} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL CON PROVIDER
============================================================ */

export default function VistaOrganigrama(props) {
  return (
    <ReactFlowProvider>
      <OrganigramaInterno {...props} />
    </ReactFlowProvider>
  );
}

/* ============================================================
   NORMALIZAR TEXTO PARA BÚSQUEDA
============================================================ */

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
