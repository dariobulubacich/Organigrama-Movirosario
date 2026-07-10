import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import Nodo from "../../components/nodoempleado/NodoEmpleado";
import { db } from "../../firebase";

import {
  Tree,
  TreeNode,
} from "react-organizational-chart";

import "./Organigrama.css";

export default function Organigrama() {

  const [empleados,setEmpleados]=useState([]);

  useEffect(()=>{

      cargarEmpleados();

  },[]);

  async function cargarEmpleados(){

      const snap=await getDocs(collection(db,"empleados"));

      const lista=snap.docs.map(doc=>({

          id:doc.id,
          ...doc.data()

      }));

      setEmpleados(lista);

  }

  const raiz=empleados.find(e=>e.jefe===null);

  if(!raiz){

      return(

          <div className="organigrama-vacio">

              No hay empleados

          </div>

      )

  }

  return(

      <div className="organigrama-container">

          <Tree
            label={<Nodo empleado={raiz}/>}
          >

              {dibujarHijos(raiz.id)}

          </Tree>

      </div>

  );

  function dibujarHijos(idPadre){

      const hijos=empleados.filter(e=>e.jefe===idPadre);

      return hijos.map(hijo=>(

          <TreeNode
            key={hijo.id}
            label={<Nodo empleado={hijo}/>}
          >

              {dibujarHijos(hijo.id)}

          </TreeNode>

      ));