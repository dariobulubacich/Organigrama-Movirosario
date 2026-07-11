import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Background,
  Controls,
  getNodesBounds,
  getViewportForBounds,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import NodoEmpleado from "./Nodoempleado";
import BarraHerramientas from "./BarraHerramientas";

import construirOrganigramaFlow from "../utils/construirOrganigramaFlow";

import validarMovimientoJerarquia from "../utils/validarMovimientoJerarquia";

import filtrarRamasVisibles, {
  obtenerIdsConHijos,
} from "../utils/filtrarRamasVisibles";

import {
  actualizarEmpleado,
  obtenerEmpleados,
} from "../services/organigramaService";

import {
  exportarOrganigramaPDF,
  imprimirOrganigrama,
} from "../services/excelOrganigrama/exportarOrganigrama";

import "./VistaOrganigrama.css";

const nodeTypes = {
  empleado: NodoEmpleado,
};

const ZOOM_MINIMO = 0.08;
const ZOOM_MAXIMO = 2;

function OrganigramaInterno({
  recargaToken = 0,
  onImportar,
  onAgregar,
  onEditar,
  onEliminar,
}) {
  const contenedorFlowRef = useRef(null);
  const arrastrandoRef = useRef(false);

  const { fitView, setCenter, zoomIn, zoomOut, getZoom, getIntersectingNodes } =
    useReactFlow();

  /* ============================================================
     CENTRAR EN NODO
  ============================================================ */

  const centrarEnNodo = useCallback(
    (node) => {
      if (!node) {
        return;
      }

      const ancho = node.measured?.width || node.width || 280;
      const alto = node.measured?.height || node.height || 180;

      const centroX = node.position.x + ancho / 2;
      const centroY = node.position.y + alto / 2;

      setCenter(centroX, centroY, {
        zoom: Math.max(getZoom(), 0.9),
        duration: 500,
      });
    },
    [setCenter, getZoom],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const [edges, setEdges] = useState([]);

  const [empleados, setEmpleados] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [buscando, setBuscando] = useState(false);

  const [moviendo, setMoviendo] = useState(false);

  const [exportando, setExportando] = useState(false);

  const [imprimiendo, setImprimiendo] = useState(false);

  const [erroresCarga, setErroresCarga] = useState([]);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const [idEmpleadoSeleccionado, setIdEmpleadoSeleccionado] = useState(null);

  const [idSupervisorDestino, setIdSupervisorDestino] = useState(null);

  const [idsExpandidos, setIdsExpandidos] = useState(() => new Set());

  const [mostrarTodoParaSalida, setMostrarTodoParaSalida] = useState(false);

  const [mensajeBusqueda, setMensajeBusqueda] = useState("");

  const [mensajeSalida, setMensajeSalida] = useState(null);

  /* ============================================================
     CARGAR EMPLEADOS
  ============================================================ */

  const cargarEmpleados = useCallback(async () => {
    setCargando(true);
    setErroresCarga([]);
    setMensajeBusqueda("");
    setMensajeSalida(null);
    setIdSupervisorDestino(null);

    try {
      const datos = await obtenerEmpleados();

      const lista = Array.isArray(datos) ? datos : [];

      setEmpleados(lista);

      setEmpleadoSeleccionado(null);
      setIdEmpleadoSeleccionado(null);

      /*
        |--------------------------------------------------------------------------
        | Al recargar, el organigrama vuelve a quedar contraído.
        |--------------------------------------------------------------------------
        */

      setIdsExpandidos(new Set());
    } catch (error) {
      console.error("Error al cargar los empleados:", error);

      setEmpleados([]);
      setNodes([]);
      setEdges([]);

      setErroresCarga([
        error?.message ||
          "No fue posible obtener los empleados desde Firestore.",
      ]);
    } finally {
      setCargando(false);
    }
  }, [setNodes]);

  useEffect(() => {
    cargarEmpleados();
  }, [cargarEmpleados, recargaToken]);

  /* ============================================================
     EMPLEADOS ACTIVOS
  ============================================================ */

  const empleadosActivos = useMemo(() => {
    return empleados.filter((empleado) => empleado.activo !== false);
  }, [empleados]);

  /* ============================================================
     IDENTIFICAR EMPLEADOS CON HIJOS
  ============================================================ */

  const idsConHijos = useMemo(() => {
    return obtenerIdsConHijos(empleadosActivos);
  }, [empleadosActivos]);

  /* ============================================================
     FILTRAR RAMAS VISIBLES
  ============================================================ */

  const empleadosVisibles = useMemo(() => {
    if (mostrarTodoParaSalida) {
      return empleadosActivos;
    }

    return filtrarRamasVisibles(empleadosActivos, idsExpandidos);
  }, [empleadosActivos, idsExpandidos, mostrarTodoParaSalida]);

  /* ============================================================
     CONSTRUIR VISTA ACTUAL
  ============================================================ */

  const resultado = useMemo(() => {
    return construirOrganigramaFlow(empleadosVisibles);
  }, [empleadosVisibles]);

  /* ============================================================
     CONSTRUIR ORGANIGRAMA COMPLETO PARA IMPRESIÓN
  ============================================================ */

  const resultadoCompleto = useMemo(() => {
    return construirOrganigramaFlow(empleadosActivos);
  }, [empleadosActivos]);

  /* ============================================================
     ABRIR / CERRAR RAMA
  ============================================================ */

  const handleToggleExpandir = useCallback((idEmpleado) => {
    const clave = String(idEmpleado);

    setIdsExpandidos((anteriores) => {
      const nuevos = new Set(anteriores);

      if (nuevos.has(clave)) {
        nuevos.delete(clave);
      } else {
        nuevos.add(clave);
      }

      return nuevos;
    });
  }, []);

  /* ============================================================
     ACTUALIZAR NODOS DE REACT FLOW
  ============================================================ */

  useEffect(() => {
    const nuevosNodos = resultado.nodes.map((node) => ({
      ...node,

      selected:
        idEmpleadoSeleccionado !== null &&
        node.id === String(idEmpleadoSeleccionado),

      data: {
        ...node.data,

        tieneHijos: idsConHijos.has(String(node.id)),

        expandido: mostrarTodoParaSalida || idsExpandidos.has(String(node.id)),

        onToggleExpandir: handleToggleExpandir,

        esSupervisorDestino:
          idSupervisorDestino !== null &&
          node.id === String(idSupervisorDestino),
      },
    }));

    setNodes(nuevosNodos);
    setEdges(resultado.edges);
  }, [
    resultado,
    idEmpleadoSeleccionado,
    idSupervisorDestino,
    idsConHijos,
    idsExpandidos,
    mostrarTodoParaSalida,
    handleToggleExpandir,
    setNodes,
  ]);

  /* ============================================================
     CENTRAR AL CAMBIAR RAMAS
  ============================================================ */

  useEffect(() => {
    if (cargando || resultado.nodes.length === 0 || mostrarTodoParaSalida) {
      return;
    }

    const temporizador = window.setTimeout(() => {
      fitView({
        padding: 0.25,
        duration: 450,
        minZoom: ZOOM_MINIMO,
        maxZoom: 1.1,
      });
    }, 100);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [cargando, resultado.nodes, mostrarTodoParaSalida, fitView]);

  /* ============================================================
     SELECCIONAR Y ABRIR EMPLEADO
  ============================================================ */

  const handleSeleccionarNodo = useCallback(
    (_event, node) => {
      if (arrastrandoRef.current) {
        return;
      }

      const empleado = node?.data?.empleado;

      if (!empleado) {
        return;
      }

      setEmpleadoSeleccionado(empleado);

      setIdEmpleadoSeleccionado(empleado.idEmpleado);

      setMensajeBusqueda("");
      setMensajeSalida(null);

      /*
        |--------------------------------------------------------------------------
        | Al tocar una tarjeta que tiene subordinados,
        | abre o cierra su rama.
        |--------------------------------------------------------------------------
        */

      if (idsConHijos.has(String(node.id))) {
        handleToggleExpandir(empleado.idEmpleado);
      }
    },
    [idsConHijos, handleToggleExpandir],
  );

  const handleDeseleccionar = useCallback(() => {
    if (moviendo || arrastrandoRef.current) {
      return;
    }

    setEmpleadoSeleccionado(null);
    setIdEmpleadoSeleccionado(null);
  }, [moviendo]);

  /* ============================================================
     BUSCAR EMPLEADO
  ============================================================ */

  const handleBuscar = useCallback(
    async (texto) => {
      const busqueda = normalizarTexto(texto);

      setMensajeBusqueda("");
      setMensajeSalida(null);

      if (!busqueda) {
        setEmpleadoSeleccionado(null);
        setIdEmpleadoSeleccionado(null);

        return;
      }

      setBuscando(true);

      try {
        /*
        |--------------------------------------------------------------------------
        | La búsqueda se realiza sobre todos los empleados,
        | aunque su rama esté cerrada.
        |--------------------------------------------------------------------------
        */

        const coincidencia = empleadosActivos.find((empleado) => {
          const valores = [
            empleado.idEmpleado,
            empleado.nombre,
            empleado.cargo,
            empleado.puesto,
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

        /*
        |--------------------------------------------------------------------------
        | Abrimos automáticamente toda la cadena jerárquica
        | necesaria para poder mostrar al empleado encontrado.
        |--------------------------------------------------------------------------
        */

        const idsNecesarios = obtenerCadenaSupervisores(
          coincidencia,
          empleadosActivos,
        );

        setIdsExpandidos((anteriores) => {
          const nuevos = new Set(anteriores);

          idsNecesarios.forEach((id) => nuevos.add(String(id)));

          return nuevos;
        });

        setEmpleadoSeleccionado(coincidencia);

        setIdEmpleadoSeleccionado(coincidencia.idEmpleado);

        /*
        |--------------------------------------------------------------------------
        | Esperamos a que React dibuje las ramas abiertas.
        |--------------------------------------------------------------------------
        */

        await esperarRenderizadoCompleto();

        const nodoEncontrado = construirOrganigramaFlow(
          filtrarRamasVisibles(
            empleadosActivos,
            new Set([...idsExpandidos, ...idsNecesarios.map(String)]),
          ),
        ).nodes.find((node) => node.id === String(coincidencia.idEmpleado));

        if (nodoEncontrado) {
          centrarEnNodo(nodoEncontrado);
        }
      } finally {
        setBuscando(false);
      }
    },
    [empleadosActivos, idsExpandidos],
  );

  /* ============================================================
     SELECCIONAR RESULTADO DEL DESPLEGABLE
  ============================================================ */

  const handleSeleccionarResultado = useCallback(
    async (empleado) => {
      if (!empleado) {
        return;
      }

      setMensajeBusqueda("");
      setMensajeSalida(null);

      const idsNecesarios = obtenerCadenaSupervisores(
        empleado,
        empleadosActivos,
      );

      const nuevosIdsExpandidos = new Set(idsExpandidos);

      idsNecesarios.forEach((id) => {
        nuevosIdsExpandidos.add(String(id));
      });

      setIdsExpandidos(nuevosIdsExpandidos);
      setEmpleadoSeleccionado(empleado);
      setIdEmpleadoSeleccionado(empleado.idEmpleado);

      await esperarRenderizadoCompleto();

      const visibles = filtrarRamasVisibles(
        empleadosActivos,
        nuevosIdsExpandidos,
      );

      const nodo = construirOrganigramaFlow(visibles).nodes.find(
        (item) => item.id === String(empleado.idEmpleado),
      );

      if (nodo) {
        centrarEnNodo(nodo);
      }
    },
    [empleadosActivos, idsExpandidos, centrarEnNodo],
  );

  const handleLimpiarBusqueda = useCallback(() => {
    setMensajeBusqueda("");
    setEmpleadoSeleccionado(null);
    setIdEmpleadoSeleccionado(null);

    /*
      |--------------------------------------------------------------------------
      | Al limpiar la búsqueda volvemos a contraer todas las ramas.
      |--------------------------------------------------------------------------
      */

    setIdsExpandidos(new Set());
  }, []);

  /* ============================================================
     CONTROLES DE VISTA
  ============================================================ */

  const handleCentrar = useCallback(() => {
    if (empleadoSeleccionado) {
      const nodo = resultado.nodes.find(
        (item) => item.id === String(empleadoSeleccionado.idEmpleado),
      );

      if (nodo) {
        centrarEnNodo(nodo);
        return;
      }
    }

    fitView({
      padding: 0.25,
      duration: 450,
      minZoom: ZOOM_MINIMO,
      maxZoom: 1.1,
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
     ARRASTRAR EMPLEADO
  ============================================================ */

  const handleNodeDragStart = useCallback(
    (_event, node) => {
      if (moviendo) {
        return;
      }

      arrastrandoRef.current = true;

      const empleado = node?.data?.empleado;

      if (!empleado) {
        return;
      }

      setEmpleadoSeleccionado(empleado);

      setIdEmpleadoSeleccionado(empleado.idEmpleado);

      setMensajeSalida({
        tipo: "informacion",

        texto: "Soltá el empleado sobre la tarjeta de su nuevo supervisor.",
      });
    },
    [moviendo],
  );

  const handleNodeDrag = useCallback(
    (_event, node) => {
      if (moviendo) {
        return;
      }

      const intersectados = getIntersectingNodes(node, true).filter(
        (item) => item.id !== node.id,
      );

      const destino = seleccionarMejorDestino(node, intersectados);

      setIdSupervisorDestino(
        destino ? destino.data?.empleado?.idEmpleado : null,
      );
    },
    [getIntersectingNodes, moviendo],
  );

  const restaurarOrganigrama = useCallback(() => {
    const restaurados = resultado.nodes.map((node) => ({
      ...node,

      selected:
        idEmpleadoSeleccionado !== null &&
        node.id === String(idEmpleadoSeleccionado),

      data: {
        ...node.data,

        tieneHijos: idsConHijos.has(String(node.id)),

        expandido: idsExpandidos.has(String(node.id)),

        onToggleExpandir: handleToggleExpandir,
      },
    }));

    setNodes(restaurados);
    setEdges(resultado.edges);

    window.setTimeout(() => {
      fitView({
        padding: 0.25,
        duration: 350,
        minZoom: ZOOM_MINIMO,
        maxZoom: 1.1,
      });
    }, 50);
  }, [
    resultado,
    idEmpleadoSeleccionado,
    idsConHijos,
    idsExpandidos,
    handleToggleExpandir,
    setNodes,
    fitView,
  ]);

  const handleNodeDragStop = useCallback(
    async (_event, node) => {
      window.setTimeout(() => {
        arrastrandoRef.current = false;
      }, 100);

      if (moviendo) {
        return;
      }

      setIdSupervisorDestino(null);

      const empleadoMovido = node?.data?.empleado;

      if (!empleadoMovido) {
        restaurarOrganigrama();
        return;
      }

      const intersectados = getIntersectingNodes(node, true).filter(
        (item) => item.id !== node.id,
      );

      const nodoSupervisor = seleccionarMejorDestino(node, intersectados);

      if (!nodoSupervisor) {
        setMensajeSalida({
          tipo: "error",

          texto:
            "No se detectó un supervisor válido. El empleado volvió a su posición.",
        });

        restaurarOrganigrama();
        return;
      }

      const nuevoSupervisor = nodoSupervisor.data?.empleado;

      if (!nuevoSupervisor) {
        restaurarOrganigrama();
        return;
      }

      const validacion = validarMovimientoJerarquia({
        idEmpleado: empleadoMovido.idEmpleado,

        nuevoSupervisorId: nuevoSupervisor.idEmpleado,

        empleados: empleadosActivos,
      });

      if (!validacion.ok) {
        setMensajeSalida({
          tipo: "error",

          texto: validacion.error || "El movimiento no es válido.",
        });

        restaurarOrganigrama();
        return;
      }

      const confirmar = window.confirm(
        `¿Querés cambiar el supervisor de "${empleadoMovido.nombre}"?\n\nNuevo supervisor: ${nuevoSupervisor.nombre}`,
      );

      if (!confirmar) {
        restaurarOrganigrama();
        return;
      }

      setMoviendo(true);

      setMensajeSalida({
        tipo: "informacion",

        texto: "Guardando el cambio de supervisor...",
      });

      try {
        await actualizarEmpleado(empleadoMovido.idEmpleado, {
          supervisorId: nuevoSupervisor.idEmpleado,
        });

        setMensajeSalida({
          tipo: "correcto",

          texto: `${empleadoMovido.nombre} ahora depende de ${nuevoSupervisor.nombre}.`,
        });

        await cargarEmpleados();
      } catch (error) {
        console.error("Error al cambiar supervisor:", error);

        setMensajeSalida({
          tipo: "error",

          texto: error?.message || "No se pudo cambiar el supervisor.",
        });

        restaurarOrganigrama();
      } finally {
        setMoviendo(false);
      }
    },
    [
      moviendo,
      getIntersectingNodes,
      empleadosActivos,
      cargarEmpleados,
      restaurarOrganigrama,
    ],
  );

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
     PREPARAR SALIDA COMPLETA
  ============================================================ */

  const prepararSalidaCompleta = useCallback(async () => {
    if (resultadoCompleto.nodes.length === 0) {
      throw new Error("No hay empleados para imprimir o exportar.");
    }

    /*
      |--------------------------------------------------------------------------
      | Mostrar temporalmente todos los empleados.
      |--------------------------------------------------------------------------
      */

    setMostrarTodoParaSalida(true);

    await esperarRenderizadoCompleto();

    const contenedor = contenedorFlowRef.current;

    if (!contenedor) {
      throw new Error("No se encontró el contenedor del organigrama.");
    }

    const elementoViewport = contenedor.querySelector(".react-flow__viewport");

    if (!elementoViewport) {
      throw new Error("No se encontró el contenido visual del organigrama.");
    }

    const limites = getNodesBounds(resultadoCompleto.nodes);

    if (!limites || limites.width <= 0 || limites.height <= 0) {
      throw new Error(
        "No se pudieron calcular las dimensiones del organigrama.",
      );
    }

    const margen = 120;

    const anchoCaptura = Math.max(Math.ceil(limites.width + margen * 2), 1200);

    const altoCaptura = Math.max(Math.ceil(limites.height + margen * 2), 800);

    const viewport = getViewportForBounds(
      limites,
      anchoCaptura,
      altoCaptura,
      ZOOM_MINIMO,
      1,
      0.05,
    );

    return {
      elemento: elementoViewport,

      limites: {
        x: limites.x,
        y: limites.y,
        width: anchoCaptura,
        height: altoCaptura,
      },

      viewport,
    };
  }, [resultadoCompleto.nodes]);

  /* ============================================================
     IMPRIMIR TODO
  ============================================================ */

  const handleImprimir = useCallback(async () => {
    if (imprimiendo || exportando || moviendo) {
      return;
    }

    setImprimiendo(true);
    setMensajeSalida(null);

    try {
      const datos = await prepararSalidaCompleta();

      await imprimirOrganigrama({
        ...datos,

        titulo: "Organigrama de la empresa",
      });

      setMensajeSalida({
        tipo: "correcto",

        texto: "El organigrama completo fue preparado para imprimir.",
      });
    } catch (error) {
      console.error("Error al imprimir:", error);

      setMensajeSalida({
        tipo: "error",

        texto: error?.message || "No se pudo imprimir el organigrama.",
      });
    } finally {
      setMostrarTodoParaSalida(false);

      setImprimiendo(false);
    }
  }, [imprimiendo, exportando, moviendo, prepararSalidaCompleta]);

  /* ============================================================
     EXPORTAR TODO A PDF
  ============================================================ */

  const handleExportarPDF = useCallback(async () => {
    if (exportando || imprimiendo || moviendo) {
      return;
    }

    setExportando(true);
    setMensajeSalida(null);

    try {
      const datos = await prepararSalidaCompleta();

      const fecha = crearFechaNombreArchivo();

      const resultadoExportacion = await exportarOrganigramaPDF({
        ...datos,

        titulo: "Organigrama de la empresa",

        nombreArchivo: `organigrama-${fecha}.pdf`,
      });

      setMensajeSalida({
        tipo: "correcto",

        texto: `El PDF "${resultadoExportacion.nombreArchivo}" fue generado correctamente.`,
      });
    } catch (error) {
      console.error("Error al exportar PDF:", error);

      setMensajeSalida({
        tipo: "error",

        texto: error?.message || "No se pudo exportar el organigrama a PDF.",
      });
    } finally {
      setMostrarTodoParaSalida(false);

      setExportando(false);
    }
  }, [exportando, imprimiendo, moviendo, prepararSalidaCompleta]);

  /* ============================================================
     ESTADOS INICIALES
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

  const procesandoSalida = exportando || imprimiendo || moviendo;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="vista-organigrama-contenedor">
      <BarraHerramientas
        cantidadEmpleados={empleadosActivos.length}
        empleados={empleadosActivos}
        buscando={buscando}
        empleadoSeleccionado={empleadoSeleccionado}
        onBuscar={handleBuscar}
        onSeleccionarResultado={handleSeleccionarResultado}
        onLimpiarBusqueda={handleLimpiarBusqueda}
        onAgregar={moviendo ? undefined : onAgregar}
        onEditar={
          !moviendo && typeof onEditar === "function" ? handleEditar : undefined
        }
        onEliminar={
          !moviendo && typeof onEliminar === "function"
            ? handleEliminar
            : undefined
        }
        onCentrar={handleCentrar}
        onAcercar={handleAcercar}
        onAlejar={handleAlejar}
        onImportar={moviendo ? undefined : onImportar}
        onImprimir={procesandoSalida ? undefined : handleImprimir}
        onExportarPDF={procesandoSalida ? undefined : handleExportarPDF}
      />

      {mensajeBusqueda && (
        <div className="vista-organigrama-busqueda-mensaje">
          {mensajeBusqueda}
        </div>
      )}

      {mensajeSalida && (
        <div
          className={`vista-organigrama-salida-mensaje vista-organigrama-salida-mensaje--${mensajeSalida.tipo}`}
        >
          <span>{mensajeSalida.texto}</span>

          <button
            type="button"
            onClick={() => setMensajeSalida(null)}
            aria-label="Cerrar mensaje"
            title="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {procesandoSalida && (
        <div className="vista-organigrama-procesando">
          <div className="vista-organigrama-procesando__spinner" />

          <span>
            {moviendo
              ? "Guardando cambio de supervisor..."
              : exportando
                ? "Generando PDF con el organigrama completo..."
                : "Preparando impresión completa..."}
          </span>
        </div>
      )}

      <div ref={contenedorFlowRef} className="vista-organigrama">
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
          onNodesChange={onNodesChange}
          onNodeClick={handleSeleccionarNodo}
          onPaneClick={handleDeseleccionar}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          fitView
          fitViewOptions={{
            padding: 0.25,
            minZoom: ZOOM_MINIMO,
            maxZoom: 1.1,
          }}
          minZoom={ZOOM_MINIMO}
          maxZoom={ZOOM_MAXIMO}
          nodesDraggable={!procesandoSalida && !mostrarTodoParaSalida}
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
   PROVIDER
============================================================ */

export default function VistaOrganigrama(props) {
  return (
    <ReactFlowProvider>
      <OrganigramaInterno {...props} />
    </ReactFlowProvider>
  );
}

/* ============================================================
   CADENA DE SUPERVISORES
============================================================ */

function obtenerCadenaSupervisores(empleado, empleados) {
  const mapa = new Map(
    empleados.map((item) => [String(item.idEmpleado), item]),
  );

  const resultado = [];
  const visitados = new Set();

  let supervisorId = empleado.supervisorId;

  while (
    supervisorId !== null &&
    supervisorId !== undefined &&
    supervisorId !== ""
  ) {
    const clave = String(supervisorId);

    if (visitados.has(clave)) {
      break;
    }

    visitados.add(clave);
    resultado.push(supervisorId);

    const supervisor = mapa.get(clave);

    if (!supervisor) {
      break;
    }

    supervisorId = supervisor.supervisorId;
  }

  return resultado;
}

/* ============================================================
   ELEGIR SUPERVISOR AL ARRASTRAR
============================================================ */

function seleccionarMejorDestino(nodoMovido, nodosIntersectados) {
  if (!Array.isArray(nodosIntersectados) || nodosIntersectados.length === 0) {
    return null;
  }

  const centroMovido = obtenerCentroNodo(nodoMovido);

  return (
    [...nodosIntersectados]
      .filter((node) => node?.data?.empleado)
      .sort((a, b) => {
        const distanciaA = calcularDistancia(
          centroMovido,
          obtenerCentroNodo(a),
        );

        const distanciaB = calcularDistancia(
          centroMovido,
          obtenerCentroNodo(b),
        );

        return distanciaA - distanciaB;
      })[0] || null
  );
}

/* ============================================================
   DISTANCIA
============================================================ */

function calcularDistancia(puntoA, puntoB) {
  const diferenciaX = puntoA.x - puntoB.x;

  const diferenciaY = puntoA.y - puntoB.y;

  return Math.sqrt(diferenciaX ** 2 + diferenciaY ** 2);
}

/* ============================================================
   NORMALIZAR TEXTO
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

/* ============================================================
   FECHA PARA ARCHIVO
============================================================ */

function crearFechaNombreArchivo() {
  const fecha = new Date();

  const anio = fecha.getFullYear();

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const dia = String(fecha.getDate()).padStart(2, "0");

  const hora = String(fecha.getHours()).padStart(2, "0");

  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  return `${anio}-${mes}-${dia}_${hora}-${minutos}`;
}

/* ============================================================
   ESPERAR RENDERIZADO
============================================================ */

function esperarRenderizadoCompleto() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 250);
      });
    });
  });
}
