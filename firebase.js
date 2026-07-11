import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCk3BWhoegJRSpXibdit_CxQjTmPWPaxnU",
  authDomain: "orgama-movirosario-11498.firebaseapp.com",
  projectId: "orgama-movirosario-11498",
  storageBucket: "orgama-movirosario-11498.firebasestorage.app",
  messagingSenderId: "954724513502",
  appId: "1:954724513502:web:5d6f6f69d70f98dbe1344f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export default app;
