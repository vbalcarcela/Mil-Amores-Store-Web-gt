import heroImage from "../assets/hero.png";
import logo from "../assets/logo.png";
import logoDark from "../assets/logo-dark.png";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase";

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(null); // guarda el link de WhatsApp mientras se muestra el modal

  // NOTIFICACIONES ESTILIZADAS (reemplaza alert())
  const [toast, setToast] = useState(null); // { mensaje, tipo: "error" | "exito" }

  const mostrarToast = (mensaje, tipo = "error") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // OBTENER PRODUCTOS
  const [errorCarga, setErrorCarga] = useState(false);

  const obtenerProductos = async () => {
    setLoading(true);
    setErrorCarga(false);
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const productosFirebase = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosFirebase);
    } catch (error) {
      console.log(error);
      setErrorCarga(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  // AGREGAR CARRITO
  const agregarCarrito = (producto) => {
    setCarrito([...carrito, producto]);
    setCarritoAbierto(true);
  };

  // ELIMINAR PRODUCTO
  const eliminarProducto = (index) => {
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(index, 1);
    setCarrito(nuevoCarrito);
  };

  // TOTAL
  const totalCarrito = carrito.reduce(
    (acc, item) => acc + Number(item.precio),
    0
  );

  const finalizarPedido = async () => {
    if (enviandoPedido) return;

    if (carrito.length === 0) {
      mostrarToast("Tu carrito está vacío");
      return;
    }

    const nombreLimpio = nombreCliente.trim().replace(/\s+/g, " ");
    const telefonoLimpio = telefonoCliente.trim();
    const direccionLimpia = direccionCliente.trim();

    if (!nombreLimpio || !telefonoLimpio || !direccionLimpia) {
      mostrarToast("Por favor completa tu nombre, teléfono y dirección de entrega antes de finalizar el pedido");
      return;
    }

    if (direccionLimpia.length < 10) {
      mostrarToast("Escribe una dirección de entrega más detallada (calle, zona, referencia)");
      return;
    }

    // Nombre completo: letras, espacios, apóstrofes y guiones (nombres compuestos, O'Connor, etc.)
    const nombreValido = /^[A-Za-zÀ-ÿ\s'-]{3,80}$/.test(nombreLimpio);

    if (!nombreValido) {
      mostrarToast("Escribe tu nombre completo (solo letras, sin números ni símbolos raros)");
      return;
    }

    // Rechaza el caso obvio de spam: el mismo carácter repetido (ej. "aaaa")
    const esTrivial = /^(.)\1+$/.test(nombreLimpio.replace(/\s/g, ""));

    if (esTrivial) {
      mostrarToast("Ese nombre no parece válido, escribe tu nombre real");
      return;
    }

    // Acepta el formato guatemalteco (8 dígitos, empieza en 3-7)
    // O un número internacional: "+" opcional seguido de 8 a 15 dígitos
    // (para clientes con número de EE.UU. u otro país, ej. familiares que piden desde el extranjero)
    const esGuatemalteco = /^[3-7]\d{7}$/.test(telefonoLimpio);
    const esInternacional = /^\+?\d{8,15}$/.test(telefonoLimpio);
    const telefonoValido = esGuatemalteco || esInternacional;

    // Rechaza el caso obvio de spam: el mismo dígito repetido (ej. "22222222")
    const soloDigitos = telefonoLimpio.replace(/\D/g, "");
    const digitoRepetido = /^(\d)\1{5,}$/.test(soloDigitos);

    if (!telefonoValido) {
      mostrarToast(
        "Escribe un número de teléfono válido: si es de Guatemala, 8 dígitos empezando en 3-7 (ej. 55512345). Si es de otro país, inclúyelo con el código de país (ej. +1 305 555 1234)"
      );
      return;
    }

    if (digitoRepetido) {
      mostrarToast("Ese número no parece un teléfono real, escribe tu número correcto");
      return;
    }

    try {
      setEnviandoPedido(true);

      const nuevaOrden = {
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        direccion: direccionLimpia,
        productos: carrito,
        total: totalCarrito,
        estado: "pendiente",
        fecha: new Date(),
      };

      await addDoc(collection(db, "ordenes"), nuevaOrden);

      const productosTexto = carrito
        .map((producto) => `• ${producto.nombre} - Q${producto.precio}`)
        .join("%0A");

      const mensaje = `Hola, soy ${nombreLimpio} y quiero realizar este pedido:%0A%0A${productosTexto}%0A%0ATotal: Q${totalCarrito}%0A%0ADirección de entrega: ${direccionLimpia}`;

      const linkWhatsapp = `https://wa.me/50252914227?text=${mensaje}`;

      setCarrito([]);
      setNombreCliente("");
      setTelefonoCliente("");
      setDireccionCliente("");
      setCarritoAbierto(false);
      setPedidoExitoso(linkWhatsapp);
    } catch (error) {
      console.log(error);
      mostrarToast("Error procesando pedido");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const productosFiltrados = productos.filter((producto) => {
    const textoBusqueda = busqueda.toLowerCase();

    const coincideNombre = producto.nombre
      ?.toLowerCase()
      .includes(textoBusqueda);

    const coincideDescripcion = producto.descripcion
      ?.toLowerCase()
      .includes(textoBusqueda);

    const coincideBusqueda = coincideNombre || coincideDescripcion;

    const coincideCategoria =
      categoria === "todos" ||
      (Array.isArray(producto.categorias)
        ? producto.categorias.includes(categoria)
        : producto.categoria === categoria);

    return coincideBusqueda && coincideCategoria;
  });

  return (
    <div className="w-full min-h-screen bg-[#F7EEE6] text-[#545454] font-sans antialiased overflow-x-clip relative flex flex-col items-center">

      {/* NAVBAR */}
      {/* BARRA DE AVISO */}
      <div className="w-full bg-[#545454] flex justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-center gap-2.5 px-6 py-2.5 text-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="1.8" className="shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs sm:text-sm font-medium tracking-wide text-white">
            Recuerda agendar tu pedido con anticipación
          </p>
        </div>
      </div>

      <header className="w-full sticky top-0 z-50 border-b border-black/[0.06] bg-[#F7EEE6]/90 backdrop-blur-md flex justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-between px-6 py-7 lg:px-12">

          {/* LOGO */}
          <a href="#inicio" className="shrink-0">
            <img src={logo} alt="Mil Amores GT" className="h-16 w-auto object-contain" />
          </a>

          {/* MENU DESKTOP */}
          <nav className="hidden items-center gap-12 md:flex">
            <a href="#inicio" className="text-sm uppercase tracking-widest text-[#545454]/60 transition-colors duration-300 hover:text-[#DFADAD]">
              Inicio
            </a>
            <a href="#catalogo" className="text-sm uppercase tracking-widest text-[#545454]/60 transition-colors duration-300 hover:text-[#DFADAD]">
              Catálogo
            </a>
            <a href="#beneficios" className="text-sm uppercase tracking-widest text-[#545454]/60 transition-colors duration-300 hover:text-[#DFADAD]">
              Beneficios
            </a>
          </nav>

          {/* DERECHA */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCarritoAbierto(!carritoAbierto)}
              className="relative flex items-center gap-2 text-sm uppercase tracking-widest font-medium text-[#545454] transition-colors duration-300 hover:text-[#DFADAD]"
            >
              <span className="relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 6L4.5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="20" r="1.3" />
                  <circle cx="18" cy="20" r="1.3" />
                </svg>
                {carrito.length > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#DFADAD] text-[10px] font-semibold text-white">
                    {carrito.length}
                  </span>
                )}
              </span>
              Carrito
            </button>

            <a
              href="https://wa.me/50252914227"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-none bg-[#545454] px-8 py-4 text-sm uppercase tracking-widest text-white shadow-md shadow-[#545454]/20 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-lg hover:shadow-[#DFADAD]/30 hover:-translate-y-0.5 md:block"
            >
              WhatsApp
            </a>

            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="flex h-8 w-8 items-center justify-center text-xl transition-colors duration-300 hover:text-[#DFADAD] md:hidden"
            >
              {menuAbierto ? "✕" : "≡"}
            </button>
          </div>
        </div>
      </header>

      {/* MENU MOBILE */}
      <AnimatePresence>
        {menuAbierto && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 top-[76px] z-40 bg-[#F7EEE6] border-b border-black/[0.06] px-8 py-10 shadow-lg md:hidden w-full flex justify-center"
          >
            <div className="flex flex-col gap-6 text-center w-full max-w-md">
              <a href="#inicio" className="text-sm uppercase tracking-widest text-[#545454]" onClick={() => setMenuAbierto(false)}>Inicio</a>
              <a href="#catalogo" className="text-sm uppercase tracking-widest text-[#545454]" onClick={() => setMenuAbierto(false)}>Catálogo</a>
              <a href="#beneficios" className="text-sm uppercase tracking-widest text-[#545454]" onClick={() => setMenuAbierto(false)}>Beneficios</a>
              <a href="https://wa.me/50252914227" target="_blank" rel="noreferrer" className="mt-4 rounded-none bg-[#545454] py-3.5 text-sm uppercase tracking-widest text-white">WhatsApp</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECCIÓN CONTENEDORA CENTRAL */}
      <main className="w-full max-w-[1400px] flex flex-col items-center">

        {/* 1. HERO */}
        <section id="inicio" className="relative w-full overflow-hidden px-6 py-28 lg:px-12 lg:py-40">
          {/* Textura decorativa sutil */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full border border-[#545454]" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#545454]" />
          </div>

          <div className="relative grid items-center gap-14 lg:grid-cols-[1.35fr_0.65fr] lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className=""
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-10 bg-[#DFADAD]" />
                <p className="text-sm font-medium tracking-[0.3em] text-[#DFADAD] uppercase">
                  Mil Amores GT
                </p>
              </div>

              <h2 className="mb-8 font-serif text-[3rem] font-light leading-[1.1] text-[#545454] sm:text-6xl sm:leading-[1.1] lg:text-[4.75rem] lg:leading-[1.08]">
                Regalos que <span className="italic text-[#DFADAD]">cuentan historias</span>
              </h2>

              <p className="mb-6 max-w-lg text-lg font-light leading-relaxed text-[#6B6B6B] sm:text-xl">
                Creamos detalles únicos y personalizados para celebrar a quienes más quieres.
              </p>

              <p className="mb-10 text-sm uppercase tracking-[0.25em] text-[#DFADAD]">
                Since 2023
              </p>

              <div className="mb-10 flex flex-wrap items-center gap-6">
                <a
                  href="#catalogo"
                  className="inline-block rounded-none bg-[#545454] px-12 py-5 text-base font-medium uppercase tracking-[0.15em] text-white shadow-lg shadow-[#545454]/25 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-xl hover:shadow-[#DFADAD]/35 hover:-translate-y-0.5"
                >
                  Explorar Catálogo
                </a>
                <a
                  href="https://wa.me/50252914227"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-none border border-[#E8D2D2] bg-white px-12 py-5 text-base font-medium uppercase tracking-[0.15em] text-[#545454] shadow-md shadow-black/[0.04] transition-all duration-300 hover:border-[#DFADAD] hover:text-[#DFADAD] hover:shadow-lg hover:-translate-y-0.5"
                >
                  WhatsApp
                </a>
              </div>

              <div className="flex items-center gap-4 text-xs uppercase tracking-[0.1em] text-[#9A9A9A]">
                <span>Sanarate, Guatemala</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-[#DFADAD]" />
                <span>Envíos nacionales</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[24px] border border-black/[0.05] bg-white shadow-xl shadow-[#545454]/5 lg:max-w-[480px]"
            >
              <img
                src={heroImage}
                alt="Mil Amores GT"
                className="aspect-[3/4] w-full rounded-[24px] object-cover"
              />
            </motion.div>
          </div>
        </section>

        {/* 2. CATALOGO */}
        <section id="catalogo" className="w-full border-t border-black/[0.06] px-6 pb-28 pt-28 lg:px-12 flex flex-col items-center">

          {/* TITULO */}
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-[#DFADAD]" />
              <p className="text-sm font-medium tracking-[0.3em] text-[#DFADAD] uppercase">
                Catálogo
              </p>
              <span className="h-px w-8 bg-[#DFADAD]" />
            </div>
            <h2 className="font-serif text-4xl font-light tracking-wide text-[#545454] lg:text-[3.25rem]">
              Productos
            </h2>
          </div>

          {/* FILTROS */}
          <div className="w-full mt-12 flex flex-col items-center gap-11" style={{ marginBottom: "3rem" }}>
            <input
              type="text"
              placeholder="Buscar Producto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-[560px] max-w-full border-b border-black/15 bg-transparent pb-4 text-center text-lg font-light tracking-wide text-[#545454] placeholder:text-[#B0B0B0] outline-none transition-colors duration-300 focus:border-[#DFADAD]"
            />

            <div className="flex flex-wrap justify-center gap-4">
              {["todos", "flores", "cajas de regalo", "joyas", "chocolates", "extras", "arreglos de temporada"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={`relative rounded-full text-sm uppercase tracking-widest font-medium py-3.5 px-8 transition-colors duration-300 ${
                    categoria === cat
                      ? "text-white"
                      : "text-[#545454]/60 border border-black/10 hover:border-[#DFADAD] hover:text-[#DFADAD]"
                  }`}
                >
                  {categoria === cat && (
                    <motion.span
                      layoutId="filtroActivo"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full bg-[#DFADAD]"
                    />
                  )}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* REJILLA DE PRODUCTOS */}
          <div className="w-full flex flex-wrap justify-center gap-x-12 gap-y-20">
            {loading ? (
              [...Array(3)].map((_, index) => (
                <div key={index} className="w-full sm:w-[calc(50%-24px)] lg:w-[calc(33.333%-32px)] space-y-4">
                  <div className="aspect-square animate-pulse rounded-[18px] bg-black/[0.04]" />
                  <div className="h-4 w-2/3 mx-auto rounded bg-black/[0.04]" />
                </div>
              ))
            ) : errorCarga ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="font-serif text-lg italic text-[#6B6B6B]">
                  No pudimos cargar los productos
                </p>
                <p className="text-xs uppercase tracking-widest text-[#9A9A9A]">
                  Revisa tu conexión e intenta de nuevo
                </p>
                <button
                  onClick={obtenerProductos}
                  className="mt-2 rounded-none bg-[#545454] px-8 py-3 text-xs uppercase tracking-widest font-medium text-white transition-all duration-300 hover:bg-[#DFADAD]"
                >
                  Reintentar
                </button>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="font-serif text-lg italic text-[#6B6B6B]">
                  No encontramos piezas con esos filtros
                </p>
                <p className="text-xs uppercase tracking-widest text-[#9A9A9A]">
                  Prueba con otra búsqueda o categoría
                </p>
              </div>
            ) : (
              productosFiltrados.map((producto, index) => (
                <motion.div
                  key={producto.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: (index % 3) * 0.1 }}
                  className="group flex w-full flex-col sm:w-[calc(50%-24px)] lg:w-[calc(33.333%-32px)]"
                >
                  <div className="relative overflow-hidden rounded-[20px] bg-white border border-black/[0.05] shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-[#545454]/5">
                    <div className="aspect-square overflow-hidden rounded-[20px]">
                      <img
                        src={producto.imagen}
                        alt={producto.nombre}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className="mt-7 flex flex-col items-center text-center">
                    <h3 className="font-serif text-2xl font-light text-[#545454]">
                      {producto.nombre}
                    </h3>
                    <p className="mt-3 text-sm font-light leading-relaxed text-[#9A9A9A] line-clamp-2 max-w-[260px]">
                      {producto.descripcion}
                    </p>
                    <div className="mt-2 font-sans text-2xl font-semibold text-[#DFADAD] tracking-wide"> Q{producto.precio}
</div>
                    <button
                      onClick={() => agregarCarrito(producto)}
                      className="mt-6 rounded-none bg-[#545454] px-9 py-3.5 text-sm uppercase tracking-widest font-medium text-white shadow-md shadow-[#545454]/20 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-lg hover:shadow-[#DFADAD]/30 hover:-translate-y-0.5"
                    >
                      Comprar
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* ESPACIADOR VISIBLE ENTRE SECCIONES */}
        <div className="w-full" style={{ height: "4rem" }} />

        {/* 3. BENEFICIOS */}
        <section id="beneficios" className="w-full border-t border-black/[0.06] py-20 px-6 lg:px-12">
          <div className="mx-auto grid max-w-[1400px] gap-16 sm:grid-cols-3 sm:gap-12 text-center w-full">
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#DFADAD]/30">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="1.3">
                  <path d="M12 2l7 4v6c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6l7-4z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-serif text-xl tracking-wide text-[#545454]">Regalos con amor y calidad</h3>
              <p className="text-base font-light leading-relaxed text-[#9A9A9A] max-w-[270px]">
                Seleccionamos cuidadosamente cada producto para ofrecerte lo mejor en cajas de regalo, ramos de flores y joyas. Detalles únicos, hechos con amor, para momentos inolvidables.
              </p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#DFADAD]/30">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="1.3">
                  <rect x="2.5" y="8" width="11" height="7" rx="0.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.5 10.5H17l3.5 3v1.5h-7z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6.5" cy="18" r="1.5" />
                  <circle cx="17.5" cy="18" r="1.5" />
                </svg>
              </div>
              <h3 className="font-serif text-xl tracking-wide text-[#545454]">Envíos seguros</h3>
              <p className="text-base font-light leading-relaxed text-[#9A9A9A] max-w-[270px]">
                Entregamos tus regalos de forma segura y confiable en todo el país. Empaque especial para que tu detalle llegue perfecto.
              </p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#DFADAD]/30">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="1.3">
                  <path d="M20.8 4.6a4.5 4.5 0 0 0-6.4 0L12 7l-2.4-2.4a4.5 4.5 0 1 0-6.4 6.4L12 19.6l8.8-8.6a4.5 4.5 0 0 0 0-6.4z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-serif text-xl tracking-wide text-[#545454]">Atención personalizada</h3>
              <p className="text-base font-light leading-relaxed text-[#9A9A9A] max-w-[270px]">
                Te ayudamos a elegir el regalo ideal. Asesoría directa por WhatsApp para personalizar tu pedido y hacerlo realmente especial.
              </p>
            </div>
          </div>
        </section>

        {/* ESPACIADOR VISIBLE ANTES DEL FOOTER */}
        <div className="w-full" style={{ height: "4rem" }} />
      </main>

      {/* OVERLAY Y PANEL DEL CARRITO */}
      <AnimatePresence>
        {carritoAbierto && (
          <>
            <motion.div
              key="overlay"
              onClick={() => setCarritoAbierto(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[998] bg-black/30 backdrop-blur-sm"
            />

            <motion.section
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed right-0 top-0 z-[999] h-screen w-full max-w-[560px] bg-white border-l border-black/[0.06] p-10 shadow-2xl"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-8">
                  <h3 className="font-serif text-3xl tracking-wider uppercase text-[#545454]">Tu Carrito</h3>
                  <button onClick={() => setCarritoAbierto(false)} className="text-3xl font-light text-[#9A9A9A] transition-colors duration-300 hover:text-[#545454]">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto py-8">
                  {carrito.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <h4 className="font-serif text-xl text-[#9A9A9A] italic mb-2">Tu carrito está vacío</h4>
                      <p className="text-sm uppercase tracking-widest text-[#B0B0B0]">Agrega piezas exclusivas</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {carrito.map((producto, index) => (
                        <div key={index} className="flex gap-6 border-b border-black/[0.06] pb-8">
                          <img src={producto.imagen} alt={producto.nombre} className="h-28 w-24 rounded-xl bg-[#F7EEE6] object-cover border border-black/[0.05]" />
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <h4 className="text-lg font-medium tracking-wide text-[#545454]">{producto.nombre}</h4>
                              <p className="mt-1.5 text-lg font-medium tracking-wider text-[#DFADAD]">Q {producto.precio}</p>
                            </div>
                            <button onClick={() => eliminarProducto(index)} className="self-start text-xs uppercase tracking-widest text-red-400 transition-colors duration-300 hover:text-red-600 hover:underline">Remover</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-black/[0.06] pt-8">
                  {carrito.length > 0 && (
                    <div className="mb-8 space-y-4">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={nombreCliente}
                        onChange={(e) =>
                          setNombreCliente(
                            e.target.value.replace(/[^A-Za-zÀ-ÿ\s'-]/g, "")
                          )
                        }
                        maxLength={80}
                        className="w-full rounded-xl border border-black/10 bg-[#F7EEE6] px-5 py-4 text-base outline-none transition focus:border-[#DFADAD]"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        placeholder="Tu teléfono (WhatsApp)"
                        value={telefonoCliente}
                        onChange={(e) => {
                          let valor = e.target.value.replace(/[^\d+]/g, "");
                          // Solo permite "+" al inicio
                          valor = valor.replace(/(?!^)\+/g, "");
                          setTelefonoCliente(valor);
                        }}
                        maxLength={16}
                        className="w-full rounded-xl border border-black/10 bg-[#F7EEE6] px-5 py-4 text-base outline-none transition focus:border-[#DFADAD]"
                      />
                      <textarea
                        placeholder="Dirección de entrega (calle, zona, referencia)"
                        value={direccionCliente}
                        onChange={(e) => setDireccionCliente(e.target.value)}
                        maxLength={200}
                        rows={3}
                        className="w-full rounded-xl border border-black/10 bg-[#F7EEE6] px-5 py-4 text-base outline-none transition focus:border-[#DFADAD] resize-none"
                      />
                    </div>
                  )}
                  <div className="mb-8 flex items-center justify-between">
                    <span className="text-base uppercase tracking-widest text-[#9A9A9A]">Subtotal</span>
                    <span className="font-serif text-3xl font-light text-[#545454]">Q {totalCarrito}</span>
                  </div>
                  <button
                    onClick={finalizarPedido}
                    disabled={enviandoPedido}
                    className="w-full rounded-none bg-[#545454] py-5 text-sm uppercase tracking-widest text-white shadow-lg shadow-[#545454]/25 transition-all duration-300 hover:bg-[#DFADAD] hover:shadow-xl hover:shadow-[#DFADAD]/35 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#545454] disabled:hover:shadow-lg"
                  >
                    {enviandoPedido ? "Enviando..." : "Finalizar Pedido por WhatsApp"}
                  </button>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER GENERAL */}
      <footer className="w-full bg-[#545454] text-white/90 flex justify-center">
        <div className="w-full max-w-[1400px] grid gap-y-12 gap-x-10 px-6 py-20 sm:grid-cols-3 lg:gap-x-16 lg:px-16">

          {/* SOBRE NOSOTROS */}
          <div className="space-y-5">
            <img src={logoDark} alt="Mil Amores GT" className="h-16 w-16 object-contain -ml-2" />
            <p className="max-w-sm text-sm font-light leading-relaxed text-white/50">
              Regalos que cuentan historias. Creamos detalles únicos y personalizados para celebrar a quienes más quieres.
            </p>
            <div className="flex flex-col gap-4 text-lg font-light text-white/50">
              <p>Sanarate, Guatemala · Envíos nacionales</p>
            </div>
          </div>

          {/* ENLACES */}
          <div className="space-y-5">
            <h3 className="text-base uppercase tracking-[0.2em] font-medium text-white">Enlaces</h3>
            <div className="flex flex-col gap-4 text-base font-light text-white/50">
              <a href="#inicio" className="transition-colors duration-300 hover:text-[#DFADAD] w-fit">Inicio</a>
              <a href="#catalogo" className="transition-colors duration-300 hover:text-[#DFADAD] w-fit">Catálogo</a>
              <a href="#beneficios" className="transition-colors duration-300 hover:text-[#DFADAD] w-fit">Beneficios</a>
            </div>
          </div>

          {/* SIGUENOS */}
          <div className="space-y-5">
            <h3 className="text-base uppercase tracking-[0.2em] font-medium text-white">Síguenos</h3>
            <div className="flex items-center gap-6">
              <a
                href="https://instagram.com/mil_amores.gt"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors duration-300 hover:border-[#DFADAD] hover:text-[#DFADAD]"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1DFdWWK8p5/?mibextid=wwXIfr"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors duration-300 hover:border-[#DFADAD] hover:text-[#DFADAD]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M15 4h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="https://wa.me/50252914227"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors duration-300 hover:border-[#DFADAD] hover:text-[#DFADAD]"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.7 8.4c-.3.5-.5 1-.4 1.7.2 1.7 1.7 3.7 3.3 4.7.9.6 2 .9 2.9.7.5-.1 1-.5 1.2-1l.1-.5c0-.1-.1-.2-.2-.3l-1.5-.7c-.1-.1-.3 0-.4.1l-.4.5c-.1.1-.2.1-.4.1-.6-.3-1.3-.8-1.8-1.5-.4-.5-.6-1-.7-1.4 0-.1 0-.3.1-.4l.5-.4c.1-.1.1-.2.1-.4l-.6-1.5c-.1-.1-.2-.2-.3-.2h-.5c-.4 0-.8.2-1 .5z" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </footer>

      <div className="w-full bg-[#545454] border-t border-white/[0.06] flex justify-center">
        <div className="w-full max-w-[1400px] flex flex-col items-center justify-center gap-1.5 px-6 py-6 lg:px-16">
          <span className="text-sm uppercase tracking-[0.15em] text-white/40">© 2026 Mil Amores GT. Todos los derechos reservados.</span>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=burrolaemiliano@gmail.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs tracking-wide text-white/25 transition-colors duration-300 hover:text-[#DFADAD]"
          >
            Sitio web hecho por Emiliano Burrola
          </a>
        </div>
      </div>

      {/* MODAL DE PEDIDO EXITOSO */}
      <AnimatePresence>
        {pedidoExitoso && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPedidoExitoso(null)}
              className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="fixed left-1/2 top-1/2 z-[1401] w-[92%] max-w-md bg-white p-10 text-center shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#DFADAD]/15">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DFADAD" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M7.5 12.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl font-light text-[#545454]">¡Pedido enviado!</h3>
              <p className="mt-3 text-sm font-light leading-relaxed text-[#6B6B6B]">
                Tu pedido quedó registrado. Ahora envía el mensaje por WhatsApp para confirmarlo con nosotros.
              </p>
              <a
                href={pedidoExitoso}
                target="_blank"
                rel="noreferrer"
                onClick={() => setPedidoExitoso(null)}
                className="mt-7 block w-full rounded-none bg-[#545454] py-4 text-sm uppercase tracking-widest text-white shadow-lg shadow-[#545454]/25 transition-all duration-300 hover:bg-[#DFADAD]"
              >
                Continuar a WhatsApp
              </a>
              <button
                onClick={() => setPedidoExitoso(null)}
                className="mt-4 text-xs uppercase tracking-widest text-[#9A9A9A] hover:text-[#545454]"
              >
                Cerrar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TOAST DE NOTIFICACIONES (reemplaza los alert() del navegador) */}
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
              className={`flex items-start gap-3 rounded-none border-l-4 bg-white px-5 py-4 shadow-2xl ${
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

    </div>
  );
}

