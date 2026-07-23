import { Routes, Route, Navigate } from "react-router-dom";

import Organigrama from "./Organigrama/Organigrama";
import OrganigramaEstructural from "./pages/OrganigramaEstructural";
import "./App.css";
import NodoEstructural from "./organigrama/components/NodoEstructural";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Organigrama />} />
        <Route
          path="/organigrama-estructural"
          element={<OrganigramaEstructural />}
        />
        <Route path="/nodoestructural" element={<NodoEstructural />} />{" "}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
