"use client";
// app/page.tsx — ProductCard usa el CartContext global

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "../app/componentes/MainLayout";
import { useAuth } from "../app/context/authContext";
import { useCart } from "../app/context/cartContext";
import CategoryIcon from "../app/componentes/cateroryicon";
import { Tag, Crown, UserPlus, Users, Star } from "lucide-react";
import Link from "next/link";
import "../app/styles/home.css";

const API = process.env.NEXT_PUBLIC_API_URL || "https://offertabackend.onrender.com/api";

interface Product {
  _id: string; name: string; description: string; price: number;
  originalPrice?: number; discount?: number; image?: string; category?: string;
  rating?: number; reviews?: number; stock?: number;
  business?: {
    _id: string; name: string; city: string; logo?: string;
    verified?: boolean; followers?: string[]; rating?: number;
  };
}
interface FeaturedBusiness {
  _id: string; type: string; endDate: string;
  business: {
    _id: string; name: string; city: string; logo?: string;
    verified?: boolean; rating?: number; totalRatings?: number;
    totalProducts?: number; description?: string; followers?: string[];
  };
}
interface PublicStats { totalProducts: number; totalBusinesses: number; }

const CATEGORIES = [
  { slug: "tecnologia", name: "Tecnología",  iconName: "Cpu" },
  { slug: "ropa",       name: "Ropa",         iconName: "Shirt" },
  { slug: "alimentos",  name: "Alimentos",    iconName: "UtensilsCrossed" },
  { slug: "hogar",      name: "Hogar",        iconName: "Home" },
  { slug: "deportes",   name: "Deportes",     iconName: "Dumbbell" },
  { slug: "belleza",    name: "Belleza",      iconName: "Sparkles" },
  { slug: "mascotas",   name: "Mascotas",     iconName: "PawPrint" },
  { slug: "juguetes",   name: "Juguetes",     iconName: "Gamepad2" },
];

