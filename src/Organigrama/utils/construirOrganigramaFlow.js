import dagre from "@dagrejs/dagre";

/*
|--------------------------------------------------------------------------
| Configuración del organigrama
|--------------------------------------------------------------------------
|
| Estas medidas deben coincidir aproximadamente con el tamaño que tendrá
| cada tarjeta de empleado en NodoEmpleado.css.
|
*/

const ANCHO_NODO = 260;
const ALTO_NODO = 145;

const SEPARACION_HORIZONTAL = 55;
const SEPARACION_VERTICAL = 90;

/*
|--------------------------------------------------------------------------
| Construir los nodos y conexiones para React Flow
|--------------------------------------------------------------------------
|
| Recibe:
|   empleados: Array de empleados provenientes de Firestore.
|
| Devuelve:
|   {
|     nodes: [],
|     edges: [],
|     errores: []
|   }
|
*/

export default function construirOrganigramaFlow(empleados) {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return {
      nodes: [],
      edges: [],
      errores: [],
    };
  }

  const empleadosActivos = empleados.filter(
    (empleado) => empleado.activo !== false,
  );

  if (empleadosActivos.length === 0) {
    return {
      nodes: [],
      edges: [],
      errores: [],
    };
  }

  const errores = [];
  const idsRegistrados = new Set();

  /*
  |--------------------------------------------------------------------------
  | Limpiar y validar empleados
  |--------------------------------------------------------------------------
  */

  const empleadosPreparados = empleadosActivos
    .map((empleado) => normalizarEmpleado(empleado))
    .filter((empleado) => {
      if (empleado.idEmpleado === null) {
        errores.push(
          `Se encontró un empleado sin identificador válido: ${
            empleado.nombre || "Sin nombre"
          }.`,
        );

        return false;
      }

      const claveId = String(empleado.idEmpleado);

      if (idsRegistrados.has(claveId)) {
        errores.push(
          `El identificador ${empleado.idEmpleado} está repetido en los datos de Firestore.`,
        );

        return false;
      }

      idsRegistrados.add(claveId);

      return true;
    });

  if (empleadosPreparados.length === 0) {
    return {
      nodes: [],
      edges: [],
      errores,
    };
  }

  const idsDisponibles = new Set(
    empleadosPreparados.map((empleado) => String(empleado.idEmpleado)),
  );

  /*
  |--------------------------------------------------------------------------
  | Detectar supervisores inexistentes
  |--------------------------------------------------------------------------
  */

  empleadosPreparados.forEach((empleado) => {
    if (
      empleado.supervisorId !== null &&
      !idsDisponibles.has(String(empleado.supervisorId))
    ) {
      errores.push(
        `El empleado ${empleado.nombre} (${empleado.idEmpleado}) tiene como supervisor a ${empleado.supervisorId}, pero ese empleado no está activo o no existe.`,
      );
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Crear nodos de React Flow
  |--------------------------------------------------------------------------
  */

  const nodes = empleadosPreparados.map((empleado) => ({
    id: String(empleado.idEmpleado),

    type: "empleado",

    position: {
      x: 0,
      y: 0,
    },

    data: {
      empleado,
    },

    draggable: false,

    selectable: true,

    connectable: false,
  }));

  /*
  |--------------------------------------------------------------------------
  | Crear conexiones entre supervisor y subordinado
  |--------------------------------------------------------------------------
  */

  const edges = empleadosPreparados
    .filter(
      (empleado) =>
        empleado.supervisorId !== null &&
        idsDisponibles.has(String(empleado.supervisorId)),
    )
    .map((empleado) => ({
      id: `conexion-${empleado.supervisorId}-${empleado.idEmpleado}`,

      source: String(empleado.supervisorId),

      target: String(empleado.idEmpleado),

      type: "smoothstep",

      animated: false,

      selectable: false,

      focusable: false,

      style: {
        strokeWidth: 2,
      },
    }));

  /*
  |--------------------------------------------------------------------------
  | Calcular las posiciones con Dagre
  |--------------------------------------------------------------------------
  */

  const elementosOrdenados = aplicarDistribucionDagre(nodes, edges);

  return {
    nodes: elementosOrdenados.nodes,
    edges: elementosOrdenados.edges,
    errores: eliminarDuplicados(errores),
  };
}

/*
|--------------------------------------------------------------------------
| Aplicar distribución jerárquica
|--------------------------------------------------------------------------
|
| rankdir: "TB"
|
| TB significa:
|   Top to Bottom
|   De arriba hacia abajo.
|
*/

function aplicarDistribucionDagre(nodes, edges) {
  const grafo = new dagre.graphlib.Graph();

  grafo.setDefaultEdgeLabel(() => ({}));

  grafo.setGraph({
    rankdir: "TB",

    nodesep: SEPARACION_HORIZONTAL,

    ranksep: SEPARACION_VERTICAL,

    marginx: 40,

    marginy: 40,
  });

  nodes.forEach((node) => {
    grafo.setNode(node.id, {
      width: ANCHO_NODO,
      height: ALTO_NODO,
    });
  });

  edges.forEach((edge) => {
    grafo.setEdge(edge.source, edge.target);
  });

  dagre.layout(grafo);

  const nodesPosicionados = nodes.map((node) => {
    const posicion = grafo.node(node.id);

    if (!posicion) {
      return node;
    }

    /*
    |----------------------------------------------------------------------
    | Dagre devuelve el centro del nodo.
    | React Flow necesita la esquina superior izquierda.
    |----------------------------------------------------------------------
    */

    return {
      ...node,

      position: {
        x: posicion.x - ANCHO_NODO / 2,
        y: posicion.y - ALTO_NODO / 2,
      },

      width: ANCHO_NODO,

      height: ALTO_NODO,
    };
  });

  return {
    nodes: nodesPosicionados,
    edges,
  };
}

/*
|--------------------------------------------------------------------------
| Normalizar empleado
|--------------------------------------------------------------------------
*/

function normalizarEmpleado(empleado) {
  const idEmpleado = convertirIdentificador(
    empleado?.idEmpleado ?? empleado?.id,
  );

  const supervisorId = convertirIdentificador(empleado?.supervisorId);

  return {
    ...empleado,

    idEmpleado,

    supervisorId,

    nombre: limpiarTexto(empleado?.nombre),

    cargo: limpiarTexto(empleado?.cargo || empleado?.puesto),

    area: limpiarTexto(empleado?.area),

    telefono: limpiarTexto(empleado?.telefono),

    interno: limpiarTexto(empleado?.interno),

    email: limpiarTexto(empleado?.email),

    foto: limpiarTexto(empleado?.foto),

    nivel: empleado?.nivel ?? "",

    orden: convertirOrden(empleado?.orden),

    activo: empleado?.activo !== false,
  };
}

/*
|--------------------------------------------------------------------------
| Convertir identificadores
|--------------------------------------------------------------------------
|
| Conservamos los identificadores numéricos como números.
| Los valores vacíos se convierten en null.
|
*/

function convertirIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isNaN(numero) && Number.isFinite(numero)) {
    return numero;
  }

  return String(valor).trim();
}

/*
|--------------------------------------------------------------------------
| Convertir orden
|--------------------------------------------------------------------------
*/

function convertirOrden(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero;
}

/*
|--------------------------------------------------------------------------
| Limpiar texto
|--------------------------------------------------------------------------
*/

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

/*
|--------------------------------------------------------------------------
| Eliminar mensajes de error duplicados
|--------------------------------------------------------------------------
*/

function eliminarDuplicados(lista) {
  return [...new Set(lista.filter(Boolean))];
}

/*
|--------------------------------------------------------------------------
| Exportaciones auxiliares
|--------------------------------------------------------------------------
|
| Se exportan las medidas para utilizarlas después en los estilos o en
| otras funciones sin repetir valores.
|
*/

export const MEDIDAS_NODO_ORGANIGRAMA = {
  ancho: ANCHO_NODO,
  alto: ALTO_NODO,
};
