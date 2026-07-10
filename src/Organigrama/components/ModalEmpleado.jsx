import { Handle, Position } from "@xyflow/react";

import "./NodoEmpleado.css";

export default function NodoEmpleado({ data, selected }) {
  const empleado = data?.empleado || {};

  const nombre = empleado.nombre || "Sin nombre";
  const cargo = empleado.cargo || "Sin cargo";
  const area = empleado.area || "";
  const foto = empleado.foto || "";

  const colorNivel = obtenerColorNivel(empleado.nivel, empleado.cargo);

  const iniciales = obtenerIniciales(nombre);

  return (
    <article
      className={`nodo-empleado ${
        selected ? "nodo-empleado--seleccionado" : ""
      }`}
      style={{
        "--nodo-color": colorNivel,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="nodo-empleado__handle"
        isConnectable={false}
      />

      <div className="nodo-empleado__franja" />

      <div className="nodo-empleado__contenido">
        <div className="nodo-empleado__foto-contenedor">
          {foto ? (
            <img
              className="nodo-empleado__foto"
              src={foto}
              alt={nombre}
              onError={(event) => {
                event.currentTarget.style.display = "none";

                const fallback = event.currentTarget.nextElementSibling;

                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
          ) : null}

          <div
            className="nodo-empleado__iniciales"
            style={{
              display: foto ? "none" : "flex",
            }}
          >
            {iniciales}
          </div>
        </div>

        <div className="nodo-empleado__datos">
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
          ID: <strong>{empleado.idEmpleado}</strong>
        </span>

        {empleado.interno && (
          <span>
            Int.: <strong>{empleado.interno}</strong>
          </span>
        )}
      </div>

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
   COLOR SEGÚN NIVEL O CARGO
============================================================ */

function obtenerColorNivel(nivel, cargo) {
  const nivelNormalizado = String(nivel || "")
    .trim()
    .toLowerCase();

  if (nivelNormalizado === "1" || nivelNormalizado === "director") {
    return "#1d4ed8";
  }

  if (nivelNormalizado === "2" || nivelNormalizado === "gerente") {
    return "#047857";
  }

  if (nivelNormalizado === "3" || nivelNormalizado === "supervisor") {
    return "#c2410c";
  }

  if (nivelNormalizado === "4" || nivelNormalizado === "coordinador") {
    return "#7e22ce";
  }

  const cargoNormalizado = String(cargo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    cargoNormalizado.includes("director") ||
    cargoNormalizado.includes("presidente")
  ) {
    return "#1d4ed8";
  }

  if (
    cargoNormalizado.includes("gerente") ||
    cargoNormalizado.includes("jefe")
  ) {
    return "#047857";
  }

  if (cargoNormalizado.includes("supervisor")) {
    return "#c2410c";
  }

  if (
    cargoNormalizado.includes("coordinador") ||
    cargoNormalizado.includes("coordinadora")
  ) {
    return "#7e22ce";
  }

  return "#475569";
}

/* ============================================================
   INICIALES
============================================================ */

function obtenerIniciales(nombre) {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
