import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { useEffect, useState } from "react";

import { auth } from "./firebase";

import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

export default function App() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(auth, (usuario) => {

        setUser(usuario);

        setLoading(false);

      });

    return () => unsubscribe();

  }, []);

  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center">

        Cargando...

      </div>

    );

  }

  return (

    <BrowserRouter>

      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* LOGIN */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ADMIN PROTEGIDO */}
        <Route
          path="/admin"
          element={
            user
              ? <Admin />
              : <Navigate to="/login" />
          }
        />

      </Routes>

    </BrowserRouter>

  );

}


