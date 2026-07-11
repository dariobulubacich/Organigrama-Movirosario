import { useEffect, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./NodoEmpleado.css";

export default function NodoEmpleado({ data, selected }) {
  const empleado = data?.empleado ?? {};

  const nombre = limpiarTexto(empleado.nombre) || "Sin nombre";

  const cargo = limpiarTexto(empleado.cargo || empleado.puesto) || "Sin cargo";

  const area = limpiarTexto(empleado.area);
  const foto = limpiarTexto(empleado.foto);

  const [fotoConError, setFotoConError] = useState(false);

  useEffect(() => {
    setFotoConError(false);
  }, [foto]);

  const mostrarFoto = Boolean(foto) && !fotoConError;

  const jerarquia = useMemo(
    () => obtenerJerarquia(empleado.nivel, cargo),
    [empleado.nivel, cargo],
  );

  const iniciales = obtenerIniciales(nombre);

  const idEmpleado = empleado.idEmpleado ?? empleado.id ?? "Sin ID";

  const tieneHijos = data?.tieneHijos === true;

  const expandido = data?.expandido === true;

  const handleExpandir = (event) => {
    event.stopPropagation();

    if (tieneHijos && typeof data?.onToggleExpandir === "function") {
      data.onToggleExpandir(empleado.idEmpleado);
    }
  };

  return (
    <article
      className={[
        "nodo-empleado",

        tieneHijos ? "nodo-empleado--con-rama" : "nodo-empleado--sin-rama",

        expandido ? "nodo-empleado--rama-abierta" : "",

        selected ? "nodo-empleado--seleccionado" : "",

        data?.esSupervisorDestino ? "nodo-empleado--destino" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--nodo-color": jerarquia.color,

        "--nodo-color-suave": jerarquia.colorSuave,

        "--nodo-color-texto": jerarquia.colorTexto,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="nodo-empleado__handle"
        isConnectable={false}
      />

      <div className="nodo-empleado__franja" />

      {tieneHijos && (
        <div className="nodo-empleado__marca-rama">
          {expandido ? "Rama abierta" : "Tiene subordinados"}
        </div>
      )}

      <div className="nodo-empleado__contenido">
        <div className="nodo-empleado__foto-contenedor">
          {mostrarFoto ? (
            <img
              className="nodo-empleado__foto"
              src={foto}
              alt={nombre}
              onError={() => setFotoConError(true)}
            />
          ) : (
            <div className="nodo-empleado__iniciales">{iniciales}</div>
          )}
        </div>

        <div className="nodo-empleado__datos">
          <span className="nodo-empleado__nivel">{jerarquia.etiqueta}</span>

          <h3 title={nombre}>{nombre}</h3>

          <p className="nodo-empleado__cargo" title={cargo}>
            {cargo}
          </p>

          {area && (
            <p className="nodo-empleado__area" title={area}>
              {area}
            </p>
          )}
        </div>
      </div>

      <div className="nodo-empleado__pie">
        <span>
          ID: <strong>{String(idEmpleado)}</strong>
        </span>

        {tieneHijos && (
          <span className="nodo-empleado__estado-rama">
            {expandido ? "Expandido" : "Contraído"}
          </span>
        )}
      </div>

      {tieneHijos && (
        <button
          type="button"
          className="nodo-empleado__expandir nodrag"
          onClick={handleExpandir}
          title={expandido ? "Cerrar subordinados" : "Mostrar subordinados"}
          aria-label={
            expandido ? "Cerrar subordinados" : "Mostrar subordinados"
          }
        >
          {expandido ? "−" : "+"}
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="nodo-empleado__handle"
        isConnectable={false}
      />
    </article>
  );
}

/* ============================================================
   JERARQUÍA Y COLORES
============================================================ */

function obtenerJerarquia(nivel, cargo) {
  const nivelNumero = Number(nivel);

  if (nivelNumero === 1) {
    return {
      etiqueta: "Dirección",
      color: "#1d4ed8",
      colorSuave: "#dbeafe",
      colorTexto: "#1e3a8a",
    };
  }

  if (nivelNumero === 2) {
    return {
      etiqueta: "Gerencia",
      color: "#15803d",
      colorSuave: "#dcfce7",
      colorTexto: "#14532d",
    };
  }

  if (nivelNumero === 3) {
    return {
      etiqueta: "Jefatura",
      color: "#7e22ce",
      colorSuave: "#f3e8ff",
      colorTexto: "#581c87",
    };
  }

  if (nivelNumero === 4) {
    return {
      etiqueta: "Supervisión",
      color: "#c2410c",
      colorSuave: "#ffedd5",
      colorTexto: "#7c2d12",
    };
  }

  if (nivelNumero === 5) {
    return {
      etiqueta: "Coordinación",
      color: "#0369a1",
      colorSuave: "#e0f2fe",
      colorTexto: "#0c4a6e",
    };
  }

  const cargoNormalizado = normalizarTexto(cargo);

  if (
    cargoNormalizado.includes("director ejecutivo") ||
    cargoNormalizado.includes("director general") ||
    cargoNormalizado === "director" ||
    cargoNormalizado.includes("presidente")
  ) {
    return {
      etiqueta: "Dirección",
      color: "#1d4ed8",
      colorSuave: "#dbeafe",
      colorTexto: "#1e3a8a",
    };
  }

  if (cargoNormalizado.includes("gerente")) {
    return {
      etiqueta: "Gerencia",
      color: "#15803d",
      colorSuave: "#dcfce7",
      colorTexto: "#14532d",
    };
  }

  if (cargoNormalizado.includes("jefe") || cargoNormalizado.includes("jefa")) {
    return {
      etiqueta: "Jefatura",
      color: "#7e22ce",
      colorSuave: "#f3e8ff",
      colorTexto: "#581c87",
    };
  }

  if (
    cargoNormalizado.includes("supervisor") ||
    cargoNormalizado.includes("responsable") ||
    cargoNormalizado.includes("encargado") ||
    cargoNormalizado.includes("encargada")
  ) {
    return {
      etiqueta: "Supervisión",
      color: "#c2410c",
      colorSuave: "#ffedd5",
      colorTexto: "#7c2d12",
    };
  }

  if (
    cargoNormalizado.includes("coordinador") ||
    cargoNormalizado.includes("coordinadora") ||
    cargoNormalizado.includes("referente")
  ) {
    return {
      etiqueta: "Coordinación",
      color: "#0369a1",
      colorSuave: "#e0f2fe",
      colorTexto: "#0c4a6e",
    };
  }

  return {
    etiqueta: "Empleado",
    color: "#475569",
    colorSuave: "#f1f5f9",
    colorTexto: "#334155",
  };
}

/* ============================================================
   INICIALES
============================================================ */

function obtenerIniciales(nombre) {
  const partes = limpiarTexto(nombre).split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/* ============================================================
   TEXTOS
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
