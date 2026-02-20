"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "../../componentes/MainLayout";
import { useAuth } from "../../context/authContext";
import {
  MapPin,
  Package,
  Star,
  CheckCircle,
  ShoppingBag,
  UserPlus,
  MessageCircle,
  Heart,
  Tag,
  ShoppingCart,
  ArrowLeft,
  Share2,
  Users,
  TrendingUp,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://offertabackend.onrender.com/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Business {
  _id: string;
  name: string;
  description: string;
  city: string;
  logo?: string;
  rating?: number;
  totalRatings?: number;
  verified?: boolean;
  owner?: string;
  followers?: string[];
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  stock?: number;
  image?: string;
  category: string;
}

interface SocialStatus {
  following: boolean;
  saved: boolean;
  myRating: number;
  followersCount: number;
  rating: number;
  totalRatings: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRankInfo(rating: number, total: number) {
  if (total < 3)
    return { label: "Nueva tienda", color: "#6b7280", bg: "#f3f4f6" };
  if (rating >= 4.5)
    return { label: "🏆 Top vendedor", color: "#92400e", bg: "#fef3c7" };
  if (rating >= 4.0)
    return { label: "⭐ Muy valorado", color: "#065f46", bg: "#d1fae5" };
  if (rating >= 3.0)
    return { label: "👍 Buena reputación", color: "#1e40af", bg: "#dbeafe" };
  return { label: "En desarrollo", color: "#6b7280", bg: "#f3f4f6" };
}

function DiscountBadge({ discount }: { discount?: number }) {
  if (!discount) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        background: "linear-gradient(135deg,#ef4444,#dc2626)",
        color: "#fff",
        fontSize: "0.72rem",
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      <Tag size={10} />-{discount}%
    </span>
  );
}