const imgUrl  = (url?: string) => url || "https://via.placeholder.com/300x200?text=Producto";
const logoUrl = (name: string, url?: string) =>
  url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=f97316&color=fff`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fillTo<T>(arr: T[], n: number): T[] {
  if (!arr.length) return [];
  const r: T[] = [];
  while (r.length < n) r.push(...arr);
  return r.slice(0, n);
}

function StarRow({ rating = 0, size = 13 }: { rating?: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          fill={s <= rounded ? "#f59e0b" : "none"}
          stroke={s <= rounded ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

// ─── ProductCard (usa CartContext global) ─────────────────────────────────────
function ProductCard({ product, currentUserId }: { product: Product; currentUserId?: string }) {
  const { addToCart } = useCart();
  const [liked,     setLiked]     = useState(false);
  const [following, setFollowing] = useState(false);
  const bizId          = product.business?._id;
  const followersCount = product.business?.followers?.length ?? 0;
  const bizRating      = product.business?.rating ?? 0;

  const needsAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon: "info", title: "Iniciá sesión", text: "Necesitás una cuenta para hacer esto.", timer: 2000, showConfirmButton: false });
  };

  const handleCart = () => {
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      image: product.image,
      businessId: product.business?._id,
      businessName: product.business?.name,
      stock: product.stock || 99,
    });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUserId) { needsAuth(); return; }
    setLiked(v => !v);
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon: "success", title: !liked ? "❤️ Guardado en favoritos" : "Quitado de favoritos", timer: 1000, showConfirmButton: false, toast: true, position: "top-end" });
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUserId) { needsAuth(); return; }
    setFollowing(v => !v);
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon: "success", title: !following ? `✅ Siguiendo a ${product.business?.name}` : "Dejaste de seguir", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
  };

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img src={imgUrl(product.image)} alt={product.name} loading="lazy" />
        {product.discount ? <span className="product-discount-badge">-{product.discount}%</span> : null}
        <button className="product-fav-btn" onClick={handleLike}
          style={{ color: liked ? "#ef4444" : undefined, fontSize: "1.1rem" }}>
          {liked ? "♥" : "♡"}
        </button>
      </div>
      <div className="product-body">
        {bizId ? (
          <Link href={`/negocio/${bizId}`} className="product-business" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            {product.business?.name || "Negocio"} · {product.business?.city || ""}
            {product.business?.verified && <span style={{ color: "#f97316", marginLeft: "0.2rem" }}>✓</span>}
          </Link>
        ) : (
          <div className="product-business">{product.business?.name || "Negocio"} · {product.business?.city || ""}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
          <StarRow rating={bizRating} />
          <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{bizRating > 0 ? bizRating.toFixed(1) : "Sin votos"}</span>
          {followersCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "0.72rem", color: "#9ca3af" }}>
              <Users size={11} />{followersCount} seguidores
            </span>
          )}
        </div>
        <div className="product-name">{product.name}</div>
        <div className="product-prices">
          <span className="product-price">${product.price.toLocaleString()}</span>
          {product.originalPrice && <span className="product-original">${product.originalPrice.toLocaleString()}</span>}
        </div>
      </div>
      <div className="product-card-footer" style={{ flexDirection: "column", gap: "0.45rem" }}>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleCart}>
          🛒 Agregar al carrito
        </button>
        <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
          <button onClick={handleFollow}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
              padding: "0.38rem", borderRadius: "8px",
              border: `1.5px solid ${following ? "#f97316" : "var(--border)"}`,
              background: following ? "rgba(249,115,22,0.08)" : "transparent",
              color: following ? "#f97316" : "var(--text-muted)",
              fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>
            <UserPlus size={13} />{following ? "Siguiendo" : "Seguir"}
          </button>
          {bizId && (
            <Link href={`/negocio/${bizId}`}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0.38rem", borderRadius: "8px", border: "1.5px solid var(--border)",
                color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s",
              }}>
              Visitar →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BusinessCard ─────────────────────────────────────────────────────────────
function BusinessCard({ featured, currentUserId }: { featured: FeaturedBusiness; currentUserId?: string }) {
  const b = featured.business;
  const [following, setFollowing] = useState(false);
  const followersCount = b.followers?.length ?? 0;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({ icon: "info", title: "Iniciá sesión", text: "Necesitás una cuenta para seguir negocios.", timer: 2000, showConfirmButton: false });
      return;
    }
    setFollowing(v => !v);
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon: "success", title: !following ? `✅ Siguiendo a ${b.name}` : "Dejaste de seguir", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
  };

  return (
    <div className="business-card" style={{ position: "relative" }}>
      <span style={{ position: "absolute", top: "0.6rem", right: "0.6rem", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", borderRadius: "999px", padding: "0.2rem 0.6rem", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <Crown size={10} /> Destacado
      </span>
      <Link href={`/negocio/${b._id}`} style={{ display: "contents" }}>
        <img src={logoUrl(b.name, b.logo)} alt={b.name} className="business-logo" style={{ cursor: "pointer" }} />
      </Link>
      <div className="business-info">
        <Link href={`/negocio/${b._id}`} style={{ textDecoration: "none" }}>
          <div className="business-name" style={{ cursor: "pointer" }}>
            {b.name}
            {b.verified && <span className="business-verified" title="Verificado">✓</span>}
          </div>
        </Link>
        <div className="business-city">📍 {b.city}</div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {b.description || "Negocio verificado en Offerton"}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
          <StarRow rating={b.rating ?? 0} size={14} />
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            {b.rating && b.rating > 0 ? `${b.rating.toFixed(1)} (${b.totalRatings ?? 0} votos)` : "Sin calificación"}
          </span>
        </div>
        <div className="business-meta" style={{ marginTop: "0.35rem" }}>
          {followersCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
              <Users size={12} />{followersCount} {followersCount === 1 ? "seguidor" : "seguidores"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
          <button onClick={handleFollow}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
              padding: "0.35rem", borderRadius: "8px",
              border: `1.5px solid ${following ? "#f97316" : "var(--border)"}`,
              background: following ? "rgba(249,115,22,0.08)" : "transparent",
              color: following ? "#f97316" : "var(--text-muted)",
              fontSize: "0.73rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>
            <UserPlus size={12} />{following ? "Siguiendo" : "Seguir"}
          </button>
          <Link href={`/negocio/${b._id}`}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.35rem", borderRadius: "8px", border: "1.5px solid var(--border)", color: "var(--text-muted)", fontSize: "0.73rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
            Visitar →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── HeroSlider ───────────────────────────────────────────────────────────────
function HeroSlider({ products }: { products: Product[] }) {
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    if (!products.length) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 3) % products.length); setFade(true); }, 350);
    }, 10000);
    return () => clearInterval(t);
  }, [products.length]);
  return (
    <div className="hero-visual" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.35s ease" }}>
      {products.slice(idx, idx + 3).map(p => (
        <div key={p._id} className="hero-card">
          <img src={imgUrl(p.image)} alt={p.name} />
          <div className="hero-card-body">
            <p>{p.name}</p>
            <span className="hero-card-price">${p.price.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HomeContent ──────────────────────────────────────────────────────────────
function HomeContent() {
  const { user, enableLocation, enableNotifications } = useAuth();
  const searchParams  = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const searchParam   = searchParams.get("search")   || "";

  const [allProducts,        setAllProducts]        = useState<Product[]>([]);
  const [displayProducts,    setDisplayProducts]    = useState<Product[]>([]);
  const [heroProducts,       setHeroProducts]       = useState<Product[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [publicStats,        setPublicStats]        = useState<PublicStats>({ totalProducts: 0, totalBusinesses: 0 });
  const [activeCategory,     setActiveCategory]     = useState(categoryParam);
  const [loadingProducts,    setLoadingProducts]    = useState(true);
  const [geoBannerDismissed, setGeoBannerDismissed]   = useState(false);
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);

  useEffect(() => { fetch(`${API}/products/public-stats`).then(r => r.json()).then(setPublicStats).catch(() => {}); }, []);

  useEffect(() => {
    setLoadingProducts(true);
    fetch(`${API}/products/random?limit=40`)
      .then(r => r.json())
      .then(data => {
        const p: Product[] = data.products || [];
        setAllProducts(p);
        setHeroProducts(fillTo(shuffle(p), 9));
        setDisplayProducts(fillTo(shuffle(p), 12));
      })
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/products/featured-businesses`)
      .then(r => r.json())
      .then(data => setFeaturedBusinesses(Array.isArray(data) ? data : []))
      .catch(() => setFeaturedBusinesses([]));
  }, []);

  useEffect(() => {
    if (!activeCategory && !searchParam) {
      setDisplayProducts(fillTo(shuffle(allProducts), 12));
      return;
    }
    const p = new URLSearchParams();
    if (activeCategory) p.set("category", activeCategory);
    if (searchParam)    p.set("search",   searchParam);
    p.set("limit", "40");
    setLoadingProducts(true);
    fetch(`${API}/products?${p}`)
      .then(r => r.json())
      .then(data => setDisplayProducts(fillTo(shuffle(data.products || []), 12)))
      .catch(() => setDisplayProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [activeCategory, searchParam, allProducts]);

  const handleRequestGeo = async () => {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({ title: "📍 Activar ubicación", html: "Necesitamos tu ubicación para mostrarte productos y ofertas <b>cercanas a vos</b>.", icon: "info", showCancelButton: true, confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" });
    if (result.isConfirmed) {
      const c = await enableLocation();
      Swal.fire(c
        ? { icon: "success", title: "¡Ubicación activada!", text: "Ahora verás ofertas cercanas a vos.", timer: 2000, showConfirmButton: false }
        : { icon: "error", title: "No se pudo activar", text: "Verificá los permisos de tu navegador." });
    }
    setGeoBannerDismissed(true);
  };

  const handleRequestNotifications = async () => {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({ title: "🔔 Activar notificaciones", html: "Recibí alertas de <b>ofertas exclusivas</b> y novedades de tus negocios favoritos.", icon: "info", showCancelButton: true, confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" });
    if (result.isConfirmed) {
      const ok = await enableNotifications();
      if (!ok) Swal.fire({ icon: "warning", title: "Permisos denegados", text: "Habilitá las notificaciones desde la configuración de tu navegador." });
    }
    setNotifBannerDismissed(true);
  };

  const sectionTitle = searchParam
    ? `Resultados para "${searchParam}"`
    : activeCategory
      ? (CATEGORIES.find(c => c.slug === activeCategory)?.name || activeCategory) + " — Ofertas"
      : user?.locationEnabled ? "📍 Ofertas cerca de vos" : "🔥 Ofertas del día";

  const currentUserId = (user as any)?._id || (user as any)?.id;

  return (
    <MainLayout>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-tag">⚡ Ofertas exclusivas hoy</div>
            <h1>Las mejores<br /><em>ofertas</em> cerca tuyo</h1>
            <p className="hero-desc">Descubrí productos increíbles de negocios verificados. Filtrá por categoría, ubicación y precio.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }}
                onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>
                Ver ofertas
              </button>
              {!user && <a href="/register" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Registrarse gratis</a>}
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">{publicStats.totalProducts > 0 ? `+${publicStats.totalProducts.toLocaleString()}` : "—"}</span><span className="hero-stat-label">Productos</span></div>
              <div className="hero-stat"><span className="hero-stat-num">{publicStats.totalBusinesses > 0 ? `+${publicStats.totalBusinesses.toLocaleString()}` : "—"}</span><span className="hero-stat-label">Negocios</span></div>
              <div className="hero-stat"><span className="hero-stat-num">98%</span><span className="hero-stat-label">Satisfacción</span></div>
            </div>
          </div>
          {heroProducts.length > 0 && <HeroSlider products={heroProducts} />}
        </div>
      </section>

      {!user?.locationEnabled && !geoBannerDismissed && (
        <div style={{ padding: "1.5rem 1.5rem 0" }}>
          <div className="geo-banner">
            <span className="geo-banner-icon">📍</span>
            <div className="geo-banner-text"><h3>¿Querés ver ofertas cerca tuyo?</h3><p>Activá tu ubicación y mostramos los mejores productos de negocios de tu zona.</p></div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestGeo}>Activar ubicación</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={() => setGeoBannerDismissed(true)}>✕</button>
            </div>
          </div>
        </div>
      )}
      {user && !user.notificationsEnabled && !notifBannerDismissed && (
        <div style={{ padding: "1rem 1.5rem 0" }}>
          <div className="geo-banner" style={{ borderColor: "rgba(249,115,22,0.3)" }}>
            <span className="geo-banner-icon">🔔</span>
            <div className="geo-banner-text"><h3>¡Activá las notificaciones!</h3><p>Hola {user.name.split(" ")[0]}, no te pierdas ofertas exclusivas ni rebajas de tus favoritos.</p></div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestNotifications}>Activar</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={() => setNotifBannerDismissed(true)}>✕</button>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <div className="section-header">
          <div><h2 className="section-title">Categorías</h2><p className="section-subtitle">Explorá por rubro</p></div>
        </div>
        <div className="categories-grid">
          <div className={`category-card ${!activeCategory ? "active" : ""}`} onClick={() => setActiveCategory("")}>
            <Tag size={30} strokeWidth={2.5} /><span className="category-name">Todas</span>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.slug} className={`category-card ${activeCategory === cat.slug ? "active" : ""}`} onClick={() => setActiveCategory(cat.slug)}>
              <CategoryIcon name={cat.iconName} size={24} strokeWidth={1.75} />
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="offers">
        <div className="section-header">
          <div>
            <h2 className="section-title">{sectionTitle}</h2>
            <p className="section-subtitle">{displayProducts.length} productos encontrados</p>
          </div>
          {displayProducts.length > 8 && <span className="section-link">Ver todos →</span>}
        </div>
        {loadingProducts ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div><p>Cargando ofertas...</p>
          </div>
        ) : displayProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
            <h3>No encontramos resultados</h3><p>Probá con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="products-grid">
            {displayProducts.map((p, i) => (
              <ProductCard key={`${p._id}-${i}`} product={p} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>

      <div className="banner" style={{ margin: "0 1.5rem" }}>
        <div><h2>¿Tenés un negocio?</h2><p>Publicá tus productos y llegá a miles de clientes cerca tuyo.</p></div>
        <a href="/register" className="btn btn-white">¡Empezar gratis!</a>
      </div>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">🏪 Negocios destacados</h2>
            <p className="section-subtitle">
              {featuredBusinesses.length > 0
                ? `${featuredBusinesses.length} negocio${featuredBusinesses.length !== 1 ? "s" : ""} con destacado activo`
                : "Los más valorados por la comunidad"}
            </p>
          </div>
        </div>
        {featuredBusinesses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <Crown size={40} strokeWidth={1} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
            <p>No hay negocios destacados en este momento.</p>
          </div>
        ) : (
          <div className="businesses-grid">
            {featuredBusinesses.map(f => (
              <BusinessCard key={f._id} featured={f} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p>Cargando ofertas...</p>
        </div>
      </MainLayout>
    }>
      <HomeContent />
    </Suspense>
  );
}