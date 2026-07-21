import dagre from "@dagrejs/dagre";

/* ============================================================
   CONFIGURACIÓN DE LOS NODOS
============================================================ */

const ANCHO_NODO = 280;
const ALTO_NODO = 180;

const SEPARACION_HORIZONTAL = 90;
const SEPARACION_VERTICAL = 130;
const SEPARACION_ENTRE_AREAS = 220;

const MARGEN_HORIZONTAL = 100;
const MARGEN_VERTICAL = 60;
const ANCHO_TITULO_AREA = 320;
const ALTO_TITULO_AREA = 55;
const ESPACIO_TITULO_AREA = 35;
const COLORES_AREAS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#ea580c",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
  "#16a34a",
];
const NOMBRES_OCULTOS = new Set([
  "",
  "vacante",
  "puesto vacante",
  "sin cubrir",
  "sin asignar",
  "sin asignada",
  "no asignado",
  "no asignada",
  "a definir",
  "n/n",
]);

/* ============================================================
   FUNCIÓN PRINCIPAL
============================================================ */

/**
 * Convierte la lista de empleados en nodos y conexiones
 * compatibles con React Flow.
 *
 * Los empleados inactivos no se muestran.
 *
 * En este primer paso los empleados se agrupan y ordenan
 * por área, pero la distribución visual sigue usando Dagre.
 *
 * Devuelve:
 *
 * {
 *   nodes: [],
 *   edges: [],
 *   errores: []
 * }
 */
