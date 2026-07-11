import dagre from "@dagrejs/dagre";

/* ============================================================
   CONFIGURACIÓN DE LOS NODOS
============================================================ */

const ANCHO_NODO = 280;
const ALTO_NODO = 180;

const SEPARACION_HORIZONTAL = 90;
const SEPARACION_VERTICAL = 130;

/* ============================================================
   FUNCIÓN PRINCIPAL
============================================================ */

/**
 * Convierte la lista de empleados en nodos y conexiones
 * compatibles con React Flow.
 *
 * Los empleados inactivos no se muestran.
 *
 * Devuelve:
 *
 * {
 *   nodes: [],
 *   edges: [],
 *   errores: []
 * }
 */
export default function construirOrganigramaFlow(empleados) {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return crearResultadoVacio();
  }

  const errores = [];

  const empleadosActivos = empleados
    .filter((empleado) => empleado?.activo !== false)
    .map(normalizarEmpleado);

  if (empleadosActivos.length === 0) {
    return crearResultadoVacio();
  }

  /* ============================================================
     VALIDAR IDENTIFICADORES
  ============================================================ */

  const idsRegistrados = new Set();

  const empleadosValidos = empleadosActivos.filter((empleado) => {
    if (empleado.idEmpleado === null) {
      errores.push(
        `Se encontró un empleado sin identificador válido: ${
          empleado.nombre || "Sin nombre"
        }.`,
      );

      return false;
    }

    const clave = String(empleado.idEmpleado);

    if (idsRegistrados.has(clave)) {
      errores.push(
        `El identificador ${empleado.idEmpleado} está repetido en Firestore.`,
      );

      return false;
    }

    idsRegistrados.add(clave);

    return true;
  });

  if (empleadosValidos.length === 0) {
    return {
      nodes: [],
      edges: [],
      errores: eliminarDuplicados(errores),
    };
  }

  /* ============================================================
     ORDENAR EMPLEADOS
  ============================================================ */

  const empleadosOrdenados = [...empleadosValidos].sort(ordenarEmpleados);

  const idsDisponibles = new Set(
    empleadosOrdenados.map((empleado) => String(empleado.idEmpleado)),
  );

  /* ============================================================
     VALIDAR SUPERVISORES
  ============================================================ */

  empleadosOrdenados.forEach((empleado) => {
    if (
      empleado.supervisorId !== null &&
      !idsDisponibles.has(String(empleado.supervisorId))
    ) {
      errores.push(
        `El empleado ${empleado.nombre} (${empleado.idEmpleado}) tiene como supervisor a ${empleado.supervisorId}, pero ese empleado no existe o está inactivo.`,
      );
    }

    if (
      empleado.supervisorId !== null &&
      String(empleado.idEmpleado) === String(empleado.supervisorId)
    ) {
      errores.push(
        `El empleado ${empleado.nombre} (${empleado.idEmpleado}) no puede supervisarse a sí mismo.`,
      );
    }
  });

  /* ============================================================
     CREAR NODOS
  ============================================================ */

  const nodes = empleadosOrdenados.map((empleado) => ({
    id: String(empleado.idEmpleado),

    type: "empleado",

    position: {
      x: 0,
      y: 0,
    },

    /*
      |--------------------------------------------------------------------------
      | Posición absoluta inicial.
      |--------------------------------------------------------------------------
      |
      | React Flow actualizará position mientras el usuario arrastra.
      | Después de guardar el cambio de supervisor, el árbol se reconstruirá
      | y Dagre volverá a ordenar automáticamente todas las ramas.
      |
      */

    data: {
      empleado,

      idEmpleado: empleado.idEmpleado,

      supervisorId: empleado.supervisorId,
    },

    width: ANCHO_NODO,
    height: ALTO_NODO,

    draggable: true,
    selectable: true,
    connectable: false,

    /*
      |--------------------------------------------------------------------------
      | Evita que los nodos sean eliminados con la tecla Suprimir.
      |--------------------------------------------------------------------------
      */

    deletable: false,

    /*
      |--------------------------------------------------------------------------
      | El nodo puede recibir foco, pero no se conecta manualmente.
      |--------------------------------------------------------------------------
      */

    focusable: true,
  }));

  /* ============================================================
     CREAR CONEXIONES
  ============================================================ */

  const edges = empleadosOrdenados
    .filter(
      (empleado) =>
        empleado.supervisorId !== null &&
        idsDisponibles.has(String(empleado.supervisorId)) &&
        String(empleado.supervisorId) !== String(empleado.idEmpleado),
    )
    .map((empleado) => ({
      id: `conexion-${empleado.supervisorId}` + `-${empleado.idEmpleado}`,

      source: String(empleado.supervisorId),

      target: String(empleado.idEmpleado),

      type: "smoothstep",

      animated: false,
      selectable: false,
      deletable: false,
      focusable: false,

      style: {
        strokeWidth: 2,
      },
    }));

  /* ============================================================
     DISTRIBUCIÓN PIRAMIDAL
  ============================================================ */

  const distribucion = aplicarDistribucionDagre(nodes, edges);

  return {
    nodes: distribucion.nodes,
    edges: distribucion.edges,
    errores: eliminarDuplicados(errores),
  };
}

/* ============================================================
   DISTRIBUCIÓN AUTOMÁTICA CON DAGRE
============================================================ */

