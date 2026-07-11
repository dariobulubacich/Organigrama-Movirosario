import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const MARGEN_PDF_MM = 10;
const LADO_MAXIMO_IMAGEN = 12000;

/* ============================================================
   EXPORTAR ORGANIGRAMA A PDF
============================================================ */

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

  const dimensiones = calcularDimensionesCaptura(limites.width, limites.height);

  validarDimensionesCaptura(dimensiones.anchoCaptura, dimensiones.altoCaptura);

  const estilosOriginales = guardarEstilosOriginales(elemento);

  try {
    prepararElementoParaCaptura({
      elemento,
      anchoOriginal: dimensiones.anchoOriginal,
      altoOriginal: dimensiones.altoOriginal,
      viewport,
    });

    await esperarRenderizado();

    const dataUrl = await generarImagenOrganigrama({
      elemento,
      viewport,
      ...dimensiones,
    });

    const configuracion = calcularConfiguracionPDF({
      anchoImagenPx: dimensiones.anchoCaptura,
      altoImagenPx: dimensiones.altoCaptura,
    });

    const pdf = new jsPDF({
      orientation: configuracion.orientacion,
      unit: "mm",
      format: configuracion.formato,
      compress: true,
    });

    agregarImagenMultipagina({
      pdf,
      dataUrl,
      anchoImagenPx: dimensiones.anchoCaptura,
      altoImagenPx: dimensiones.altoCaptura,
      titulo,
    });

    const nombreFinal = normalizarNombrePDF(nombreArchivo);

    pdf.save(nombreFinal);

    return {
      ok: true,
      nombreArchivo: nombreFinal,
      anchoCaptura: dimensiones.anchoCaptura,
      altoCaptura: dimensiones.altoCaptura,
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

  const dimensiones = calcularDimensionesCaptura(limites.width, limites.height);

  validarDimensionesCaptura(dimensiones.anchoCaptura, dimensiones.altoCaptura);

  const estilosOriginales = guardarEstilosOriginales(elemento);

  try {
    prepararElementoParaCaptura({
      elemento,
      anchoOriginal: dimensiones.anchoOriginal,
      altoOriginal: dimensiones.altoOriginal,
      viewport,
    });

    await esperarRenderizado();

    const dataUrl = await generarImagenOrganigrama({
      elemento,
      viewport,
      ...dimensiones,
    });

    abrirVentanaImpresion({
      dataUrl,
      titulo,
      anchoCaptura: dimensiones.anchoCaptura,
      altoCaptura: dimensiones.altoCaptura,
    });

    return {
      ok: true,
      anchoCaptura: dimensiones.anchoCaptura,
      altoCaptura: dimensiones.altoCaptura,
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
   GENERAR IMAGEN
============================================================ */

async function generarImagenOrganigrama({
  elemento,
  viewport,
  anchoOriginal,
  altoOriginal,
  anchoCaptura,
  altoCaptura,
  escalaCaptura,
}) {
  const transformacion = crearTransformacionEscalada(viewport, escalaCaptura);

  return toPng(elemento, {
    backgroundColor: "#ffffff",

    width: anchoCaptura,
    height: altoCaptura,

    canvasWidth: anchoCaptura,
    canvasHeight: altoCaptura,

    pixelRatio: 1,

    cacheBust: true,
    skipFonts: false,

    filter: filtrarElementoCaptura,

    style: {
      width: `${anchoOriginal}px`,
      height: `${altoOriginal}px`,
      transform: transformacion,
      transformOrigin: "0 0",
      background: "#ffffff",
    },
  });
}

/* ============================================================
   CALCULAR DIMENSIONES
============================================================ */

function calcularDimensionesCaptura(ancho, alto) {
  const anchoOriginal = Math.max(1, Math.ceil(Number(ancho)));

  const altoOriginal = Math.max(1, Math.ceil(Number(alto)));

  const escalaCaptura = calcularEscalaCaptura(anchoOriginal, altoOriginal);

  const anchoCaptura = Math.max(1, Math.ceil(anchoOriginal * escalaCaptura));

  const altoCaptura = Math.max(1, Math.ceil(altoOriginal * escalaCaptura));

  return {
    anchoOriginal,
    altoOriginal,
    escalaCaptura,
    anchoCaptura,
    altoCaptura,
  };
}

/* ============================================================
   AGREGAR IMAGEN AL PDF
============================================================ */

function agregarImagenMultipagina({
  pdf,
  dataUrl,
  anchoImagenPx,
  altoImagenPx,
  titulo,
}) {
  const anchoPagina = pdf.internal.pageSize.getWidth();

  const altoPagina = pdf.internal.pageSize.getHeight();

  const espacioSuperior = 20;
  const espacioInferior = MARGEN_PDF_MM;

  const anchoDisponible = anchoPagina - MARGEN_PDF_MM * 2;

  const altoDisponible = altoPagina - espacioSuperior - espacioInferior;

  const altoImagenEscalada = (altoImagenPx * anchoDisponible) / anchoImagenPx;

  if (altoImagenEscalada <= altoDisponible) {
    agregarEncabezadoPDF(pdf, titulo);

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

    agregarNumeroPagina(pdf, 1);

    return;
  }

  let desplazamiento = 0;
  let numeroPagina = 1;

  while (desplazamiento < altoImagenEscalada) {
    if (numeroPagina > 1) {
      pdf.addPage();
    }

    agregarEncabezadoPDF(pdf, titulo);

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

    agregarNumeroPagina(pdf, numeroPagina);

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
   CONFIGURACIÓN PDF
============================================================ */

function calcularConfiguracionPDF({ anchoImagenPx, altoImagenPx }) {
  const horizontal = anchoImagenPx >= altoImagenPx;

  return {
    orientacion: horizontal ? "landscape" : "portrait",

    formato: "a3",
  };
}

/* ============================================================
   PREPARAR ELEMENTO
============================================================ */

function prepararElementoParaCaptura({
  elemento,
  anchoOriginal,
  altoOriginal,
  viewport,
}) {
  elemento.style.width = `${anchoOriginal}px`;

  elemento.style.height = `${altoOriginal}px`;

  elemento.style.transform = crearTransformacion(viewport);

  elemento.style.transformOrigin = "0 0";

  elemento.style.background = "#ffffff";
}

/* ============================================================
   TRANSFORMACIONES
============================================================ */

function crearTransformacion(viewport) {
  const x = Number(viewport?.x) || 0;

  const y = Number(viewport?.y) || 0;

  const zoom = Number(viewport?.zoom) || 1;

  return `translate(${x}px, ${y}px) scale(${zoom})`;
}

function crearTransformacionEscalada(viewport, escalaCaptura) {
  const x = (Number(viewport?.x) || 0) * escalaCaptura;

  const y = (Number(viewport?.y) || 0) * escalaCaptura;

  const zoom = (Number(viewport?.zoom) || 1) * escalaCaptura;

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
   VENTANA DE IMPRESIÓN
============================================================ */

function abrirVentanaImpresion({ dataUrl, titulo, anchoCaptura, altoCaptura }) {
  const ventana = window.open("", "_blank");

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

        <title>
          ${escaparHtml(limpiarTexto(titulo) || "Organigrama de la empresa")}
        </title>

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
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .encabezado {
            margin-bottom: 8mm;
            text-align: center;
          }

          .encabezado h1 {
            margin: 0 0 3mm;
            font-size: 18px;
          }

          .encabezado p {
            margin: 0;
            color: #555555;
            font-size: 10px;
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
            html,
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .organigrama img {
              width: 100%;
              max-width: none;
            }
          }
        </style>
      </head>

      <body>
        <header class="encabezado">
          <h1>
            ${escaparHtml(limpiarTexto(titulo) || "Organigrama de la empresa")}
          </h1>

          <p>
            ${formatearFechaActual()}
          </p>
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
                400
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
  if (typeof HTMLElement === "undefined" || !(nodo instanceof HTMLElement)) {
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
   VALIDACIONES
============================================================ */

function validarDatosExportacion({ elemento, limites, viewport }) {
  if (
    typeof HTMLElement === "undefined" ||
    !elemento ||
    !(elemento instanceof HTMLElement)
  ) {
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
  if (
    !Number.isFinite(ancho) ||
    !Number.isFinite(alto) ||
    ancho <= 0 ||
    alto <= 0
  ) {
    throw new Error("Las dimensiones del organigrama no son válidas.");
  }
}

function calcularEscalaCaptura(ancho, alto) {
  const escalaAncho = LADO_MAXIMO_IMAGEN / ancho;

  const escalaAlto = LADO_MAXIMO_IMAGEN / alto;

  return Math.min(1, escalaAncho, escalaAlto);
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
