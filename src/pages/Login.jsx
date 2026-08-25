import { useState } from "react";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../firebase";

import { useNavigate } from "react-router-dom";

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const iniciarSesion = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      navigate("/admin");

    } catch (error) {

      alert("Credenciales incorrectas");

      console.log(error);

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="flex min-h-screen items-center justify-center bg-[#F7EEE6] px-6 font-sans">

      <div className="w-full max-w-md rounded-[24px] border border-black/[0.05] bg-white p-10 shadow-xl shadow-[#545454]/5">

        {/* TITULO */}
        <div className="mb-10 text-center">

          <h1 className="font-serif text-4xl font-light tracking-wide text-[#545454]">

            Mil <span className="italic text-[#DFADAD]">Amores</span>

          </h1>

          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#9A9A9A]">

            Panel administrativo

          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={iniciarSesion}
          className="space-y-5"
        >

          {/* EMAIL */}
          <div>

            <label className="mb-2 block text-xs uppercase tracking-widest text-[#9A9A9A]">

              Correo electrónico

            </label>

            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              className="w-full rounded-xl border border-black/10 bg-[#F7EEE6] px-4 py-3 text-sm text-[#545454] outline-none transition focus:border-[#DFADAD]"
            />

          </div>

          {/* PASSWORD */}
          <div>

            <label className="mb-2 block text-xs uppercase tracking-widest text-[#9A9A9A]">

              Contraseña

            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              className="w-full rounded-xl border border-black/10 bg-[#F7EEE6] px-4 py-3 text-sm text-[#545454] outline-none transition focus:border-[#DFADAD]"
            />

          </div>

          {/* BOTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-[#545454] py-5 text-xs font-medium uppercase tracking-widest text-white shadow-lg shadow-[#545454]/25 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-xl hover:shadow-[#DFADAD]/35 disabled:opacity-50"
          >

            {loading
              ? "Ingresando..."
              : "Ingresar"}

          </button>

        </form>

      </div>

    </div>

  );

}