function aplicarDistribucionDagre(nodes, edges) {
  const grafo = new dagre.graphlib.Graph();
  const MARGEN_VERTICAL = 40;
  grafo.setDefaultEdgeLabel(() => ({}));

  grafo.setGraph({
    /*
    |--------------------------------------------------------------------------
    | TB = Top to Bottom.
    |--------------------------------------------------------------------------
    */

    rankdir: "TB",

    nodesep: SEPARACION_HORIZONTAL,

    ranksep: SEPARACION_VERTICAL,

    marginx: 80,

    marginy: 80,

    /*
    |--------------------------------------------------------------------------
    | Mejora la distribución de árboles con muchas ramas.
    |--------------------------------------------------------------------------
    */

    ranker: "network-simplex",

    align: undefined,
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
      return {
        ...node,

        positionOriginal: {
          ...node.position,
        },
      };
    }

    /*
      |--------------------------------------------------------------------------
      | Dagre devuelve el centro del nodo.
      | React Flow utiliza la esquina superior izquierda.
      |--------------------------------------------------------------------------
      */

    const nivelVisual = obtenerNivelVisual(node.data?.empleado);

    const position = {
      x: posicion.x - ANCHO_NODO / 2,

      /*
  |--------------------------------------------------------------------------
  | Todos los empleados del mismo nivel quedan a la misma altura.
  |--------------------------------------------------------------------------
  */

      y: MARGEN_VERTICAL + nivelVisual * (ALTO_NODO + SEPARACION_VERTICAL),
    };

    return {
      ...node,

      position,

      /*
        |--------------------------------------------------------------------------
        | Guardamos la posición calculada.
        |--------------------------------------------------------------------------
        |
        | Si el usuario suelta el nodo en una zona donde no hay supervisor,
        | VistaOrganigrama podrá devolverlo a esta posición.
        |
        */

      positionOriginal: {
        ...position,
      },

      data: {
        ...node.data,

        positionOriginal: {
          ...position,
        },
      },
    };
  });

  return {
    nodes: nodesPosicionados,
    edges,
  };
}

/* ============================================================
   NORMALIZAR EMPLEADO
============================================================ */

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

    color: limpiarTexto(empleado?.color),

    nivel: empleado?.nivel ?? "",

    orden: convertirOrden(empleado?.orden),

    activo: empleado?.activo !== false,
  };
}

/* ============================================================
   ORDENAR EMPLEADOS
============================================================ */

/**
 * Mantiene juntos los empleados que tienen el mismo supervisor
 * y respeta el campo "orden".
 */
function ordenarEmpleados(a, b) {
  const supervisorA = a.supervisorId === null ? "" : String(a.supervisorId);

  const supervisorB = b.supervisorId === null ? "" : String(b.supervisorId);

  if (supervisorA !== supervisorB) {
    return supervisorA.localeCompare(supervisorB, "es", {
      numeric: true,
      sensitivity: "base",
    });
  }

  const ordenA = Number(a.orden) || 0;

  const ordenB = Number(b.orden) || 0;

  if (ordenA !== ordenB) {
    return ordenA - ordenB;
  }

  return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
    sensitivity: "base",
  });
}

/* ============================================================
   IDENTIFICADORES
============================================================ */

function convertirIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const texto = String(valor).trim();

  const numero = Number(texto);

  if (Number.isFinite(numero) && Number.isInteger(numero)) {
    return numero;
  }

  return texto;
}

/* ============================================================
   ORDEN
============================================================ */

function convertirOrden(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numero));
}

/* ============================================================
   LIMPIAR TEXTO
============================================================ */

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

/* ============================================================
   ELIMINAR DUPLICADOS
============================================================ */

function eliminarDuplicados(lista) {
  return [...new Set(lista.filter(Boolean))];
}

/* ============================================================
   RESULTADO VACÍO
============================================================ */

function crearResultadoVacio() {
  return {
    nodes: [],
    edges: [],
    errores: [],
  };
}

/* ============================================================
   MEDIDAS EXPORTADAS
============================================================ */

export const MEDIDAS_NODO_ORGANIGRAMA = {
  ancho: ANCHO_NODO,
  alto: ALTO_NODO,
};
function obtenerNivelVisual(empleado) {
  const nivelGuardado = Number(empleado?.nivel);

  /*
  |--------------------------------------------------------------------------
  | Si el empleado ya tiene un nivel cargado manualmente,
  | usamos ese nivel.
  |--------------------------------------------------------------------------
  */

  if (Number.isInteger(nivelGuardado) && nivelGuardado > 0) {
    return nivelGuardado - 1;
  }

  const cargo = normalizarCargo(empleado?.cargo || empleado?.puesto);

  /*
  |--------------------------------------------------------------------------
  | Nivel 1: Dirección
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("director ejecutivo") ||
    cargo.includes("director general") ||
    cargo === "director" ||
    cargo.includes("presidente")
  ) {
    return 0;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 2: Gerencias
  |--------------------------------------------------------------------------
  */

  if (cargo.includes("gerente")) {
    return 1;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 3: Jefaturas
  |--------------------------------------------------------------------------
  */

  if (cargo.includes("jefe") || cargo.includes("jefa")) {
    return 2;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 4: Supervisores y responsables
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("supervisor") ||
    cargo.includes("responsable") ||
    cargo.includes("encargado") ||
    cargo.includes("encargada")
  ) {
    return 3;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 5: Coordinadores y referentes
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("coordinador") ||
    cargo.includes("coordinadora") ||
    cargo.includes("referente")
  ) {
    return 4;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 6: Analistas, administrativos y personal
  |--------------------------------------------------------------------------
  */

  return 5;
}

function normalizarCargo(valor) {
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
