import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo-transparente.png";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();

  // NOTIFICACIONES ESTILIZADAS (reemplaza alert())
  const [toast, setToast] = useState(null); // { mensaje, tipo: "error" | "exito" }
  const mostrarToast = (mensaje, tipo = "error") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // CONFIRMACION ESTILIZADA (reemplaza window.confirm())
  const [confirmacion, setConfirmacion] = useState(null); // { mensaje, onConfirmar }
  const pedirConfirmacion = (mensaje, onConfirmar) => {
    setConfirmacion({ mensaje, onConfirmar });
  };

  // PRODUCTOS
  const [productos, setProductos] = useState([]);

  // ORDENES
  const [ordenes, setOrdenes] = useState([]);

  // ESTADISTICAS
  const pendientes = ordenes.filter((o) => o.estado === "pendiente").length;
  const confirmados = ordenes.filter((o) => o.estado === "confirmado").length;
  const enviados = ordenes.filter((o) => o.estado === "enviado").length;
  const entregados = ordenes.filter((o) => o.estado === "entregado").length;

  // FORM
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);

  // CLOUDINARY
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // EDITAR
  const [editandoId, setEditandoId] = useState(null);

  // ESTADO VISUAL: MENU MOVIL
  const [menuAbierto, setMenuAbierto] = useState(false);

  // NAVEGACION POR PESTAÑAS
  const [vistaActiva, setVistaActiva] = useState("dashboard");

  // SELECCION DE ORDENES PARA BORRAR
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState([]);

  // OBTENER DATOS
  useEffect(() => {
    obtenerProductos();
    obtenerOrdenes();
  }, []);

  // PRODUCTOS
  const obtenerProductos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const productosFirebase = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosFirebase);
    } catch (error) {
      console.log(error);
    }
  };

  // ORDENES
  const obtenerOrdenes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ordenes"));
      const ordenesFirebase = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrdenes(ordenesFirebase);
    } catch (error) {
      console.log(error);
    }
  };

  // BORRAR UNA ORDEN
  const eliminarOrden = (id) => {
    pedirConfirmacion("¿Borrar esta orden? Esta acción no se puede deshacer.", async () => {
      try {
        await deleteDoc(doc(db, "ordenes", id));
        setOrdenes(ordenes.filter((orden) => orden.id !== id));
        setOrdenesSeleccionadas(ordenesSeleccionadas.filter((oid) => oid !== id));
      } catch (error) {
        console.log(error);
        mostrarToast("Error al borrar la orden");
      }
    });
  };

  // BORRAR VARIAS ORDENES SELECCIONADAS
  const eliminarOrdenesSeleccionadas = () => {
    if (ordenesSeleccionadas.length === 0) return;

    pedirConfirmacion(
      `¿Borrar ${ordenesSeleccionadas.length} orden(es) seleccionada(s)? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await Promise.all(
            ordenesSeleccionadas.map((id) => deleteDoc(doc(db, "ordenes", id)))
          );
          setOrdenes(ordenes.filter((orden) => !ordenesSeleccionadas.includes(orden.id)));
          setOrdenesSeleccionadas([]);
        } catch (error) {
          console.log(error);
          mostrarToast("Error al borrar las órdenes seleccionadas");
        }
      }
    );
  };

  // SELECCIONAR / DESELECCIONAR UNA ORDEN
  const toggleSeleccionOrden = (id) => {
    setOrdenesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  // SELECCIONAR / DESELECCIONAR TODAS LAS ORDENES VISIBLES
  const toggleSeleccionarTodas = () => {
    if (ordenesSeleccionadas.length === ordenes.length) {
      setOrdenesSeleccionadas([]);
    } else {
      setOrdenesSeleccionadas(ordenes.map((orden) => orden.id));
    }
  };

  // GENERAR COMPROBANTE DE COMPRA (imprimible / descargable como PDF desde el navegador)
  const generarComprobante = (orden) => {
    const productosFilas = Array.isArray(orden.productos)
      ? orden.productos
          .map(
            (p) => `
            <tr>
              <td>${p.nombre}</td>
              <td style="text-align:right">Q${p.precio}</td>
            </tr>`
          )
          .join("")
      : "";

    const fecha = orden.fecha?.toDate
      ? orden.fecha.toDate().toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Comprobante - ${orden.nombre || "Cliente"}</title>
        <style>
          body { font-family: 'Georgia', serif; color: #545454; max-width: 600px; margin: 40px auto; padding: 30px 20px; background: #ffffff; }
          .encabezado { text-align: center; border-bottom: 2px solid #DFADAD; padding-bottom: 20px; margin-bottom: 30px; }
          .encabezado img { height: 130px; width: auto; margin-bottom: 4px; }
          .encabezado p { color: #9A9A9A; font-size: 13px; margin-top: 6px; }
          .titulo-comprobante { text-transform: uppercase; letter-spacing: 3px; font-size: 12px; color: #DFADAD; text-align: center; margin-bottom: 30px; }
          .datos { margin-bottom: 24px; font-size: 14px; line-height: 1.8; }
          .datos strong { color: #545454; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9A9A9A; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
          .total { text-align: right; font-size: 20px; margin-top: 10px; }
          .total span { color: #DFADAD; font-weight: bold; }
          .pie { display: flex; justify-content: space-between; gap: 30px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .pie-columna h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #DFADAD; margin: 0 0 8px 0; }
          .pie-columna p { font-size: 13px; margin: 0; line-height: 1.7; }
          .nota { margin-top: 30px; font-size: 11px; color: #9A9A9A; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
          @media print { .no-imprimir { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="encabezado">
          <img src="${logo}" alt="Mil Amores GT" />
          <p>Sanarate, Guatemala · Envíos nacionales</p>
        </div>
        <p class="titulo-comprobante">Comprobante de compra</p>
        <div class="datos">
          <strong>Fecha:</strong> ${fecha}<br/>
          <strong>Cliente:</strong> ${orden.nombre || "—"}<br/>
          <strong>Teléfono:</strong> ${orden.telefono || "—"}<br/>
          <strong>Dirección de entrega:</strong> ${orden.direccion || "—"}
        </div>
        <table>
          <thead>
            <tr><th>Producto</th><th style="text-align:right">Precio</th></tr>
          </thead>
          <tbody>
            ${productosFilas}
          </tbody>
        </table>
        <p class="total">Total: <span>Q${orden.total}</span></p>
        <div class="pie">
          <div class="pie-columna">
            <h4>Notas</h4>
            <p>Envío de 2 a 3 días hábiles</p>
          </div>
          <div class="pie-columna">
            <h4>Datos para transferencia</h4>
            <p>
              Banco: Banrural<br/>
              Tipo de cuenta: Cuenta de Ahorros<br/>
              No. de cuenta: 4489009487
            </p>
          </div>
        </div>
        <p class="nota">
          Este documento es un comprobante de compra informativo y no constituye una factura electrónica (FEL) reconocida por la SAT.
        </p>
        <div class="no-imprimir" style="text-align:center; margin-top: 30px;">
          <button onclick="window.print()" style="background:#545454; color:white; border:none; padding:12px 28px; font-size:13px; text-transform:uppercase; letter-spacing:1px; cursor:pointer;">
            Imprimir / Guardar como PDF
          </button>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank");
    if (!ventana) {
      mostrarToast("Tu navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e intenta de nuevo.");
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
  };

  // CAMBIAR ESTADO
  const cambiarEstadoOrden = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, "ordenes", id), {
        estado: nuevoEstado,
      });
      setOrdenes(
        ordenes.map((orden) =>
          orden.id === id ? { ...orden, estado: nuevoEstado } : orden
        )
      );
    } catch (error) {
      console.log(error);
      mostrarToast("Error actualizando estado");
    }
  };

  // SUBIR IMAGEN
  const subirImagen = async (file) => {
    if (!file) return;
    setSubiendoImagen(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "umxjqir5");
    data.append("cloud_name", "dvnz9aq8b");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dvnz9aq8b/image/upload",
        {
          method: "POST",
          body: data,
        }
      );
      const uploadedImage = await res.json();
      setImagen(uploadedImage.secure_url);
    } catch (error) {
      console.log(error);
      mostrarToast("Error subiendo imagen");
    } finally {
      setSubiendoImagen(false);
    }
  };

  // CONTROLA LA SELECCION DE MULTIPLES CATEGORIAS
  const toggleCategoria = (cat) => {
    setCategorias((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // LIMPIAR
  const limpiarFormulario = () => {
    setNombre("");
    setPrecio("");
    setImagen("");
    setDescripcion("");
    setCategorias([]);
    setEditandoId(null);
  };

  // GUARDAR PRODUCTO
  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio || !imagen || !descripcion || categorias.length === 0) {
      mostrarToast("Completa todos los campos (elige al menos una categoría)");
      return;
    }

    try {
      const productoData = {
        nombre,
        precio,
        imagen,
        descripcion,
        categorias,
      };

      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), productoData);
        setProductos(
          productos.map((producto) =>
            producto.id === editandoId
              ? { id: editandoId, ...productoData }
              : producto
          )
        );
        mostrarToast("Producto actualizado", "exito");
      } else {
        const docRef = await addDoc(collection(db, "productos"), productoData);
        setProductos([
          ...productos,
          {
            id: docRef.id,
            ...productoData,
          },
        ]);
        mostrarToast("Producto agregado", "exito");
      }
      limpiarFormulario();
    } catch (error) {
      console.log(error);
      mostrarToast("Error guardando");
    }
  };

  // EDITAR
  const editarProducto = (producto) => {
    setNombre(producto.nombre);
    setPrecio(producto.precio);
    setImagen(producto.imagen);
    setDescripcion(producto.descripcion);
    // Compatibilidad: productos viejos tienen "categoria" (texto), los nuevos "categorias" (arreglo)
    setCategorias(
      Array.isArray(producto.categorias)
        ? producto.categorias
        : producto.categoria
        ? [producto.categoria]
        : []
    );
    setEditandoId(producto.id);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ELIMINAR
  const eliminarProducto = (id) => {
    pedirConfirmacion("¿Eliminar este producto? Esta acción no se puede deshacer.", async () => {
      try {
        await deleteDoc(doc(db, "productos", id));
        setProductos(productos.filter((producto) => producto.id !== id));
      } catch (error) {
        console.log(error);
        mostrarToast("Error eliminando");
      }
    });
  };

  // LOGOUT
  const cerrarSesion = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#F7EEE6] font-sans antialiased text-[#545454]">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-[260px] flex-col border-r border-black/[0.06] bg-white p-6 justify-between shrink-0">
        <div>
          <h1 className="mb-8 px-2 font-serif text-2xl font-light tracking-wide text-[#545454]">
            Mil <span className="italic text-[#DFADAD]">Amores</span>
          </h1>
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setVistaActiva("dashboard")}
              className={`w-full rounded-none px-4 py-3 text-left text-xs uppercase tracking-widest font-medium transition ${
                vistaActiva === "dashboard"
                  ? "bg-[#545454] text-white shadow-sm"
                  : "text-[#6B6B6B] hover:bg-[#F7EEE6] hover:text-[#545454]"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setVistaActiva("productos")}
              className={`w-full rounded-none px-4 py-3 text-left text-xs uppercase tracking-widest font-medium transition ${
                vistaActiva === "productos"
                  ? "bg-[#545454] text-white shadow-sm"
                  : "text-[#6B6B6B] hover:bg-[#F7EEE6] hover:text-[#545454]"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setVistaActiva("ordenes")}
              className={`w-full rounded-none px-4 py-3 text-left text-xs uppercase tracking-widest font-medium transition ${
                vistaActiva === "ordenes"
                  ? "bg-[#545454] text-white shadow-sm"
                  : "text-[#6B6B6B] hover:bg-[#F7EEE6] hover:text-[#545454]"
              }`}
            >
              Órdenes
            </button>
          </nav>
        </div>

        <button
          onClick={cerrarSesion}
          className="w-full rounded-none bg-red-50 px-4 py-3 text-xs uppercase tracking-widest font-medium text-red-600 transition hover:bg-red-100"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* SIDEBAR MOVIL / HEADER */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-4 lg:hidden">
          <h1 className="font-serif text-xl font-light tracking-wide text-[#545454]">Mil <span className="italic text-[#DFADAD]">Amores</span></h1>
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="rounded-full p-2 text-[#6B6B6B] hover:bg-[#F7EEE6]"
          >
            <span className="text-xs font-medium uppercase tracking-widest">{menuAbierto ? "Cerrar" : "Menú"}</span>
          </button>
        </header>

        {/* Menú desplegable móvil */}
        {menuAbierto && (
          <div className="border-b border-black/[0.06] bg-white p-4 lg:hidden flex flex-col gap-2 shadow-inner">
            <button
              onClick={() => { setVistaActiva("dashboard"); setMenuAbierto(false); }}
              className={`w-full rounded-none px-4 py-2.5 text-left text-xs uppercase tracking-widest font-medium ${vistaActiva === "dashboard" ? "bg-[#545454] text-white" : "text-[#6B6B6B] hover:bg-[#F7EEE6]"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => { setVistaActiva("productos"); setMenuAbierto(false); }}
              className={`w-full rounded-none px-4 py-2.5 text-left text-xs uppercase tracking-widest font-medium ${vistaActiva === "productos" ? "bg-[#545454] text-white" : "text-[#6B6B6B] hover:bg-[#F7EEE6]"}`}
            >
              Productos
            </button>
            <button
              onClick={() => { setVistaActiva("ordenes"); setMenuAbierto(false); }}
              className={`w-full rounded-none px-4 py-2.5 text-left text-xs uppercase tracking-widest font-medium ${vistaActiva === "ordenes" ? "bg-[#545454] text-white" : "text-[#6B6B6B] hover:bg-[#F7EEE6]"}`}
            >
              Órdenes
            </button>
            <button onClick={cerrarSesion} className="w-full mt-2 rounded-none bg-red-50 px-4 py-2.5 text-left text-xs uppercase tracking-widest font-medium text-red-600">Cerrar sesión</button>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          
          {/* HEADER TITULO */}
          <div className="mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-wide text-[#545454]">
              {vistaActiva === "dashboard" && "Dashboard"}
              {vistaActiva === "productos" && "Productos"}
              {vistaActiva === "ordenes" && "Órdenes"}
            </h2>
            <p className="mt-1 text-sm text-[#9A9A9A]">
              {vistaActiva === "dashboard" && "Bienvenido al panel administrativo. Gestiona tu tienda eficientemente."}
              {vistaActiva === "productos" && "Agrega, edita y organiza tu catálogo de productos."}
              {vistaActiva === "ordenes" && "Revisa y da seguimiento a los pedidos de tus clientes."}
            </p>
          </div>

          {vistaActiva === "dashboard" && (
          <>
          {/* TARJETAS DE ESTADISTICAS */}
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            
            {/* Ventas */}
            <div className="rounded-2xl border-l-4 border-l-[#DFADAD] border border-black/[0.06] bg-white p-5 shadow-sm flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest text-[#DFADAD]">
                Ventas Totales
              </p>
              <h3 className="mt-2 font-serif text-2xl font-light text-[#545454]">
                Q {ordenes.reduce((acc, orden) => acc + Number(orden.total || 0), 0)}
              </h3>
            </div>

            {/* Pendientes */}
            <div className="rounded-2xl border-l-4 border-l-amber-500 border border-black/[0.06] bg-white p-5 shadow-sm flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest text-amber-600">
                Pendientes
              </p>
              <h3 className="mt-2 font-serif text-2xl font-light text-[#545454]">
                {pendientes}
              </h3>
            </div>

            {/* Confirmados */}
            <div className="rounded-2xl border-l-4 border-l-blue-500 border border-black/[0.06] bg-white p-5 shadow-sm flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest text-blue-600">
                Confirmados
              </p>
              <h3 className="mt-2 font-serif text-2xl font-light text-[#545454]">
                {confirmados}
              </h3>
            </div>

            {/* Enviados */}
            <div className="rounded-2xl border-l-4 border-l-purple-500 border border-black/[0.06] bg-white p-5 shadow-sm flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest text-purple-600">
                Enviados
              </p>
              <h3 className="mt-2 font-serif text-2xl font-light text-[#545454]">
                {enviados}
              </h3>
            </div>

            {/* Entregados */}
            <div className="rounded-2xl border-l-4 border-l-emerald-500 border border-black/[0.06] bg-white p-5 shadow-sm flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest text-emerald-600">
                Entregados
              </p>
              <h3 className="mt-2 font-serif text-2xl font-light text-[#545454]">
                {entregados}
              </h3>
            </div>
          </div>

          {/* RESUMEN: ULTIMAS ORDENES */}
          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-light text-[#545454]">Órdenes recientes</h3>
              <button
                onClick={() => setVistaActiva("ordenes")}
                className="text-xs uppercase tracking-widest font-medium text-[#DFADAD] hover:underline"
              >
                Ver todas →
              </button>
            </div>
            {ordenes.length === 0 ? (
              <p className="text-sm text-[#9A9A9A]">Aún no tienes órdenes registradas.</p>
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.06]">
                {ordenes.slice(0, 5).map((orden) => (
                  <div key={orden.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="text-[#545454]">{orden.nombre || "Cliente sin nombre"}</span>
                    <span className="text-[#9A9A9A]">
                      {Array.isArray(orden.productos) ? orden.productos.length : 0} producto(s)
                    </span>
                    <span className="font-medium text-[#DFADAD]">Q{orden.total}</span>
                    <span className="text-xs uppercase tracking-widest text-[#9A9A9A]">{orden.estado}</span>
                    <button
                      onClick={() => generarComprobante(orden)}
                      aria-label="Descargar comprobante"
                      title="Descargar comprobante"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9A9A9A] transition-colors duration-300 hover:bg-[#F7EEE6] hover:text-[#545454]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}

          {vistaActiva === "productos" && (
          <>
          {/* CONTAINER FORMULARIO */}
          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-5 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="font-serif text-xl font-light text-[#545454]">
                {editandoId ? "Editar Producto" : "Agregar Nuevo Producto"}
              </h3>
              <p className="text-xs text-[#9A9A9A] mt-0.5">Rellena todos los campos requeridos.</p>
            </div>

            <form onSubmit={guardarProducto} className="grid gap-5 md:grid-cols-2">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-[#9A9A9A]">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Collar de Perlas"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="rounded-xl border border-black/10 bg-[#F7EEE6] px-4 py-3 text-sm outline-none transition focus:border-[#DFADAD] focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-[#9A9A9A]">Precio (Q)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="rounded-xl border border-black/10 bg-[#F7EEE6] px-4 py-3 text-sm outline-none transition focus:border-[#DFADAD] focus:bg-white"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-[#9A9A9A]">
                  Imagen del producto
                </label>
                <div className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-[#F7EEE6] p-4 text-center transition hover:bg-[#F3EEE5]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => subirImagen(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#6B6B6B]">
                      {subiendoImagen ? "Subiendo archivo..." : "Haz clic para subir o arrastra una imagen"}
                    </p>
                    <p className="text-xs text-[#9A9A9A]">PNG, JPG, WEBP hasta 5MB</p>
                  </div>
                </div>

                {imagen && (
                  <div className="mt-2 flex items-center gap-4 p-2 border border-black/[0.06] rounded-xl bg-[#F7EEE6] w-fit">
                    <img
                      src={imagen}
                      alt="preview"
                      className="h-20 w-20 rounded-lg object-cover border border-black/10"
                    />
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">¡Imagen cargada!</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-[#9A9A9A]">Descripción</label>
                <textarea
                  placeholder="Escribe los detalles y materiales del producto..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="min-h-[110px] rounded-xl border border-black/10 bg-[#F7EEE6] px-4 py-3 text-sm outline-none transition focus:border-[#DFADAD] focus:bg-white resize-y"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-[#9A9A9A]">
                  Categorías (puedes elegir varias)
                </label>
                <div className="flex flex-wrap gap-2">
                  {["flores", "cajas de regalo", "joyas", "chocolates", "extras", "arreglos de temporada"].map((cat) => {
                    const nombresCategoria = {
                      "flores": "Flores",
                      "cajas de regalo": "Cajas de Regalo",
                      "joyas": "Joyas",
                      "chocolates": "Chocolates",
                      "extras": "Extras",
                      "arreglos de temporada": "Arreglos de Temporada",
                    };
                    const seleccionada = categorias.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategoria(cat)}
                        className={`rounded-full border px-4 py-2 text-xs uppercase tracking-widest font-medium transition-all duration-300 ${
                          seleccionada
                            ? "bg-[#545454] border-[#545454] text-white"
                            : "border-black/10 text-[#6B6B6B] hover:border-[#DFADAD]"
                        }`}
                      >
                        {nombresCategoria[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={subiendoImagen}
                  className="w-full max-w-xs rounded-none bg-[#545454] px-7 py-4 text-xs uppercase tracking-widest font-medium text-white shadow-lg shadow-[#545454]/25 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-xl hover:shadow-[#DFADAD]/35 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editandoId ? "Guardar Cambios" : "Guardar Producto"}
                </button>
              </div>

            </form>
          </div>

{/* PRODUCTOS */}
<div className="mt-10">
  <h3 className="mb-6 font-serif text-2xl font-light text-[#545454]">
    Productos Registrados
  </h3>

  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {productos.map((producto) => (
      <div
        key={producto.id}
        className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"
      >
        <img
          src={producto.imagen}
          alt={producto.nombre}
          className="mb-4 h-48 w-full rounded-xl object-cover"
        />

        <h4 className="font-serif text-lg font-normal text-[#545454]">
          {producto.nombre}
        </h4>

        <p className="text-sm text-[#9A9A9A]">
          {producto.descripcion}
        </p>

        <p className="mt-2 font-medium text-[#DFADAD]">
          Q{producto.precio}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => editarProducto(producto)}
            className="rounded-none bg-[#545454] px-6 py-3 text-xs uppercase tracking-widest font-medium text-white transition-all duration-300 hover:bg-[#DFADAD]"
          >
            Editar
          </button>

          <button
            onClick={() => eliminarProducto(producto.id)}
            className="rounded-none bg-red-50 px-6 py-3 text-xs uppercase tracking-widest font-medium text-red-600 transition-all duration-300 hover:bg-red-100"
          >
            Eliminar
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
          </>
          )}

          {vistaActiva === "ordenes" && (
          <>
{/* ORDENES */}
<div className="mt-12">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
    <h3 className="font-serif text-2xl font-light text-[#545454]">
      Órdenes
    </h3>

    {ordenesSeleccionadas.length > 0 && (
      <button
        onClick={eliminarOrdenesSeleccionadas}
        className="flex items-center gap-2 rounded-none bg-red-600 px-5 py-2.5 text-xs uppercase tracking-widest font-medium text-white transition-all duration-300 hover:bg-red-700"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Eliminar {ordenesSeleccionadas.length} seleccionada{ordenesSeleccionadas.length > 1 ? "s" : ""}
      </button>
    )}
  </div>

  <div className="overflow-auto rounded-2xl border border-black/[0.06] bg-white shadow-sm">
    <table className="w-full">
      <thead>
        <tr className="border-b border-black/[0.06]">
          <th className="p-4 text-left w-10">
            <input
              type="checkbox"
              checked={ordenes.length > 0 && ordenesSeleccionadas.length === ordenes.length}
              onChange={toggleSeleccionarTodas}
              className="h-4 w-4 accent-[#545454] cursor-pointer"
            />
          </th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Cliente</th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Teléfono</th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Dirección</th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Productos</th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Total</th>
          <th className="p-4 text-left text-xs uppercase tracking-widest text-[#9A9A9A]">Estado</th>
          <th className="p-4 text-left w-10"></th>
        </tr>
      </thead>

      <tbody>
        {ordenes.length === 0 ? (
          <tr>
            <td colSpan={8} className="p-8 text-center text-sm text-[#9A9A9A]">
              Aún no tienes órdenes registradas.
            </td>
          </tr>
        ) : (
        ordenes.map((orden) => (
          <tr
            key={orden.id}
            className={`border-b border-black/[0.06] align-top transition-colors ${
              ordenesSeleccionadas.includes(orden.id) ? "bg-[#F7EEE6]/60" : ""
            }`}
          >
            <td className="p-4">
              <input
                type="checkbox"
                checked={ordenesSeleccionadas.includes(orden.id)}
                onChange={() => toggleSeleccionOrden(orden.id)}
                className="h-4 w-4 accent-[#545454] cursor-pointer"
              />
            </td>

            <td className="p-4 text-sm text-[#545454]">
              {orden.nombre || "—"}
            </td>

            <td className="p-4 text-sm text-[#545454]">
              {orden.telefono || "—"}
            </td>

            <td className="p-4 text-sm text-[#6B6B6B] max-w-[220px]">
              {orden.direccion || "—"}
            </td>

            <td className="p-4 text-sm text-[#6B6B6B]">
              {Array.isArray(orden.productos)
                ? orden.productos.map((p) => p.nombre).join(", ")
                : "—"}
            </td>

            <td className="p-4 text-sm font-medium text-[#DFADAD]">
              Q{orden.total}
            </td>

            <td className="p-4">
              <select
                value={orden.estado}
                onChange={(e) =>
                  cambiarEstadoOrden(
                    orden.id,
                    e.target.value
                  )
                }
                className="rounded-lg border border-black/10 bg-[#F7EEE6] px-3 py-2 text-sm outline-none transition focus:border-[#DFADAD]"
              >
                <option value="pendiente">
                  Pendiente
                </option>

                <option value="confirmado">
                  Confirmado
                </option>

                <option value="enviado">
                  Enviado
                </option>

                <option value="entregado">
                  Entregado
                </option>
              </select>
            </td>

            <td className="p-4">
              <button
                onClick={() => eliminarOrden(orden.id)}
                aria-label="Borrar orden"
                className="flex h-9 w-9 items-center justify-center rounded-none text-red-400 transition-colors duration-300 hover:bg-red-50 hover:text-red-600"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </td>
          </tr>
        ))
        )}
      </tbody>
    </table>
  </div>
</div>
          </>
          )}
        </main>
      </div>

      {/* TOAST DE NOTIFICACIONES */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 30, x: "-50%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 z-[1200] w-[92%] max-w-md"
          >
            <div
              className={`flex items-start gap-3 border-l-4 bg-white px-5 py-4 shadow-2xl ${
                toast.tipo === "exito" ? "border-l-[#DFADAD]" : "border-l-[#545454]"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {toast.tipo === "exito" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 12.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#545454" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <p className="flex-1 text-sm font-light leading-relaxed text-[#545454]">
                {toast.mensaje}
              </p>
              <button
                onClick={() => setToast(null)}
                className="shrink-0 text-lg leading-none text-[#9A9A9A] hover:text-[#545454]"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACION (reemplaza window.confirm()) */}
      <AnimatePresence>
        {confirmacion && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmacion(null)}
              className="fixed inset-0 z-[1300] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-[1301] w-[90%] max-w-sm bg-white p-8 shadow-2xl"
            >
              <p className="mb-6 text-base font-light leading-relaxed text-[#545454]">
                {confirmacion.mensaje}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmacion(null)}
                  className="flex-1 rounded-none border border-black/10 py-3 text-xs uppercase tracking-widest font-medium text-[#6B6B6B] transition hover:bg-[#F7EEE6]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmacion.onConfirmar();
                    setConfirmacion(null);
                  }}
                  className="flex-1 rounded-none bg-red-600 py-3 text-xs uppercase tracking-widest font-medium text-white transition hover:bg-red-700"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}