export default function construirOrganigramaFlow(empleados, opciones = {}) {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return crearResultadoVacio();
  }

  const errores = [];

  const empleadosActivos = empleados
    .filter((empleado) => empleado?.activo !== false)
    .map(normalizarEmpleado)
    .filter(debeMostrarEmpleado);

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
     AGRUPAR Y ORDENAR POR ÁREA
  ============================================================ */

  const empleadosOrdenados = ordenarEmpleadosPorArea(empleadosValidos);
  const mapaEmpleados = crearMapaEmpleados(empleadosOrdenados);

  const directorPrincipal = obtenerDirectorPrincipal(empleadosOrdenados);

  const directorId = directorPrincipal?.idEmpleado ?? null;
  const responsablesArea = empleadosOrdenados.filter(
    (empleado) =>
      directorId !== null &&
      String(empleado.supervisorId) === String(directorId),
  );

  const coloresPorResponsable = new Map();

  responsablesArea.forEach((responsable, index) => {
    coloresPorResponsable.set(
      String(responsable.idEmpleado),
      COLORES_AREAS[index % COLORES_AREAS.length],
    );
  });

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

    data: {
      empleado,

      idEmpleado: empleado.idEmpleado,

      supervisorId: empleado.supervisorId,

      area: empleado.area,

      nivelVisual: obtenerNivelVisual(empleado),
    },

    width: ANCHO_NODO,
    height: ALTO_NODO,

    draggable: true,
    selectable: true,
    connectable: false,

    deletable: false,

    focusable: true,
  }));

  /* ============================================================
     CREAR CONEXIONES
  ============================================================ */

  const edges = empleadosOrdenados
    .filter((empleado) => {
      if (empleado.supervisorId === null) {
        return false;
      }

      if (!idsDisponibles.has(String(empleado.supervisorId))) {
        return false;
      }

      if (String(empleado.supervisorId) === String(empleado.idEmpleado)) {
        return false;
      }

      return true;
    })
    .map((empleado) => {
      const esConexionDesdeDirector =
        directorId !== null &&
        String(empleado.supervisorId) === String(directorId);

      let responsableArea = null;

      if (esConexionDesdeDirector) {
        responsableArea = empleado;
      } else {
        responsableArea = obtenerResponsableArea(
          empleado,
          mapaEmpleados,
          directorId,
        );
      }

      const responsableId = responsableArea?.idEmpleado ?? null;

      const nombreArea =
        limpiarTexto(opciones?.nombreArea) ||
        obtenerNombreRama(responsableArea);

      const colorArea =
        coloresPorResponsable.get(String(responsableId)) || "#64748b";

      return {
        id: `conexion-${empleado.supervisorId}-${empleado.idEmpleado}`,

        source: String(empleado.supervisorId),
        target: String(empleado.idEmpleado),

        type: "conexionArea",

        animated: false,
        selectable: false,
        deletable: false,
        focusable: false,

        data: {
          area: nombreArea,
          responsableAreaId: responsableId,
          colorArea,
          esConexionDesdeDirector,
        },

        style: {
          stroke: colorArea,
          strokeWidth: esConexionDesdeDirector ? 5 : 4,
        },
      };
    });

  /* ============================================================
     DISTRIBUCIÓN PIRAMIDAL
  ============================================================ */

  const distribucion = aplicarDistribucionPorAreas(nodes, edges);
  /* ============================================================
   DISTRIBUCIÓN POR ÁREAS
============================================================ */

  function aplicarDistribucionPorAreas(nodes, edges) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return {
        nodes: [],
        edges: Array.isArray(edges) ? edges : [],
      };
    }

    /*
  |--------------------------------------------------------------------------
  | Separar Dirección del resto de los empleados.
  |--------------------------------------------------------------------------
  */

    const nodosDireccion = nodes.filter(
      (node) => obtenerNivelVisual(node.data?.empleado) === 0,
    );

    const nodosRestantes = nodes.filter(
      (node) => obtenerNivelVisual(node.data?.empleado) > 0,
    );

    /*
  |--------------------------------------------------------------------------
  | Agrupar los empleados restantes por área.
  |--------------------------------------------------------------------------
  */

    const nodosPorArea = agruparNodosPorArea(nodosRestantes);

    const nombresAreas = [...nodosPorArea.keys()].sort(ordenarNombresAreas);

    /*
  |--------------------------------------------------------------------------
  | Si no existen áreas, se mantiene Dagre como respaldo.
  |--------------------------------------------------------------------------
  */

    if (nombresAreas.length === 0) {
      return aplicarDistribucionDagre(nodes, edges);
    }

    /*
|--------------------------------------------------------------------------
| Calcular el tamaño necesario para cada área.
|--------------------------------------------------------------------------
*/

    const bloquesAreas = nombresAreas.map((nombreArea) => {
      const nodosArea = nodosPorArea.get(nombreArea) || [];

      return calcularBloqueArea(nombreArea, nodosArea);
    });

    /*
|--------------------------------------------------------------------------
| Calcular el ancho total que ocuparán todas las áreas.
|--------------------------------------------------------------------------
*/

    const anchoTotalAreas =
      bloquesAreas.reduce((total, bloque) => total + bloque.ancho, 0) +
      Math.max(0, bloquesAreas.length - 1) * SEPARACION_ENTRE_AREAS;

    /*
|--------------------------------------------------------------------------
| Guardar las posiciones calculadas para cada nodo.
|--------------------------------------------------------------------------
*/

    const posiciones = new Map();
    const nodosTitulosAreas = [];

    let posicionXActual = MARGEN_HORIZONTAL;
    /*
|--------------------------------------------------------------------------
| Posicionar cada bloque de área de izquierda a derecha.
|--------------------------------------------------------------------------
*/

    bloquesAreas.forEach((bloque) => {
      /*
  |--------------------------------------------------------------------------
  | Crear el título visual del área.
  |--------------------------------------------------------------------------
  */

      const centroBloque = posicionXActual + bloque.ancho / 2;

      nodosTitulosAreas.push(
        crearNodoTituloArea(
          bloque.nombreArea,
          centroBloque,
          obtenerColorPorNombreArea(bloque.nombreArea),
        ),
      );
      function obtenerColorPorNombreArea(nombreArea) {
        if (nombreAreaSeleccionada && nombreArea === nombreAreaSeleccionada) {
          const primerColor = coloresPorResponsable.values().next().value;

          return primerColor || COLORES_AREAS[0];
        }

        const responsable = responsablesArea.find(
          (empleado) => obtenerNombreRama(empleado) === nombreArea,
        );

        if (!responsable) {
          return COLORES_AREAS[0];
        }

        return (
          coloresPorResponsable.get(String(responsable.idEmpleado)) ||
          COLORES_AREAS[0]
        );
      }

      bloquesAreas.forEach((bloque) => {
        const centroBloque = posicionXActual + bloque.ancho / 2;

        nodosTitulosAreas.push(
          crearNodoTituloArea(
            bloque.nombreArea,
            centroBloque,
            obtenerColorPorNombreArea(bloque.nombreArea),
          ),
        );

        posicionarBloqueArea(bloque, posicionXActual, posiciones);

        posicionXActual += bloque.ancho + SEPARACION_ENTRE_AREAS;
      });
      /*
  |--------------------------------------------------------------------------
  | Posicionar los empleados del área.
  |--------------------------------------------------------------------------
  */

      posicionarBloqueArea(bloque, posicionXActual, posiciones);

      posicionXActual += bloque.ancho + SEPARACION_ENTRE_AREAS;
    });

    /*
|--------------------------------------------------------------------------
| Posicionar Dirección centrada sobre todas las áreas.
|--------------------------------------------------------------------------
*/

    posicionarDireccion(
      nodosDireccion,
      MARGEN_HORIZONTAL,
      anchoTotalAreas,
      posiciones,
    );

    /*
|--------------------------------------------------------------------------
| Aplicar las posiciones a los nodos de React Flow.
|--------------------------------------------------------------------------
*/

    const nodesPosicionados = nodes.map((node) => {
      const position = posiciones.get(node.id);

      /*
  |--------------------------------------------------------------------------
  | Si por algún motivo un nodo no recibió posición,
  | usamos una posición segura.
  |--------------------------------------------------------------------------
  */

      const posicionFinal = position || {
        x: MARGEN_HORIZONTAL,
        y: MARGEN_VERTICAL,
      };

      return {
        ...node,

        position: {
          ...posicionFinal,
        },

        positionOriginal: {
          ...posicionFinal,
        },

        data: {
          ...node.data,

          positionOriginal: {
            ...posicionFinal,
          },
        },
      };
    });

    return {
      nodes: [...nodosTitulosAreas, ...nodesPosicionados],
      edges,
    };
  } /* ============================================================
   CALCULAR BLOQUE DE ÁREA
============================================================ */
  /* ============================================================
   CREAR TÍTULO DEL ÁREA
============================================================ */

  function crearNodoTituloArea(nombreArea, centroX, colorArea) {
    const idArea = normalizarTexto(nombreArea)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return {
      id: `titulo-area-${idArea || "sin-area"}`,

      type: "default",

      position: {
        x: centroX - ANCHO_TITULO_AREA / 2,

        y: MARGEN_VERTICAL + ALTO_NODO + ESPACIO_TITULO_AREA,
      },

      data: {
        label: nombreArea,
        esTituloArea: true,
        area: nombreArea,
        colorArea,
      },

      width: ANCHO_TITULO_AREA,
      height: ALTO_TITULO_AREA,

      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
      focusable: false,

      style: {
        width: ANCHO_TITULO_AREA,
        height: ALTO_TITULO_AREA,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        padding: "10px 18px",

        borderRadius: "12px",

        border: `3px solid ${colorArea}`,

        background: `${colorArea}18`,

        color: colorArea,

        fontSize: "18px",
        fontWeight: "700",
        textAlign: "center",

        boxShadow: `0 4px 12px ${colorArea}35`,

        pointerEvents: "none",
      },
    };
  }
  function calcularBloqueArea(nombreArea, nodes) {
    const nodosPorNivel = new Map();

    /*
  |--------------------------------------------------------------------------
  | Agrupar los nodos del área por nivel jerárquico.
  |--------------------------------------------------------------------------
  */

    nodes.forEach((node) => {
      const nivel = obtenerNivelVisual(node.data?.empleado);

      if (!nodosPorNivel.has(nivel)) {
        nodosPorNivel.set(nivel, []);
      }

      nodosPorNivel.get(nivel).push(node);
    });

    /*
  |--------------------------------------------------------------------------
  | Ordenar los empleados dentro de cada nivel.
  |--------------------------------------------------------------------------
  */

    nodosPorNivel.forEach((nodosNivel) => {
      nodosNivel.sort((nodeA, nodeB) =>
        ordenarEmpleados(
          nodeA.data?.empleado || {},
          nodeB.data?.empleado || {},
        ),
      );
    });

    /*
  |--------------------------------------------------------------------------
  | Buscar la fila que tenga más empleados.
  | Esa fila determina el ancho mínimo del área.
  |--------------------------------------------------------------------------
  */

    const cantidadMaximaPorNivel = Math.max(
      1,
      ...[...nodosPorNivel.values()].map((nodosNivel) => nodosNivel.length),
    );

    const ancho =
      cantidadMaximaPorNivel * ANCHO_NODO +
      Math.max(0, cantidadMaximaPorNivel - 1) * SEPARACION_HORIZONTAL;

    return {
      nombreArea,
      nodes,
      nodosPorNivel,
      ancho,
    };
  }

  /* ============================================================
   POSICIONAR BLOQUE DE ÁREA
============================================================ */

  function posicionarBloqueArea(bloque, inicioX, posiciones) {
    const nivelesOrdenados = [...bloque.nodosPorNivel.keys()].sort(
      (nivelA, nivelB) => nivelA - nivelB,
    );

    nivelesOrdenados.forEach((nivel) => {
      const nodosNivel = bloque.nodosPorNivel.get(nivel) || [];

      /*
    |--------------------------------------------------------------------------
    | Calcular el ancho real de esta fila.
    |--------------------------------------------------------------------------
    */

      const anchoFila =
        nodosNivel.length * ANCHO_NODO +
        Math.max(0, nodosNivel.length - 1) * SEPARACION_HORIZONTAL;

      /*
    |--------------------------------------------------------------------------
    | Centrar la fila dentro del ancho total del área.
    |--------------------------------------------------------------------------
    */

      const inicioFilaX = inicioX + (bloque.ancho - anchoFila) / 2;

      nodosNivel.forEach((node, index) => {
        posiciones.set(node.id, {
          x: inicioFilaX + index * (ANCHO_NODO + SEPARACION_HORIZONTAL),

          y:
            MARGEN_VERTICAL +
            ALTO_NODO +
            ALTO_TITULO_AREA +
            ESPACIO_TITULO_AREA * 2 +
            (nivel - 1) * (ALTO_NODO + SEPARACION_VERTICAL),
        });
      });
    });
  }

  /* ============================================================
   POSICIONAR DIRECCIÓN
============================================================ */

  function posicionarDireccion(
    nodosDireccion,
    inicioAreasX,
    anchoTotalAreas,
    posiciones,
  ) {
    if (!Array.isArray(nodosDireccion) || nodosDireccion.length === 0) {
      return;
    }

    /*
  |--------------------------------------------------------------------------
  | Ordenar los directores.
  |--------------------------------------------------------------------------
  */

    const nodosOrdenados = [...nodosDireccion].sort((nodeA, nodeB) =>
      ordenarEmpleados(nodeA.data?.empleado || {}, nodeB.data?.empleado || {}),
    );

    /*
  |--------------------------------------------------------------------------
  | Calcular el ancho total de la fila de Dirección.
  |--------------------------------------------------------------------------
  */

    const anchoFila =
      nodosOrdenados.length * ANCHO_NODO +
      Math.max(0, nodosOrdenados.length - 1) * SEPARACION_HORIZONTAL;

    /*
  |--------------------------------------------------------------------------
  | Obtener el centro de todas las áreas.
  |--------------------------------------------------------------------------
  */

    const centroAreas = inicioAreasX + anchoTotalAreas / 2;

    const inicioDireccionX = centroAreas - anchoFila / 2;

    /*
  |--------------------------------------------------------------------------
  | Colocar Dirección arriba y centrada.
  |--------------------------------------------------------------------------
  */

    nodosOrdenados.forEach((node, index) => {
      posiciones.set(node.id, {
        x: inicioDireccionX + index * (ANCHO_NODO + SEPARACION_HORIZONTAL),

        y: MARGEN_VERTICAL,
      });
    });
  }

  /* ============================================================
   AGRUPAR NODOS POR ÁREA
============================================================ */

  function agruparNodosPorArea(nodes) {
    const grupos = new Map();

    nodes.forEach((node) => {
      const empleado = node.data?.empleado;

      if (!empleado) {
        return;
      }

      if (
        directorId !== null &&
        String(empleado.idEmpleado) === String(directorId)
      ) {
        return;
      }

      const responsableArea = obtenerResponsableArea(
        empleado,
        mapaEmpleados,
        directorId,
      );

      const nombreArea =
        limpiarTexto(opciones?.nombreArea) ||
        obtenerNombreRama(responsableArea);

      if (!grupos.has(nombreArea)) {
        grupos.set(nombreArea, []);
      }

      grupos.get(nombreArea).push(node);
    });

    return grupos;
  }

  return {
    nodes: distribucion.nodes,
    edges: distribucion.edges,
    errores: eliminarDuplicados(errores),
  };
}
/* ============================================================
   CREAR COLORES POR ÁREA
============================================================ */
/**
 * Obtiene el nombre del área.
 *
 * Si el empleado no tiene área guardada, se utiliza como área
 * la rama principal que depende de Dirección.
 */
