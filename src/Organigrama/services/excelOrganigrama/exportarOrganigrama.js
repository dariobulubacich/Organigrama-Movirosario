import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const MARGEN_PDF_MM = 10;
const ANCHO_MAXIMO_CAPTURA = 16000;
const ALTO_MAXIMO_CAPTURA = 16000;

/* ============================================================
   EXPORTAR ORGANIGRAMA A PDF
============================================================ */

/**
 * Convierte el contenido completo de React Flow en un PDF.
 *
 * @param {Object} opciones
 * @param {HTMLElement} opciones.elemento
 * Elemento DOM correspondiente a `.react-flow__viewport`.
 *
 * @param {Object} opciones.limites
 * Límites calculados mediante `getNodesBounds(nodes)`.
 *
 * @param {Object} opciones.viewport
 * Viewport calculado mediante `getViewportForBounds(...)`.
 *
 * @param {string} opciones.nombreArchivo
 * Nombre del archivo PDF.
 *
 * @param {string} opciones.titulo
 * Título que aparecerá en la parte superior del PDF.
 */
export async function exportarOrganigramaPDF({
  elemento,
  limites,
  viewport,
  nombreArchivo = "organigrama.pdf",
  titulo = "Organigrama de la empresa",
}) {
  validarDatosExportacion({
    elemento,
    limites,
    viewport,
  });

  const anchoCaptura = Math.ceil(limites.width);
  const altoCaptura = Math.ceil(limites.height);

  validarDimensionesCaptura(anchoCaptura, altoCaptura);

  const estilosOriginales = guardarEstilosOriginales(elemento);

  try {
    prepararElementoParaCaptura({
      elemento,
      anchoCaptura,
      altoCaptura,
      viewport,
    });

    await esperarRenderizado();

    const dataUrl = await toPng(elemento, {
      backgroundColor: "#ffffff",

      width: anchoCaptura,

      height: altoCaptura,

      pixelRatio: calcularPixelRatio(anchoCaptura, altoCaptura),

      cacheBust: true,

      skipFonts: false,

      filter: filtrarElementoCaptura,

      style: {
        width: `${anchoCaptura}px`,
        height: `${altoCaptura}px`,
        transform: crearTransformacion(viewport),
        transformOrigin: "0 0",
      },
    });

    const configuracion = calcularConfiguracionPDF({
      anchoImagenPx: anchoCaptura,
      altoImagenPx: altoCaptura,
    });

    const pdf = new jsPDF({
      orientation: configuracion.orientacion,
      unit: "mm",
      format: configuracion.formato,
      compress: true,
    });

    agregarEncabezadoPDF(pdf, titulo);

    agregarImagenMultipagina({
      pdf,
      dataUrl,
      anchoImagenPx: anchoCaptura,
      altoImagenPx: altoCaptura,
    });

    pdf.save(normalizarNombrePDF(nombreArchivo));

    return {
      ok: true,
      nombreArchivo: normalizarNombrePDF(nombreArchivo),
      anchoCaptura,
      altoCaptura,
    };
  } catch (error) {
    console.error("Error al exportar el organigrama a PDF:", error);

    throw new Error(
      error?.message || "No se pudo exportar el organigrama a PDF.",
    );
  } finally {
    restaurarEstilosOriginales(elemento, estilosOriginales);
  }
}

/* ============================================================
   IMPRIMIR ORGANIGRAMA
============================================================ */

/**
 * Abre una ventana preparada para imprimir el organigrama completo.
 *
 * Primero convierte el organigrama en una imagen para evitar que
 * React Flow imprima solamente la parte visible en pantalla.
 */
export async function imprimirOrganigrama({
  elemento,
  limites,
  viewport,
  titulo = "Organigrama de la empresa",
}) {
  validarDatosExportacion({
    elemento,
    limites,
    viewport,
  });

  const anchoCaptura = Math.ceil(limites.width);
  const altoCaptura = Math.ceil(limites.height);

  validarDimensionesCaptura(anchoCaptura, altoCaptura);

  const estilosOriginales = guardarEstilosOriginales(elemento);

  try {
    prepararElementoParaCaptura({
      elemento,
      anchoCaptura,
      altoCaptura,
      viewport,
    });

    await esperarRenderizado();

    const dataUrl = await toPng(elemento, {
      backgroundColor: "#ffffff",

      width: anchoCaptura,

      height: altoCaptura,

      pixelRatio: calcularPixelRatio(anchoCaptura, altoCaptura),

      cacheBust: true,

      skipFonts: false,

      filter: filtrarElementoCaptura,

      style: {
        width: `${anchoCaptura}px`,
        height: `${altoCaptura}px`,
        transform: crearTransformacion(viewport),
        transformOrigin: "0 0",
      },
    });

    abrirVentanaImpresion({
      dataUrl,
      titulo,
      anchoCaptura,
      altoCaptura,
    });

    return {
      ok: true,
      anchoCaptura,
      altoCaptura,
    };
  } catch (error) {
    console.error("Error al preparar la impresión:", error);

    throw new Error(
      error?.message || "No se pudo preparar el organigrama para imprimir.",
    );
  } finally {
    restaurarEstilosOriginales(elemento, estilosOriginales);
  }
}

