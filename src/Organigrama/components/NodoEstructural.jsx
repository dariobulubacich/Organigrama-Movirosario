import { Handle, Position } from "@xyflow/react";
import "./NodoEstructural.css";

export default function NodoEstructural({ data }) {
  const {
    tipo,
    nombreSector = "",
    nombrePersona = "",
    opcionesGerencias = [],
    gerenciaId = "",
    onCambiarCampo,
    onEliminar,
  } = data;

  const esDirectorEjecutivo = tipo === "directorEjecutivo";
  const esGerencia = tipo === "gerencia";
  const esJefatura = tipo === "jefatura";

  const tituloTipo = {
    directorEjecutivo: "Director Ejecutivo",
    director: "Director",
    gerencia: "Gerencia",
    jefatura: "Jefatura",
  }[tipo];

  return (
    <div className={`nodo-estructural nodo-estructural--${tipo}`}>
      {!esDirectorEjecutivo && (
        <Handle type="target" position={Position.Top} isConnectable={false} />
      )}

      <div className="nodo-estructural__encabezado">
        <div className="nodo-estructural__tipo">{tituloTipo}</div>

        {(esGerencia || esJefatura) && onEliminar && (
          <button
            type="button"
            className="nodo-estructural__eliminar nodrag"
            onClick={onEliminar}
          >
            ×
          </button>
        )}
      </div>

      <label className="nodo-estructural__campo">
        <span>Nombre del sector</span>

        <input
          className="nodrag"
          type="text"
          value={nombreSector}
          onChange={(event) =>
            onCambiarCampo("nombreSector", event.target.value)
          }
        />
      </label>

      <label className="nodo-estructural__campo">
        <span>Nombre de la persona</span>

        <input
          className="nodrag"
          type="text"
          value={nombrePersona}
          onChange={(event) =>
            onCambiarCampo("nombrePersona", event.target.value)
          }
        />
      </label>

      {esJefatura && (
        <label className="nodo-estructural__campo">
          <span>Depende de la gerencia</span>

          <select
            className="nodrag"
            value={gerenciaId}
            onChange={(event) =>
              onCambiarCampo("gerenciaId", event.target.value)
            }
          >
            <option value="">Sin gerencia asignada</option>

            {opcionesGerencias.map((gerencia) => (
              <option key={gerencia.id} value={gerencia.id}>
                {gerencia.nombreSector || gerencia.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {!esJefatura && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={false}
        />
      )}
    </div>
  );
}