function ProductPrice({
  price,
  discount,
}: {
  price: number;
  discount?: number;
}) {
  if (!discount)
    return (
      <span
        style={{
          fontWeight: 700,
          color: "var(--primary,#f97316)",
          fontSize: "1.05rem",
        }}
      >
        ${price.toLocaleString()}
      </span>
    );
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontWeight: 700,
          color: "var(--primary,#f97316)",
          fontSize: "1.05rem",
        }}
      >
        ${Number(final).toLocaleString()}
      </span>
      <span
        style={{
          textDecoration: "line-through",
          color: "#9ca3af",
          fontSize: "0.8rem",
        }}
      >
        ${price.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({
  current,
  total,
  myRating,
  onRate,
  interactive = true,
}: {
  current: number;
  total: number;
  myRating: number;
  onRate?: (n: number) => void;
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const active = interactive ? hovered || myRating : current;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "flex-end",
      }}
    >
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={18}
            style={{
              cursor: interactive ? "pointer" : "default",
              transition: "transform 0.1s",
            }}
            fill={active >= s ? "#f97316" : "none"}
            stroke={active >= s ? "#f97316" : "#d1d5db"}
            onMouseEnter={() => interactive && setHovered(s)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(s)}
          />
        ))}
      </div>
      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
        {interactive && myRating ? `Tu voto: ${myRating}★ · ` : ""}
        {current.toFixed(1)} ({total} {total === 1 ? "voto" : "votos"})
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NegocioPublicoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [contactLoading, setContactLoading] = useState(false);

  const [social, setSocial] = useState<SocialStatus>({
    following: false,
    saved: false,
    myRating: 0,
    followersCount: 0,
    rating: 0,
    totalRatings: 0,
  });

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("marketplace_token")
      : null;

  // ── 1. Fetch negocio + productos ─────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    fetch(`${API}/business/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Business | null) => {
        if (!data) return;
        setBusiness(data);
        setSocial((prev) => ({
          ...prev,
          followersCount: data.followers?.length ?? 0,
          rating: data.rating ?? 0,
          totalRatings: data.totalRatings ?? 0,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`${API}/products?businessId=${id}&limit=40`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [id]);

  // ── 2. Social status personalizado ───────────────────────────────────────
  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API}/business/${id}/social`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SocialStatus | null) => {
        if (!data) return;
        setSocial((prev) => ({
          ...prev,
          following: data.following,
          saved: data.saved,
          myRating: data.myRating,
          followersCount: data.followersCount || prev.followersCount,
          rating: data.rating || prev.rating,
          totalRatings: data.totalRatings || prev.totalRatings,
        }));
      })
      .catch(console.error);
  }, [id, token]);

  // ── 3. Redirigir si es el dueño ──────────────────────────────────────────
  useEffect(() => {
    if (!business || !user) return;
    const userId = (user as any)._id || (user as any).id;
    const ownerId =
      typeof business.owner === "object"
        ? (business.owner as any)?._id
        : business.owner;
    if (userId && ownerId && userId === ownerId) router.replace("/negocio");
  }, [business, user]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const requireAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      icon: "info",
      title: "Necesitás una cuenta",
      text: "Iniciá sesión para realizar esta acción.",
      showCancelButton: true,
      confirmButtonText: "Iniciar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#f97316",
    });
    if (isConfirmed) router.push("/login");
  };

  const toast = async (icon: "success" | "info" | "error", title: string) => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({
      icon,
      title,
      timer: 1400,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  };

  // ── Social handlers ───────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!user || !token) {
      requireAuth();
      return;
    }
    const isFollowing = social.following;
    const res = await fetch(
      `${API}/business/${id}/${isFollowing ? "unfollow" : "follow"}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      const data = await res.json();
      setSocial((prev) => ({
        ...prev,
        following: !isFollowing,
        followersCount: data.followersCount,
      }));
      toast(
        "success",
        !isFollowing ? `✅ Siguiendo a ${business?.name}` : "Dejaste de seguir",
      );
    }
  };

  const handleLike = async () => {
    if (!user || !token) {
      requireAuth();
      return;
    }
    const isSaved = social.saved;
    const res = await fetch(
      `${API}/business/${id}/${isSaved ? "unfavorite" : "favorite"}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      setSocial((prev) => ({ ...prev, saved: !isSaved }));
      toast(
        "success",
        !isSaved ? "❤️ Guardado en favoritos" : "Quitado de favoritos",
      );
    }
  };

  const handleRate = async (rating: number) => {
    if (!user || !token) {
      requireAuth();
      return;
    }
    const res = await fetch(`${API}/business/${id}/rate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating }),
    });
    if (res.ok) {
      const data = await res.json();
      setSocial((prev) => ({
        ...prev,
        myRating: rating,
        rating: data.rating,
        totalRatings: data.totalRatings,
      }));
      toast("success", `⭐ Votaste con ${rating} estrellas`);
    }
  };

  // ── handleContact: escribe mensaje → crea conv → envía → muestra link ────
  const handleContact = async () => {
  if (!user) {
    requireAuth();
    return;
  }

  setContactLoading(true);
  try {
    const convRes = await fetch(`${API}/chat/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantId:
          typeof business?.owner === "object"
            ? (business.owner as any)?._id
            : business?.owner,
      }),
    });

    if (!convRes.ok) {
      const errBody = await convRes.json().catch(() => ({}));
      console.error("[handleContact] Error en /chat/start →", convRes.status, errBody);
      throw new Error(errBody?.error || "No se pudo crear la conversación");
    }

    const conv = await convRes.json();

    // Redirigir directo al chat
    router.push(`/chatpage?conversationId=${conv._id}`);
  } catch (err) {
    console.error(err);
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({
      icon: "error",
      title: "Error al abrir el chat",
      text: "No se pudo conectar con el negocio. Intentá de nuevo.",
      confirmButtonColor: "#f97316",
    });
  } finally {
    setContactLoading(false);
  }
};

  const addToCart = async (product: Product) => {
    if (!user) {
      requireAuth();
      return;
    }
    setCartItems((prev) => ({
      ...prev,
      [product._id]: (prev[product._id] || 0) + 1,
    }));
    toast("success", `🛒 ${product.name} agregado al carrito`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast("info", "🔗 Enlace copiado");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const cartTotal = Object.keys(cartItems).length;
  const rankInfo = getRankInfo(social.rating, social.totalRatings);

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (loading)
    return (
      <MainLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 16,
            color: "#6b7280",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #f97316",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <p>Cargando negocio...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </MainLayout>
    );

  if (!business)
    return (
      <MainLayout>
        <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
          <ShoppingBag
            size={56}
            strokeWidth={1}
            style={{ color: "#d1d5db", marginBottom: 16 }}
          />
          <h2 style={{ color: "#374151", marginBottom: 8 }}>
            Negocio no encontrado
          </h2>
          <p style={{ color: "#9ca3af", marginBottom: 24 }}>
            El negocio que buscás no existe o fue eliminado.
          </p>
          <Link
            href="/"
            style={{
              background: "#f97316",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </MainLayout>
    );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .pub-product-card  { animation: fadeUp 0.35s ease both; }
        .pub-product-card:hover .pub-product-img { transform: scale(1.04); }
        .pub-add-btn:hover:not(:disabled) { background: #ea580c !important; }
        .pub-social-btn:hover { opacity: 0.85; }
        .contact-btn-loading { opacity: .7; pointer-events: none; }
      `}</style>

      {/* ── Top bar ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "1rem 1.5rem 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.88rem",
          }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {cartTotal > 0 && (
            <Link
              href="/panel?tab=cart"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f97316",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              }}
            >
              <ShoppingCart size={15} /> Carrito ({cartTotal})
            </Link>
          )}
          <button
            onClick={handleShare}
            className="pub-social-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg-card,#fff)",
              border: "1.5px solid var(--border,#e5e7eb)",
              color: "#6b7280",
              padding: "7px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <Share2 size={15} /> Compartir
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div
        style={{
          background: "linear-gradient(135deg,#fff7ed 0%,#fff 60%)",
          borderBottom: "1px solid var(--border,#e5e7eb)",
          marginTop: "0.75rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "2rem 1.5rem",
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* Logo */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={
                business.logo ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&size=120&background=f97316&color=fff`
              }
              alt={business.name}
              style={{
                width: 110,
                height: 110,
                borderRadius: 20,
                objectFit: "cover",
                border: "3px solid #fff",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            {business.verified && (
              <span
                style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  background: "#10b981",
                  color: "#fff",
                  borderRadius: "50%",
                  padding: 4,
                  border: "2px solid #fff",
                }}
              >
                <CheckCircle size={14} />
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "var(--text,#111)",
                  margin: 0,
                }}
              >
                {business.name}
              </h1>
              {business.verified ? (
                <span
                  style={{
                    background: "#d1fae5",
                    color: "#065f46",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle size={11} />
                  Verificado
                </span>
              ) : (
                <span
                  style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                  }}
                >
                  No verificado
                </span>
              )}
              <span
                style={{
                  background: rankInfo.bg,
                  color: rankInfo.color,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <TrendingUp size={11} />
                {rankInfo.label}
              </span>
            </div>

            {business.description && (
              <p
                style={{
                  color: "#6b7280",
                  marginTop: 8,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                  maxWidth: 520,
                }}
              >
                {business.description}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {business.city && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#6b7280",
                    fontSize: "0.85rem",
                  }}
                >
                  <MapPin size={13} />
                  {business.city}
                </span>
              )}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#6b7280",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <Users size={13} />
                {social.followersCount}{" "}
                {social.followersCount === 1 ? "seguidor" : "seguidores"}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#6b7280",
                  fontSize: "0.85rem",
                }}
              >
                <Package size={13} />
                {products.length} productos
              </span>
            </div>
          </div>

          {/* Columna derecha */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleFollow}
                className="pub-social-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "9px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  transition: "all 0.2s",
                  border: `1.5px solid ${social.following ? "#f97316" : "var(--border,#e5e7eb)"}`,
                  background: social.following
                    ? "rgba(249,115,22,0.08)"
                    : "transparent",
                  color: social.following ? "#f97316" : "#6b7280",
                }}
              >
                <UserPlus size={15} />
                {social.following ? "Siguiendo" : "Seguir"}
              </button>

              <button
                onClick={handleLike}
                className="pub-social-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "9px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  transition: "all 0.2s",
                  border: `1.5px solid ${social.saved ? "#ef4444" : "var(--border,#e5e7eb)"}`,
                  background: social.saved
                    ? "rgba(239,68,68,0.07)"
                    : "transparent",
                  color: social.saved ? "#ef4444" : "#6b7280",
                }}
              >
                <Heart size={15} fill={social.saved ? "#ef4444" : "none"} />
                {social.saved ? "Guardado" : "Favorito"}
              </button>

              {/* ── Botón Contactar ── */}
              <button
                onClick={handleContact}
                disabled={contactLoading}
                className={`pub-social-btn${contactLoading ? " contact-btn-loading" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "9px 18px",
                  borderRadius: 10,
                  cursor: contactLoading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  background: "linear-gradient(135deg,#f97316,#ea580c)",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(249,115,22,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {contactLoading ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />{" "}
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageCircle size={15} />
                    Contactar
                  </>
                )}
              </button>
            </div>

            <StarRating
              current={social.rating}
              total={social.totalRatings}
              myRating={social.myRating}
              onRate={handleRate}
              interactive={!!user}
            />
            {!user && (
              <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                Iniciá sesión para votar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Products grid ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h2
          style={{
            fontWeight: 700,
            fontSize: "1.2rem",
            color: "var(--text,#111)",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShoppingBag size={18} /> Productos del negocio
        </h2>

        {productsLoading ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 220,
                  height: 280,
                  borderRadius: 14,
                  background:
                    "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.2s infinite",
                }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              color: "#9ca3af",
            }}
          >
            <ShoppingBag size={52} strokeWidth={1} />
            <p style={{ marginTop: 12 }}>
              Este negocio aún no tiene productos publicados.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {products.map((p, i) => (
              <div
                key={p._id}
                className="pub-product-card"
                style={{
                  background: "var(--bg-card,#fff)",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid var(--border,#e5e7eb)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  animationDelay: `${i * 0.04}s`,
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 8px 30px rgba(0,0,0,0.1)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.05)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(0)";
                }}
              >
                <div
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    aspectRatio: "4/3",
                  }}
                >
                  <img
                    src={
                      p.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=400&background=f97316&color=fff`
                    }
                    alt={p.name}
                    className="pub-product-img"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.35s ease",
                    }}
                  />
                  <DiscountBadge discount={p.discount} />
                  {(p.stock ?? 0) < 5 && (p.stock ?? 0) > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "#fef3c7",
                        color: "#92400e",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      ¡Últimas {p.stock}!
                    </span>
                  )}
                  {(p.stock ?? 0) === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                      >
                        Sin stock
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "0.9rem",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "var(--text,#111)",
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {p.name}
                  </h3>
                  {p.description && (
                    <p
                      style={{
                        color: "#9ca3af",
                        fontSize: "0.8rem",
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {p.description.slice(0, 60)}
                      {p.description.length > 60 ? "…" : ""}
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ProductPrice price={p.price} discount={p.discount} />
                    <button
                      onClick={() => addToCart(p)}
                      disabled={(p.stock ?? 0) === 0}
                      className="pub-add-btn"
                      style={{
                        background:
                          (p.stock ?? 0) === 0 ? "#e5e7eb" : "#f97316",
                        color: (p.stock ?? 0) === 0 ? "#9ca3af" : "#fff",
                        border: "none",
                        borderRadius: 9,
                        padding: "7px 12px",
                        cursor:
                          (p.stock ?? 0) === 0 ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background 0.2s",
                      }}
                    >
                      <ShoppingCart size={13} />
                      {cartItems[p._id] ? `(${cartItems[p._id]})` : "Agregar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