/* ============================================================
   AGREGAR IMAGEN AL PDF
============================================================ */

function agregarImagenMultipagina({
  pdf,
  dataUrl,
  anchoImagenPx,
  altoImagenPx,
}) {
  const anchoPagina = pdf.internal.pageSize.getWidth();

  const altoPagina = pdf.internal.pageSize.getHeight();

  const espacioSuperior = 20;
  const espacioInferior = MARGEN_PDF_MM;

  const anchoDisponible = anchoPagina - MARGEN_PDF_MM * 2;

  const altoDisponible = altoPagina - espacioSuperior - espacioInferior;

  const altoImagenEscalada = (altoImagenPx * anchoDisponible) / anchoImagenPx;

  /*
  |--------------------------------------------------------------------------
  | Si el organigrama entra en una sola hoja
  |--------------------------------------------------------------------------
  */

  if (altoImagenEscalada <= altoDisponible) {
    pdf.addImage(
      dataUrl,
      "PNG",
      MARGEN_PDF_MM,
      espacioSuperior,
      anchoDisponible,
      altoImagenEscalada,
      undefined,
      "FAST",
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Organigrama en varias páginas
  |--------------------------------------------------------------------------
  |
  | Se coloca la misma imagen desplazada verticalmente.
  | Cada página muestra una parte distinta.
  |--------------------------------------------------------------------------
  */

  let desplazamiento = 0;
  let numeroPagina = 0;

  while (desplazamiento < altoImagenEscalada) {
    if (numeroPagina > 0) {
      pdf.addPage();
      agregarEncabezadoPDF(pdf, "Organigrama de la empresa");
    }

    pdf.addImage(
      dataUrl,
      "PNG",
      MARGEN_PDF_MM,
      espacioSuperior - desplazamiento,
      anchoDisponible,
      altoImagenEscalada,
      undefined,
      "FAST",
    );

    agregarNumeroPagina(pdf, numeroPagina + 1);

    desplazamiento += altoDisponible;
    numeroPagina += 1;
  }
}

/* ============================================================
   ENCABEZADO PDF
============================================================ */

function agregarEncabezadoPDF(pdf, titulo) {
  const anchoPagina = pdf.internal.pageSize.getWidth();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);

  pdf.text(
    limpiarTexto(titulo) || "Organigrama de la empresa",
    anchoPagina / 2,
    10,
    {
      align: "center",
    },
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  pdf.text(formatearFechaActual(), anchoPagina - MARGEN_PDF_MM, 15, {
    align: "right",
  });
}

/* ============================================================
   NÚMERO DE PÁGINA
============================================================ */

function agregarNumeroPagina(pdf, numeroPagina) {
  const anchoPagina = pdf.internal.pageSize.getWidth();

  const altoPagina = pdf.internal.pageSize.getHeight();

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  pdf.text(
    `Página ${numeroPagina}`,
    anchoPagina - MARGEN_PDF_MM,
    altoPagina - 5,
    {
      align: "right",
    },
  );
}

/* ============================================================
   CONFIGURACIÓN DEL PDF
============================================================ */

function calcularConfiguracionPDF({ anchoImagenPx, altoImagenPx }) {
  const horizontal = anchoImagenPx >= altoImagenPx;

  return {
    orientacion: horizontal ? "landscape" : "portrait",

    /*
    |--------------------------------------------------------------------------
    | Usamos A3 para organigramas grandes.
    |--------------------------------------------------------------------------
    */

    formato: "a3",
  };
}

/* ============================================================
   PREPARAR ELEMENTO PARA CAPTURA
============================================================ */

function prepararElementoParaCaptura({
  elemento,
  anchoCaptura,
  altoCaptura,
  viewport,
}) {
  elemento.style.width = `${anchoCaptura}px`;

  elemento.style.height = `${altoCaptura}px`;

  elemento.style.transform = crearTransformacion(viewport);

  elemento.style.transformOrigin = "0 0";

  elemento.style.background = "#ffffff";
}

/* ============================================================
   CREAR TRANSFORMACIÓN
============================================================ */

function crearTransformacion(viewport) {
  const x = Number(viewport?.x) || 0;
  const y = Number(viewport?.y) || 0;
  const zoom = Number(viewport?.zoom) || 1;

  return `translate(${x}px, ${y}px) scale(${zoom})`;
}

/* ============================================================
   GUARDAR Y RESTAURAR ESTILOS
============================================================ */

function guardarEstilosOriginales(elemento) {
  return {
    width: elemento.style.width,
    height: elemento.style.height,
    transform: elemento.style.transform,
    transformOrigin: elemento.style.transformOrigin,
    background: elemento.style.background,
  };
}

function restaurarEstilosOriginales(elemento, estilos) {
  elemento.style.width = estilos.width;
  elemento.style.height = estilos.height;
  elemento.style.transform = estilos.transform;
  elemento.style.transformOrigin = estilos.transformOrigin;
  elemento.style.background = estilos.background;
}

/* ============================================================
   ABRIR VENTANA DE IMPRESIÓN
============================================================ */

function abrirVentanaImpresion({ dataUrl, titulo, anchoCaptura, altoCaptura }) {
  const ventana = window.open("", "_blank", "noopener,noreferrer");

  if (!ventana) {
    throw new Error(
      "El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes para este sitio.",
    );
  }

  const orientacion = anchoCaptura >= altoCaptura ? "landscape" : "portrait";

  ventana.document.open();

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />

        <title>${escaparHtml(
          limpiarTexto(titulo) || "Organigrama de la empresa",
        )}</title>

        <style>
          @page {
            size: A3 ${orientacion};
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
          }

          .encabezado {
            margin-bottom: 10mm;
            text-align: center;
          }

          .encabezado h1 {
            margin: 0 0 4mm;
            font-size: 18px;
          }

          .encabezado p {
            margin: 0;
            color: #555555;
            font-size: 11px;
          }

          .organigrama {
            width: 100%;
            text-align: center;
          }

          .organigrama img {
            display: block;
            width: 100%;
            height: auto;
            margin: 0 auto;
          }

          @media print {
            .organigrama img {
              max-width: 100%;
            }
          }
        </style>
      </head>

      <body>
        <header class="encabezado">
          <h1>
            ${escaparHtml(limpiarTexto(titulo) || "Organigrama de la empresa")}
          </h1>

          <p>${formatearFechaActual()}</p>
        </header>

        <main class="organigrama">
          <img
            id="imagen-organigrama"
            src="${dataUrl}"
            alt="Organigrama de la empresa"
          />
        </main>

        <script>
          const imagen =
            document.getElementById(
              "imagen-organigrama"
            );

          imagen.addEventListener(
            "load",
            function () {
              window.focus();

              window.setTimeout(
                function () {
                  window.print();
                },
                300
              );
            }
          );
        </script>
      </body>
    </html>
  `);

  ventana.document.close();
}

/* ============================================================
   FILTRAR ELEMENTOS
============================================================ */

function filtrarElementoCaptura(nodo) {
  if (!(nodo instanceof HTMLElement)) {
    return true;
  }

  return !(
    nodo.classList.contains("react-flow__controls") ||
    nodo.classList.contains("react-flow__minimap") ||
    nodo.classList.contains("react-flow__attribution") ||
    nodo.classList.contains("vista-organigrama-errores")
  );
}

/* ============================================================
   PIXEL RATIO
============================================================ */

function calcularPixelRatio(ancho, alto) {
  const pixeles = ancho * alto;

  if (pixeles > 40000000) {
    return 1;
  }

  if (pixeles > 18000000) {
    return 1.5;
  }

  return 2;
}

/* ============================================================
   VALIDACIONES
============================================================ */

function validarDatosExportacion({ elemento, limites, viewport }) {
  if (!elemento || !(elemento instanceof HTMLElement)) {
    throw new Error("No se encontró el contenido del organigrama.");
  }

  if (
    !limites ||
    !Number.isFinite(limites.width) ||
    !Number.isFinite(limites.height) ||
    limites.width <= 0 ||
    limites.height <= 0
  ) {
    throw new Error("No se pudieron calcular las dimensiones del organigrama.");
  }

  if (!viewport || !Number.isFinite(viewport.zoom)) {
    throw new Error("No se pudo preparar la vista completa del organigrama.");
  }
}

function validarDimensionesCaptura(ancho, alto) {
  if (ancho > ANCHO_MAXIMO_CAPTURA || alto > ALTO_MAXIMO_CAPTURA) {
    throw new Error(
      "El organigrama es demasiado grande para exportarlo en una sola imagen.",
    );
  }
}

/* ============================================================
   UTILIDADES
============================================================ */

function normalizarNombrePDF(nombre) {
  const nombreLimpio = limpiarTexto(nombre) || "organigrama";

  const sinExtension = nombreLimpio.replace(/\.pdf$/i, "");

  return `${sinExtension}.pdf`;
}

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

function escaparHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearFechaActual() {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function esperarRenderizado() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}
