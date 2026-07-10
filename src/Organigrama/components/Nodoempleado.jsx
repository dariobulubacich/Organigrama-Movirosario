import "./NodoEmpleado.css";

export default function NodoEmpleado({ empleado }) {
  return (
    <div className="nodo" style={{ background: empleado.color }}>
      <div className="nombre">{empleado.nombre}</div>

      <div className="cargo">{empleado.cargo}</div>
    </div>
  );
}