function obtenerAreaOrganigrama(empleado, empleados) {
  const areaGuardada = limpiarTexto(
    empleado?.area ||
      empleado?.departamento ||
      empleado?.sector ||
      empleado?.gerencia ||
      empleado?.division ||
      empleado?.unidad,
  );

  if (areaGuardada) {
    return areaGuardada;
  }

  const mapaEmpleados = new Map(
    empleados.map((item) => [String(item.idEmpleado), item]),
  );

  let actual = empleado;
  const visitados = new Set();

  while (actual?.supervisorId !== null && actual?.supervisorId !== undefined) {
    const idActual = String(actual.idEmpleado);

    if (visitados.has(idActual)) {
      break;
    }

    visitados.add(idActual);

    const supervisor = mapaEmpleados.get(String(actual.supervisorId));

    if (!supervisor) {
      break;
    }

    /*
     * Si el supervisor no tiene otro supervisor,
     * "actual" es el responsable principal de esa rama.
     */
    if (
      supervisor.supervisorId === null ||
      supervisor.supervisorId === undefined ||
      String(supervisor.supervisorId).trim() === ""
    ) {
      return (
        limpiarTexto(actual.area) ||
        limpiarTexto(actual.cargo) ||
        limpiarTexto(actual.puesto) ||
        limpiarTexto(actual.nombre) ||
        `Área ${actual.idEmpleado}`
      );
    }

    actual = supervisor;
  }

  return (
    limpiarTexto(empleado.cargo) ||
    limpiarTexto(empleado.puesto) ||
    limpiarTexto(empleado.nombre) ||
    "Sin área"
  );
}
function crearMapaColoresAreas(empleados, todosLosEmpleados = empleados) {
  const nombresAreas = [
    ...new Set(
      empleados.map((empleado) =>
        obtenerAreaOrganigrama(empleado, todosLosEmpleados),
      ),
    ),
  ].sort(ordenarNombresAreas);

  const mapa = new Map();

  let indiceColor = 0;

  nombresAreas.forEach((nombreArea) => {
    const areaNormalizada = normalizarTexto(nombreArea);

    if (
      areaNormalizada === "direccion general" ||
      areaNormalizada === "direccion" ||
      areaNormalizada === "presidencia" ||
      areaNormalizada === "directorio"
    ) {
      mapa.set(nombreArea, "#334155");
      return;
    }

    mapa.set(nombreArea, COLORES_AREAS[indiceColor % COLORES_AREAS.length]);

    indiceColor += 1;
  });

  return mapa;
}
/* ============================================================
   ORDENAR EMPLEADOS POR ÁREA
============================================================ */

