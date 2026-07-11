import { useEffect, useState } from "react";
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

  const colorNivel = obtenerColorNivel(empleado.nivel, cargo);

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
      className={`nodo-empleado ${
        selected ? "nodo-empleado--seleccionado" : ""
      } ${data?.esSupervisorDestino ? "nodo-empleado--destino" : ""}`}
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

      {tieneHijos && (
        <button
          type="button"
          className={`nodo-empleado__expandir nodrag ${
            expandido ? "nodo-empleado__expandir--abierto" : ""
          }`}
          onClick={handleExpandir}
          title={expandido ? "Contraer subordinados" : "Mostrar subordinados"}
          aria-label={
            expandido ? "Contraer subordinados" : "Mostrar subordinados"
          }
        >
          {expandido ? "−" : "+"}
        </button>
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
          <span>{expandido ? "Rama abierta" : "Rama cerrada"}</span>
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

function obtenerColorNivel(nivel, cargo) {
  const nivelNormalizado = normalizarTexto(nivel);

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

  const cargoNormalizado = normalizarTexto(cargo);

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

  if (
    cargoNormalizado.includes("supervisor") ||
    cargoNormalizado.includes("encargado")
  ) {
    return "#c2410c";
  }

  if (cargoNormalizado.includes("coordinador")) {
    return "#7e22ce";
  }

  return "#475569";
}

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
