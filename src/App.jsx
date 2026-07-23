import { Routes, Route, Navigate } from "react-router-dom";
import Organigrama from "./Organigrama/Organigrama";
import OrganigramaEstructural from "./pages/OrganigramaEstructural";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Organigrama />} />

        <Route
          path="/organigrama-estructural"
          element={<OrganigramaEstructural />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