function ordenarEmpleadosPorArea(empleados) {
  const grupos = new Map();

  empleados.forEach((empleado) => {
    const area = obtenerNombreArea(empleado);

    if (!grupos.has(area)) {
      grupos.set(area, []);
    }

    grupos.get(area).push(empleado);
  });

  const nombresAreas = [...grupos.keys()].sort(ordenarNombresAreas);

  const resultado = [];

  nombresAreas.forEach((nombreArea) => {
    const empleadosArea = grupos.get(nombreArea) || [];

    empleadosArea.sort(ordenarEmpleados);

    resultado.push(...empleadosArea);
  });

  return resultado;
}

/* ============================================================
   OBTENER NOMBRE DEL ÁREA
============================================================ */

function obtenerNombreArea(empleado) {
  const area = limpiarTexto(
    empleado?.departamento ||
      empleado?.sector ||
      empleado?.gerencia ||
      empleado?.division ||
      empleado?.unidad ||
      empleado?.area,
  );

  return area || "Sin área";
}

/* ============================================================
   ORDENAR NOMBRES DE ÁREAS
============================================================ */

function ordenarNombresAreas(areaA, areaB) {
  const areaNormalizadaA = normalizarTexto(areaA);
  const areaNormalizadaB = normalizarTexto(areaB);

  const areasDireccion = [
    "direccion general",
    "direccion",
    "presidencia",
    "directorio",
  ];

  const esDireccionA = areasDireccion.includes(areaNormalizadaA);
  const esDireccionB = areasDireccion.includes(areaNormalizadaB);

  if (esDireccionA && !esDireccionB) {
    return -1;
  }

  if (!esDireccionA && esDireccionB) {
    return 1;
  }

  if (areaNormalizadaA === "sin area") {
    return 1;
  }

  if (areaNormalizadaB === "sin area") {
    return -1;
  }

  return areaA.localeCompare(areaB, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

/* ============================================================
   NORMALIZAR TEXTO PARA COMPARACIONES
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

  /* ============================================================
     REGISTRAR NODOS EN DAGRE
  ============================================================ */

  nodes.forEach((node) => {
    grafo.setNode(node.id, {
      width: ANCHO_NODO,
      height: ALTO_NODO,
    });
  });

  /* ============================================================
     REGISTRAR CONEXIONES EN DAGRE
  ============================================================ */

  edges.forEach((edge) => {
    grafo.setEdge(edge.source, edge.target);
  });

  /* ============================================================
     CALCULAR DISTRIBUCIÓN
  ============================================================ */

  dagre.layout(grafo);

  /* ============================================================
     CONVERTIR POSICIONES A REACT FLOW
  ============================================================ */

  const nodesPosicionados = nodes.map((node) => {
    const posicion = grafo.node(node.id);

    if (!posicion) {
      return {
        ...node,

        positionOriginal: {
          ...node.position,
        },

        data: {
          ...node.data,

          positionOriginal: {
            ...node.position,
          },
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
      | Todos los empleados del mismo nivel jerárquico quedan a la misma altura.
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
      | Si el usuario arrastra el nodo y no se encuentra un supervisor válido,
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

    puesto: limpiarTexto(empleado?.puesto || empleado?.cargo),

    areaId: limpiarTexto(empleado?.areaId),

    puestoAreaId: limpiarTexto(empleado?.puestoAreaId),

    area: limpiarTexto(
      empleado?.departamento ||
        empleado?.sector ||
        empleado?.gerencia ||
        empleado?.division ||
        empleado?.unidad ||
        empleado?.area,
    ),

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
   MOSTRAR U OCULTAR EMPLEADO
============================================================ */

function debeMostrarEmpleado(empleado) {
  if (!empleado || empleado.activo === false) {
    return false;
  }

  const nombreNormalizado = normalizarTexto(empleado.nombre);

  if (!nombreNormalizado) {
    return false;
  }

  if (NOMBRES_OCULTOS.has(nombreNormalizado)) {
    return false;
  }

  return true;
}

/* ============================================================
   ORDENAR EMPLEADOS
============================================================ */

/**
 * Ordena primero por nivel jerárquico.
 * Luego por supervisor, por orden manual y finalmente por nombre.
 */
function ordenarEmpleados(a, b) {
  const nivelA = obtenerNivelVisual(a);
  const nivelB = obtenerNivelVisual(b);

  if (nivelA !== nivelB) {
    return nivelA - nivelB;
  }

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

/* ============================================================
   OBTENER NIVEL VISUAL
============================================================ */

function obtenerNivelVisual(empleado) {
  const nivelGuardado = Number(empleado?.nivel);

  /*
  |--------------------------------------------------------------------------
  | Si tiene un nivel numérico cargado manualmente, se respeta.
  |--------------------------------------------------------------------------
  |
  | nivel 1 = dirección
  | nivel 2 = gerencia
  | nivel 3 = jefatura
  | nivel 4 = supervisión
  | nivel 5 = coordinación
  | nivel 6 = analistas y personal
  |
  */

  if (Number.isInteger(nivelGuardado) && nivelGuardado > 0) {
    return nivelGuardado - 1;
  }

  const cargo = normalizarCargo(
    empleado?.cargo || empleado?.puesto || empleado?.jerarquia || empleado?.rol,
  );

  /*
  |--------------------------------------------------------------------------
  | Nivel 1: Dirección
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("director ejecutivo") ||
    cargo.includes("director general") ||
    cargo === "director" ||
    cargo === "directora" ||
    cargo.includes("presidente") ||
    cargo.includes("presidenta")
  ) {
    return 0;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 2: Gerencias
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("gerente") ||
    cargo.includes("gerenta") ||
    cargo.includes("gerencia")
  ) {
    return 1;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 3: Jefaturas
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("jefe") ||
    cargo.includes("jefa") ||
    cargo.includes("jefatura")
  ) {
    return 2;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 4: Supervisores, responsables y encargados
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("supervisor") ||
    cargo.includes("supervisora") ||
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
    cargo.includes("coordinacion") ||
    cargo.includes("referente")
  ) {
    return 4;
  }

  /*
  |--------------------------------------------------------------------------
  | Nivel 6: Analistas, administrativos, operarios y personal
  |--------------------------------------------------------------------------
  */

  if (
    cargo.includes("analista") ||
    cargo.includes("administrativo") ||
    cargo.includes("administrativa") ||
    cargo.includes("operario") ||
    cargo.includes("operaria") ||
    cargo.includes("asistente") ||
    cargo.includes("auxiliar") ||
    cargo.includes("tecnico") ||
    cargo.includes("tecnica")
  ) {
    return 5;
  }

  /*
  |--------------------------------------------------------------------------
  | Cualquier cargo no reconocido se muestra en el último nivel.
  |--------------------------------------------------------------------------
  */

  return 5;
}

/* ============================================================
   NORMALIZAR CARGO
============================================================ */

function normalizarCargo(valor) {
  return normalizarTexto(valor);
}
function crearMapaEmpleados(empleados) {
  return new Map(
    empleados.map((empleado) => [String(empleado.idEmpleado), empleado]),
  );
}

function obtenerDirectorPrincipal(empleados) {
  return (
    empleados.find(
      (empleado) =>
        empleado.supervisorId === null ||
        empleado.supervisorId === undefined ||
        String(empleado.supervisorId).trim() === "",
    ) || null
  );
}

/*
 * Busca cuál es el primer empleado que depende directamente
 * del director dentro de la rama del empleado recibido.
 */
function obtenerResponsableArea(empleado, mapaEmpleados, directorId) {
  if (!empleado) {
    return null;
  }

  let actual = empleado;
  const visitados = new Set();

  while (actual) {
    const actualId = String(actual.idEmpleado);

    if (visitados.has(actualId)) {
      return null;
    }

    visitados.add(actualId);

    const supervisorId =
      actual.supervisorId === null || actual.supervisorId === undefined
        ? null
        : String(actual.supervisorId);

    /*
     * Si depende directamente del director,
     * este empleado es el responsable del área.
     */
    if (supervisorId === String(directorId)) {
      return actual;
    }

    if (supervisorId === null) {
      return null;
    }

    actual = mapaEmpleados.get(supervisorId);
  }

  return null;
}

function obtenerNombreRama(responsable) {
  if (!responsable) {
    return "Dirección";
  }

  return (
    limpiarTexto(responsable.area) ||
    limpiarTexto(responsable.departamento) ||
    limpiarTexto(responsable.sector) ||
    limpiarTexto(responsable.gerencia) ||
    limpiarTexto(responsable.cargo) ||
    limpiarTexto(responsable.puesto) ||
    limpiarTexto(responsable.nombre) ||
    `Área ${responsable.idEmpleado}`
  );
}
