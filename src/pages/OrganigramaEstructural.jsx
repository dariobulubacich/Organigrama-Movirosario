import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import NodoEstructural from "../components/NodoEstructural";

import {
  guardarOrganigramaEstructural,
  obtenerOrganigramaEstructural,
} from "../services/organigramaEstructuralService";

import "./OrganigramaEstructural.css";

const nodeTypes = {
  estructural: NodoEstructural,
};

function generarId(prefijo) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefijo}-${crypto.randomUUID()}`;
  }

  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function OrganigramaEstructuralInterno() {
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [estructura, setEstructura] = useState(null);

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);

        const datos = await obtenerOrganigramaEstructural();

        setEstructura(datos);
      } catch (error) {
        console.error("Error al cargar el organigrama:", error);

        setMensaje(error?.message || "No se pudo cargar el organigrama.");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const actualizarElemento = useCallback((tipo, id, campo, valor) => {
    setEstructura((anterior) => {
      if (!anterior) {
        return anterior;
      }

      if (tipo === "directorEjecutivo") {
        return {
          ...anterior,
          directorEjecutivo: {
            ...anterior.directorEjecutivo,
            [campo]: valor,
          },
        };
      }

      const clave = {
        director: "directores",
        gerencia: "gerencias",
        jefatura: "jefaturas",
      }[tipo];

      return {
        ...anterior,
        [clave]: anterior[clave].map((elemento) =>
          elemento.id === id
            ? {
                ...elemento,
                [campo]: valor,
              }
            : elemento,
        ),
      };
    });
  }, []);

  const agregarGerencia = useCallback(() => {
    setEstructura((anterior) => {
      if (!anterior) {
        return anterior;
      }

      const numero = anterior.gerencias.length + 1;

      const nuevaGerencia = {
        id: generarId("gerencia"),
        nombreSector: `Gerencia ${numero}`,
        nombrePersona: "",
        posicion: {
          x: 100 + (anterior.gerencias.length % 5) * 300,
          y: 560 + Math.floor(anterior.gerencias.length / 5) * 280,
        },
      };

      return {
        ...anterior,
        gerencias: [...anterior.gerencias, nuevaGerencia],
      };
    });

    setMensaje("Se agregó una nueva gerencia. Presioná Guardar cambios.");
  }, []);

  const agregarJefatura = useCallback(() => {
    setEstructura((anterior) => {
      if (!anterior) {
        return anterior;
      }

      const numero = anterior.jefaturas.length + 1;

      const primeraGerencia = anterior.gerencias[0]?.id || "";

      const nuevaJefatura = {
        id: generarId("jefatura"),
        nombreSector: `Jefatura ${numero}`,
        nombrePersona: "",
        gerenciaId: primeraGerencia,
        posicion: {
          x: 100 + (anterior.jefaturas.length % 6) * 260,
          y: 920 + Math.floor(anterior.jefaturas.length / 6) * 300,
        },
      };

      return {
        ...anterior,
        jefaturas: [...anterior.jefaturas, nuevaJefatura],
      };
    });

    setMensaje("Se agregó una nueva jefatura. Presioná Guardar cambios.");
  }, []);

  const eliminarGerencia = useCallback(
    (gerenciaId) => {
      const tieneJefaturas = estructura?.jefaturas?.some(
        (jefatura) => jefatura.gerenciaId === gerenciaId,
      );

      if (tieneJefaturas) {
        window.alert(
          "No se puede eliminar esta gerencia porque tiene jefaturas asignadas. Primero cambiá o eliminá esas jefaturas.",
        );

        return;
      }

      const confirmar = window.confirm("¿Querés eliminar esta gerencia?");

      if (!confirmar) {
        return;
      }

      setEstructura((anterior) => ({
        ...anterior,
        gerencias: anterior.gerencias.filter(
          (gerencia) => gerencia.id !== gerenciaId,
        ),
      }));
    },
    [estructura],
  );

  const eliminarJefatura = useCallback((jefaturaId) => {
    const confirmar = window.confirm("¿Querés eliminar esta jefatura?");

    if (!confirmar) {
      return;
    }

    setEstructura((anterior) => ({
      ...anterior,
      jefaturas: anterior.jefaturas.filter(
        (jefatura) => jefatura.id !== jefaturaId,
      ),
    }));
  }, []);

  const nodosCalculados = useMemo(() => {
    if (!estructura) {
      return [];
    }

    const ejecutivo = estructura.directorEjecutivo;

    const nodoEjecutivo = {
      id: ejecutivo.id,
      type: "estructural",
      position: ejecutivo.posicion,
      data: {
        tipo: "directorEjecutivo",
        nombreSector: ejecutivo.nombreSector || "",
        nombrePersona: ejecutivo.nombrePersona || "",
        onCambiarCampo: (campo, valor) =>
          actualizarElemento("directorEjecutivo", ejecutivo.id, campo, valor),
      },
    };

    const nodosDirectores = estructura.directores.map((director) => ({
      id: director.id,
      type: "estructural",
      position: director.posicion,
      data: {
        tipo: "director",
        nombreSector: director.nombreSector || "",
        nombrePersona: director.nombrePersona || "",
        onCambiarCampo: (campo, valor) =>
          actualizarElemento("director", director.id, campo, valor),
      },
    }));

    const nodosGerencias = estructura.gerencias.map((gerencia) => ({
      id: gerencia.id,
      type: "estructural",
      position: gerencia.posicion,
      data: {
        tipo: "gerencia",
        nombreSector: gerencia.nombreSector || "",
        nombrePersona: gerencia.nombrePersona || "",
        onCambiarCampo: (campo, valor) =>
          actualizarElemento("gerencia", gerencia.id, campo, valor),
        onEliminar: () => eliminarGerencia(gerencia.id),
      },
    }));

    const nodosJefaturas = estructura.jefaturas.map((jefatura) => ({
      id: jefatura.id,
      type: "estructural",
      position: jefatura.posicion,
      data: {
        tipo: "jefatura",
        nombreSector: jefatura.nombreSector || "",
        nombrePersona: jefatura.nombrePersona || "",
        gerenciaId: jefatura.gerenciaId || "",
        opcionesGerencias: estructura.gerencias,
        onCambiarCampo: (campo, valor) =>
          actualizarElemento("jefatura", jefatura.id, campo, valor),
        onEliminar: () => eliminarJefatura(jefatura.id),
      },
    }));

    return [
      nodoEjecutivo,
      ...nodosDirectores,
      ...nodosGerencias,
      ...nodosJefaturas,
    ];
  }, [estructura, actualizarElemento, eliminarGerencia, eliminarJefatura]);

  const conexionesCalculadas = useMemo(() => {
    if (!estructura) {
      return [];
    }

    const ejecutivoId = estructura.directorEjecutivo.id;

    const conexionesDirectores = estructura.directores.map((director) => ({
      id: `conexion-${ejecutivoId}-${director.id}`,
      source: ejecutivoId,
      target: director.id,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

    const conexionesGerencias = estructura.gerencias.map((gerencia) => ({
      id: `conexion-${ejecutivoId}-${gerencia.id}`,
      source: ejecutivoId,
      target: gerencia.id,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

    const conexionesJefaturas = estructura.jefaturas
      .filter((jefatura) => jefatura.gerenciaId)
      .map((jefatura) => ({
        id: `conexion-${jefatura.gerenciaId}-${jefatura.id}`,
        source: jefatura.gerenciaId,
        target: jefatura.id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }));

    return [
      ...conexionesDirectores,
      ...conexionesGerencias,
      ...conexionesJefaturas,
    ];
  }, [estructura]);

  useEffect(() => {
    setNodes(nodosCalculados);
  }, [nodosCalculados, setNodes]);

  useEffect(() => {
    setEdges(conexionesCalculadas);
  }, [conexionesCalculadas, setEdges]);

  const handleNodeDragStop = useCallback((_event, node) => {
    setEstructura((anterior) => {
      if (!anterior) {
        return anterior;
      }

      if (node.id === anterior.directorEjecutivo.id) {
        return {
          ...anterior,
          directorEjecutivo: {
            ...anterior.directorEjecutivo,
            posicion: {
              x: node.position.x,
              y: node.position.y,
            },
          },
        };
      }

      const actualizarLista = (lista) =>
        lista.map((elemento) =>
          elemento.id === node.id
            ? {
                ...elemento,
                posicion: {
                  x: node.position.x,
                  y: node.position.y,
                },
              }
            : elemento,
        );

      return {
        ...anterior,
        directores: actualizarLista(anterior.directores),
        gerencias: actualizarLista(anterior.gerencias),
        jefaturas: actualizarLista(anterior.jefaturas),
      };
    });
  }, []);

  const handleGuardar = async () => {
    if (!estructura || guardando) {
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");

      await guardarOrganigramaEstructural(estructura);

      setMensaje("Organigrama guardado correctamente.");
    } catch (error) {
      console.error("Error al guardar el organigrama:", error);

      setMensaje(error?.message || "No se pudo guardar el organigrama.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="organigrama-estructural__mensaje">
        Cargando organigrama...
      </div>
    );
  }

  return (
    <div className="organigrama-estructural">
      <div className="organigrama-estructural__barra">
        <div>
          <h1>Organigrama estructural</h1>

          <p>Dirección Ejecutiva, directores, gerencias y jefaturas</p>
        </div>

        <div className="organigrama-estructural__acciones">
          <button type="button" onClick={() => navigate("/")}>
            ← Organigrama de empleados
          </button>

          <button type="button" onClick={agregarGerencia}>
            + Crear gerencia
          </button>

          <button type="button" onClick={agregarJefatura}>
            + Crear jefatura
          </button>

          <button type="button" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="organigrama-estructural__mensaje">{mensaje}</div>
      )}

      <div className="organigrama-estructural__flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          fitView
          minZoom={0.1}
          maxZoom={2}
          nodesConnectable={false}
          deleteKeyCode={null}
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background gap={18} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function OrganigramaEstructural() {
  return (
    <ReactFlowProvider>
      <OrganigramaEstructuralInterno />
    </ReactFlowProvider>
  );
}
