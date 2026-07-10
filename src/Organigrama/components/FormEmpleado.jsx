import { useEffect, useMemo, useState } from "react";

import "./FormEmpleado.css";

const ESTADO_INICIAL = {
  idEmpleado: "",
  nombre: "",
  cargo: "",
  supervisorId: "",
  area: "",
  nivel: "",
  telefono: "",
  interno: "",
  email: "",
  foto: "",
  orden: 0,
  activo: true,
};

export default function FormEmpleado({
  empleadoEditar = null,
  empleados = [],
  guardando = false,
  onGuardar,
  onCancelar,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [errores, setErrores] = useState({});

  const esEdicion = Boolean(empleadoEditar);

  /* ============================================================
     CARGAR DATOS PARA EDICIÓN
  ============================================================ */

  useEffect(() => {
    if (!empleadoEditar) {
      setFormulario(ESTADO_INICIAL);
      setErrores({});
      return;
    }

    setFormulario({
      idEmpleado:
        empleadoEditar.idEmpleado !== null &&
        empleadoEditar.idEmpleado !== undefined
          ? String(empleadoEditar.idEmpleado)
          : "",

      nombre: empleadoEditar.nombre || "",

      cargo: empleadoEditar.cargo || empleadoEditar.puesto || "",

      supervisorId:
        empleadoEditar.supervisorId !== null &&
        empleadoEditar.supervisorId !== undefined
          ? String(empleadoEditar.supervisorId)
          : "",

      area: empleadoEditar.area || "",

      nivel:
        empleadoEditar.nivel !== null && empleadoEditar.nivel !== undefined
          ? String(empleadoEditar.nivel)
          : "",

      telefono: empleadoEditar.telefono || "",

      interno: empleadoEditar.interno || "",

      email: empleadoEditar.email || "",

      foto: empleadoEditar.foto || "",

      orden:
        empleadoEditar.orden !== null && empleadoEditar.orden !== undefined
          ? Number(empleadoEditar.orden)
          : 0,

      activo: empleadoEditar.activo !== false,
    });

    setErrores({});
  }, [empleadoEditar]);

  /* ============================================================
     EMPLEADOS DISPONIBLES COMO SUPERVISOR
  ============================================================ */

  const supervisoresDisponibles = useMemo(() => {
    return empleados
      .filter((empleado) => {
        if (empleado.activo === false) {
          return false;
        }

        if (!esEdicion) {
          return true;
        }

        return (
          String(empleado.idEmpleado) !== String(empleadoEditar?.idEmpleado)
        );
      })
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
        }),
      );
  }, [empleados, esEdicion, empleadoEditar]);

  /* ============================================================
     CAMBIOS DEL FORMULARIO
  ============================================================ */

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormulario((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errores[name]) {
      setErrores((erroresAnteriores) => ({
        ...erroresAnteriores,
        [name]: "",
      }));
    }
  };

  /* ============================================================
     GUARDAR
  ============================================================ */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (guardando) return;

    const erroresValidacion = validarFormulario(
      formulario,
      empleados,
      empleadoEditar,
    );

    setErrores(erroresValidacion);

    if (Object.keys(erroresValidacion).length > 0) {
      return;
    }

    const empleadoPreparado = {
      idEmpleado: convertirIdentificador(formulario.idEmpleado),

      nombre: limpiarTexto(formulario.nombre),

      cargo: limpiarTexto(formulario.cargo),

      supervisorId: formulario.supervisorId
        ? convertirIdentificador(formulario.supervisorId)
        : null,

      area: limpiarTexto(formulario.area),

      nivel: limpiarTexto(formulario.nivel),

      telefono: limpiarTexto(formulario.telefono),

      interno: limpiarTexto(formulario.interno),

      email: limpiarTexto(formulario.email),

      foto: limpiarTexto(formulario.foto),

      orden: Number(formulario.orden) || 0,

      activo: formulario.activo !== false,
    };

    if (typeof onGuardar === "function") {
      await onGuardar(empleadoPreparado);
    }
  };

  /* ============================================================
     CANCELAR
  ============================================================ */

  const handleCancelar = () => {
    if (guardando) return;

    setFormulario(ESTADO_INICIAL);
    setErrores({});

    if (typeof onCancelar === "function") {
      onCancelar();
    }
  };

  return (
    <form className="form-empleado" onSubmit={handleSubmit} noValidate>
      <div className="form-empleado__encabezado">
        <div>
          <h2>{esEdicion ? "Editar empleado" : "Agregar empleado"}</h2>

          <p>
            Completá los datos del empleado y su posición dentro del
            organigrama.
          </p>
        </div>
      </div>

      <div className="form-empleado__grid">
        <div className="form-empleado__campo">
          <label htmlFor="idEmpleado">
            Identificador
            <span>*</span>
          </label>

          <input
            id="idEmpleado"
            name="idEmpleado"
            type="number"
            min="1"
            step="1"
            value={formulario.idEmpleado}
            onChange={handleChange}
            disabled={guardando || esEdicion}
            className={errores.idEmpleado ? "form-empleado__input--error" : ""}
            placeholder="Ejemplo: 125"
          />

          {errores.idEmpleado && (
            <small className="form-empleado__error">{errores.idEmpleado}</small>
          )}
        </div>

        <div className="form-empleado__campo form-empleado__campo--doble">
          <label htmlFor="nombre">
            Nombre completo
            <span>*</span>
          </label>

          <input
            id="nombre"
            name="nombre"
            type="text"
            value={formulario.nombre}
            onChange={handleChange}
            disabled={guardando}
            className={errores.nombre ? "form-empleado__input--error" : ""}
            placeholder="Apellido y nombre"
          />

          {errores.nombre && (
            <small className="form-empleado__error">{errores.nombre}</small>
          )}
        </div>

        <div className="form-empleado__campo form-empleado__campo--doble">
          <label htmlFor="cargo">
            Cargo o puesto
            <span>*</span>
          </label>

          <input
            id="cargo"
            name="cargo"
            type="text"
            value={formulario.cargo}
            onChange={handleChange}
            disabled={guardando}
            className={errores.cargo ? "form-empleado__input--error" : ""}
            placeholder="Ejemplo: Gerente de Operaciones"
          />

          {errores.cargo && (
            <small className="form-empleado__error">{errores.cargo}</small>
          )}
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="supervisorId">Supervisor</label>

          <select
            id="supervisorId"
            name="supervisorId"
            value={formulario.supervisorId}
            onChange={handleChange}
            disabled={guardando}
            className={
              errores.supervisorId ? "form-empleado__input--error" : ""
            }
          >
            <option value="">Sin supervisor</option>

            {supervisoresDisponibles.map((empleado) => (
              <option key={empleado.idEmpleado} value={empleado.idEmpleado}>
                {empleado.nombre} — ID {empleado.idEmpleado}
              </option>
            ))}
          </select>

          {errores.supervisorId && (
            <small className="form-empleado__error">
              {errores.supervisorId}
            </small>
          )}
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="area">Área</label>

          <input
            id="area"
            name="area"
            type="text"
            value={formulario.area}
            onChange={handleChange}
            disabled={guardando}
            placeholder="Ejemplo: Compras"
          />
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="nivel">Nivel</label>

          <select
            id="nivel"
            name="nivel"
            value={formulario.nivel}
            onChange={handleChange}
            disabled={guardando}
          >
            <option value="">Sin definir</option>

            <option value="1">Nivel 1 — Director</option>

            <option value="2">Nivel 2 — Gerente</option>

            <option value="3">Nivel 3 — Supervisor</option>

            <option value="4">Nivel 4 — Coordinador</option>

            <option value="5">Nivel 5 — Empleado</option>
          </select>
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="orden">Orden</label>

          <input
            id="orden"
            name="orden"
            type="number"
            min="0"
            step="1"
            value={formulario.orden}
            onChange={handleChange}
            disabled={guardando}
          />
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="telefono">Teléfono</label>

          <input
            id="telefono"
            name="telefono"
            type="text"
            value={formulario.telefono}
            onChange={handleChange}
            disabled={guardando}
            placeholder="Ejemplo: 351 555 1234"
          />
        </div>

        <div className="form-empleado__campo">
          <label htmlFor="interno">Interno</label>

          <input
            id="interno"
            name="interno"
            type="text"
            value={formulario.interno}
            onChange={handleChange}
            disabled={guardando}
            placeholder="Ejemplo: 204"
          />
        </div>

        <div className="form-empleado__campo form-empleado__campo--doble">
          <label htmlFor="email">Correo electrónico</label>

          <input
            id="email"
            name="email"
            type="email"
            value={formulario.email}
            onChange={handleChange}
            disabled={guardando}
            className={errores.email ? "form-empleado__input--error" : ""}
            placeholder="empleado@empresa.com"
          />

          {errores.email && (
            <small className="form-empleado__error">{errores.email}</small>
          )}
        </div>

        <div className="form-empleado__campo form-empleado__campo--completo">
          <label htmlFor="foto">URL de la foto</label>

          <input
            id="foto"
            name="foto"
            type="url"
            value={formulario.foto}
            onChange={handleChange}
            disabled={guardando}
            className={errores.foto ? "form-empleado__input--error" : ""}
            placeholder="https://..."
          />

          {errores.foto && (
            <small className="form-empleado__error">{errores.foto}</small>
          )}
        </div>

        <div className="form-empleado__campo form-empleado__campo--completo">
          <label className="form-empleado__checkbox">
            <input
              name="activo"
              type="checkbox"
              checked={formulario.activo}
              onChange={handleChange}
              disabled={guardando}
            />

            <span>Empleado activo</span>
          </label>
        </div>
      </div>

      {formulario.foto && (
        <div className="form-empleado__vista-previa">
          <span>Vista previa de la foto</span>

          <img
            src={formulario.foto}
            alt={formulario.nombre || "Empleado"}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="form-empleado__acciones">
        <button
          type="button"
          className="form-empleado__boton form-empleado__boton--secundario"
          onClick={handleCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="form-empleado__boton form-empleado__boton--principal"
          disabled={guardando}
        >
          {guardando
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : "Agregar empleado"}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   VALIDACIONES
============================================================ */

function validarFormulario(formulario, empleados, empleadoEditar) {
  const errores = {};

  const idEmpleado = convertirIdentificador(formulario.idEmpleado);

  if (idEmpleado === null) {
    errores.idEmpleado = "El identificador es obligatorio.";
  } else if (
    typeof idEmpleado === "number" &&
    (!Number.isInteger(idEmpleado) || idEmpleado <= 0)
  ) {
    errores.idEmpleado =
      "El identificador debe ser un número entero mayor que cero.";
  }

  const idDuplicado = empleados.some((empleado) => {
    const mismoId = String(empleado.idEmpleado) === String(idEmpleado);

    const empleadoActual =
      empleadoEditar &&
      String(empleado.idEmpleado) === String(empleadoEditar.idEmpleado);

    return mismoId && !empleadoActual;
  });

  if (idDuplicado) {
    errores.idEmpleado = `Ya existe un empleado con el identificador ${idEmpleado}.`;
  }

  if (!limpiarTexto(formulario.nombre)) {
    errores.nombre = "El nombre del empleado es obligatorio.";
  }

  if (!limpiarTexto(formulario.cargo)) {
    errores.cargo = "El cargo del empleado es obligatorio.";
  }

  if (
    formulario.supervisorId &&
    String(formulario.supervisorId) === String(formulario.idEmpleado)
  ) {
    errores.supervisorId = "El empleado no puede ser su propio supervisor.";
  }

  if (formulario.email && !esCorreoValido(formulario.email)) {
    errores.email = "Ingresá un correo electrónico válido.";
  }

  if (formulario.foto && !esUrlValida(formulario.foto)) {
    errores.foto = "Ingresá una URL válida para la foto.";
  }

  return errores;
}

/* ============================================================
   FUNCIONES AUXILIARES
============================================================ */

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(/\s+/g, " ").trim();
}

function convertirIdentificador(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const numero = Number(valor);

  if (Number.isFinite(numero) && String(valor).trim() !== "") {
    return numero;
  }

  return String(valor).trim();
}

function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim());
}

function esUrlValida(valor) {
  try {
    const url = new URL(String(valor).trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
