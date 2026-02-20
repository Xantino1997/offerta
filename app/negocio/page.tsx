"use client";

import { useAuth } from "../context/authContext";
import { useEffect, useState } from "react";
import MainLayout from "../componentes/MainLayout";
import "../styles/negocio.css";
import "../styles/negocio-products.css";
import { useRouter, useParams } from "next/navigation";

import {
  MapPin, Package, Star, CheckCircle, Edit, Save, Camera,
  Plus, Pencil, Trash2, ShoppingBag, X, Tag, ArrowRight,
  LayoutList, UserPlus, MessageCircle, Heart, Users, TrendingUp,
  Cpu, Shirt, UtensilsCrossed, Home, Dumbbell, Sparkles, PawPrint, Gamepad2,
} from "lucide-react";

import {
  getMyProducts, createProduct, updateProduct, deleteProduct,
  CATEGORIES, type Product,
} from "../lib/productService";
import ProductModal from "../componentes/ProductModal";

const API = process.env.NEXT_PUBLIC_API_URL || "https://offertabackend.onrender.com/api";

// ─── Categorías del negocio ───────────────────────────────────────────────────
const BUSINESS_CATEGORIES = [
  { slug: "tecnologia", name: "Tecnología",  Icon: Cpu             },
  { slug: "ropa",       name: "Ropa",        Icon: Shirt           },
  { slug: "alimentos",  name: "Alimentos",   Icon: UtensilsCrossed },
  { slug: "hogar",      name: "Hogar",       Icon: Home            },
  { slug: "deportes",   name: "Deportes",    Icon: Dumbbell        },
  { slug: "belleza",    name: "Belleza",     Icon: Sparkles        },
  { slug: "mascotas",   name: "Mascotas",    Icon: PawPrint        },
  { slug: "juguetes",   name: "Juguetes",    Icon: Gamepad2        },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Business {
  _id?: string;
  name: string;
  description: string;
  city: string;
  logo?: string;
  logoPublicId?: string;
  rating?: number;
  totalRatings?: number;
  totalProducts?: number;
  verified?: boolean;
  owner?: string;
  followers?: string[];
  categories?: string[];
}

interface SocialStatus {
  following: boolean;
  saved: boolean;
  myRating: number;
  followersCount: number;
  rating: number;
  totalRatings: number;
}

const negocioVacio: Business = {
  name: "", description: "", city: "",
  logo: "/assets/offerton.jpg", rating: 0,
  totalProducts: 0, verified: false, followers: [],
  categories: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProductPrice({ price, discount }: { price: number; discount?: number }) {
  if (!discount || discount === 0)
    return <span className="ng-price">${price.toLocaleString()}</span>;
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <div className="ng-price-wrap">
      <span className="ng-price-final">${Number(final).toLocaleString()}</span>
      <span className="ng-price-original">${price.toLocaleString()}</span>
    </div>
  );
}

function getRankInfo(rating: number, total: number) {
  if (total < 3)     return { label: "Nueva tienda",        color: "#6b7280", bg: "#f3f4f6" };
  if (rating >= 4.5) return { label: "🏆 Top vendedor",     color: "#92400e", bg: "#fef3c7" };
  if (rating >= 4.0) return { label: "⭐ Muy valorado",     color: "#065f46", bg: "#d1fae5" };
  if (rating >= 3.0) return { label: "👍 Buena reputación", color: "#1e40af", bg: "#dbeafe" };
  return { label: "En desarrollo", color: "#6b7280", bg: "#f3f4f6" };
}

// ─── Selector de Categorías (máx 2) ──────────────────────────────────────────
function CategorySelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (cats: string[]) => void;
}) {
  const toggle = (slug: string) => {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else if (selected.length < 2) {
      onChange([...selected, slug]);
    }
  };

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>
        Categorías del negocio
        <span style={{ fontWeight: 400, marginLeft: 4 }}>
          ({selected.length}/2 seleccionadas)
        </span>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        {BUSINESS_CATEGORIES.map(({ slug, name, Icon }) => {
          const active   = selected.includes(slug);
          const disabled = !active && selected.length >= 2;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              disabled={disabled}
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.38rem 0.85rem", borderRadius: 20,
                border: `1.5px solid ${active ? "#f97316" : disabled ? "#e5e7eb" : "#d1d5db"}`,
                background: active ? "rgba(249,115,22,0.1)" : disabled ? "#f9fafb" : "#fff",
                color: active ? "#ea580c" : disabled ? "#9ca3af" : "#374151",
                fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "all 0.18s",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Icon size={13} />
              {name}
            </button>
          );
        })}
      </div>
      {selected.length === 2 && (
        <p style={{ fontSize: "0.73rem", color: "#f97316", marginTop: "0.35rem", fontWeight: 600 }}>
          Máximo 2 categorías. Deseleccioná una para cambiar.
        </p>
      )}
    </div>
  );
}

// ─── Badges de categorías (vista) ────────────────────────────────────────────
function CategoryBadges({ categories }: { categories?: string[] }) {
  if (!categories || categories.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
      {categories.map((slug) => {
        const cat = BUSINESS_CATEGORIES.find((c) => c.slug === slug);
        if (!cat) return null;
        const { Icon, name } = cat;
        return (
          <span key={slug} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(249,115,22,0.1)", color: "#ea580c",
            border: "1px solid rgba(249,115,22,0.25)",
            borderRadius: 20, padding: "0.25rem 0.7rem",
            fontSize: "0.75rem", fontWeight: 600,
          }}>
            <Icon size={11} />{name}
          </span>
        );
      })}
    </div>
  );
}

// ─── Widget de Estrellas ──────────────────────────────────────────────────────
function StarRating({
  current, total, myRating, onRate, readonly = false,
}: {
  current: number; total: number; myRating: number;
  onRate?: (n: number) => void; readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s} size={16}
            style={{ cursor: readonly ? "default" : "pointer", transition: "transform 0.1s" }}
            fill={(readonly ? current : (hovered || myRating)) >= s ? "#f97316" : "none"}
            stroke={(readonly ? current : (hovered || myRating)) >= s ? "#f97316" : "#d1d5db"}
            onMouseEnter={() => !readonly && setHovered(s)}
            onMouseLeave={() => !readonly && setHovered(0)}
            onClick={() => !readonly && onRate?.(s)}
          />
        ))}
      </div>
      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
        {!readonly && myRating ? `Tu voto: ${myRating}★ · ` : ""}
        {current.toFixed(1)} ({total} {total === 1 ? "voto" : "votos"})
      </span>
    </div>
  );
}

// ─── Panel Visitante ──────────────────────────────────────────────────────────
function VisitorPanel({
  business, social, onFollow, onLike, onContact,
}: {
  business: Business;
  social: SocialStatus;
  onFollow: () => void;
  onLike: () => void;
  onContact: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <button
        onClick={onFollow}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1.1rem", borderRadius: "10px",
          border: `1.5px solid ${social.following ? "#f97316" : "var(--border)"}`,
          background: social.following ? "rgba(249,115,22,0.08)" : "transparent",
          color: social.following ? "#f97316" : "var(--text-muted)",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <UserPlus size={15} />
        {social.following ? "Siguiendo" : "Seguir negocio"}
      </button>

      <button
        onClick={onLike}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1.1rem", borderRadius: "10px",
          border: `1.5px solid ${social.saved ? "#ef4444" : "var(--border)"}`,
          background: social.saved ? "rgba(239,68,68,0.07)" : "transparent",
          color: social.saved ? "#ef4444" : "var(--text-muted)",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <Heart size={15} fill={social.saved ? "#ef4444" : "none"} />
        {social.saved ? "Guardado" : "Favorito"}
      </button>

      <button
        onClick={onContact}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1.25rem", borderRadius: "10px",
          border: "none", background: "linear-gradient(135deg,#f97316,#ea580c)",
          color: "#fff", fontSize: "0.85rem", fontWeight: 600,
          cursor: "pointer", transition: "all 0.2s",
          boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
        }}
      >
        <MessageCircle size={15} />Contactar
      </button>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function NegocioPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const params   = useParams();
  const bizIdParam = params?.id as string | undefined;

  const [business, setBusiness]                     = useState<Business>(negocioVacio);
  const [editing, setEditing]                       = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // undefined = todavía leyendo localStorage | null = sin sesión | string = con token
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [isOwner, setIsOwner]           = useState(false);

  const [products, setProducts]               = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [modalOpen, setModalOpen]             = useState(false);
  const [editTarget, setEditTarget]           = useState<Product | null>(null);
  const [productSaving, setProductSaving]     = useState(false);

  const [social, setSocial] = useState<SocialStatus>({
    following: false, saved: false, myRating: 0,
    followersCount: 0, rating: 0, totalRatings: 0,
  });

  const [unreadChats, setUnreadChats]   = useState(0);
  const [latestConvId, setLatestConvId] = useState<string | null>(null);

  // ── Leer token ──
  useEffect(() => {
    setToken(localStorage.getItem("marketplace_token"));
  }, []);

  // ── Fetch negocio ──
  useEffect(() => {
    if (token === undefined) return;       // todavía leyendo localStorage
    if (!bizIdParam && !token) return;     // página propia sin sesión

    const fetchBusiness = async () => {
      try {
        if (bizIdParam) {
          const res = await fetch(`${API}/business/${bizIdParam}`);
          if (res.ok) {
            const data = await res.json();
            setBusiness(data);
            setSelectedCategories(data.categories || []);
            const userId = (user as any)?._id || (user as any)?.id;
            setIsOwner(data.owner === userId || data.owner?._id === userId);
          }
        } else {
          // Página propia: siempre es el dueño si está logueado
          setIsOwner(true);
          const res = await fetch(`${API}/business/my-business`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setBusiness(data);
            setSelectedCategories(data.categories || []);
          } else if (res.status === 404) {
            // Primera vez: abrir modo edición con formulario vacío
            setBusiness(negocioVacio);
            setSelectedCategories([]);
            setEditing(true);
          }
        }
      } catch (e) {
        console.error("Error cargando negocio:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [token, bizIdParam, user]);

  // ── Fetch social ──
  useEffect(() => {
    if (!bizIdParam || !token) return;
    fetch(`${API}/business/${bizIdParam}/social`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSocial(data); })
      .catch(console.error);
  }, [bizIdParam, token]);

  // ── Fetch productos ──
  useEffect(() => {
    if (token === undefined) return;
    if (!bizIdParam && !token) return;

    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        if (bizIdParam) {
          const res  = await fetch(`${API}/products?businessId=${bizIdParam}&limit=20`);
          const data = await res.json();
          setProducts(data.products || []);
        } else {
          setProducts(await getMyProducts());
        }
      } catch { setProducts([]); }
      finally  { setProductsLoading(false); }
    };

    fetchProducts();
  }, [token, bizIdParam]);

  // ── Polling chats ──
  useEffect(() => {
    if (!token || !isOwner) return;
    const checkChats = async () => {
      try {
        const res = await fetch(`${API}/chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const unread = data.filter((c: any) => (c.unreadCount ?? c.unread ?? 0) > 0);
        setUnreadChats(unread.length);
        if (unread.length > 0) setLatestConvId(unread[0]._id);
      } catch {}
    };
    checkChats();
    const interval = setInterval(checkChats, 15000);
    return () => clearInterval(interval);
  }, [token, isOwner]);

  // ── Handlers ──
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      const esNuevo = !business._id;
      const fd = new FormData();
      fd.append("name", business.name);
      fd.append("description", business.description);
      fd.append("city", business.city);
      // Categorías como JSON string para que el backend las parsee fácil
      fd.append("categories", JSON.stringify(selectedCategories));
      if (selectedFile) fd.append("logo", selectedFile);

      const res  = await fetch(`${API}/business`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando");

      setBusiness(data);
      setSelectedCategories(data.categories || []);
      setEditing(false); setSelectedFile(null); setLogoPreview(null);
      showToast("success", esNuevo ? "¡Negocio creado con éxito!" : "¡Negocio actualizado!");
    } catch (error: any) {
      showToast("error", error.message || "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSelectedFile(null);
    setLogoPreview(null);
    // Restaurar categorías al último estado guardado
    setSelectedCategories(business.categories || []);
  };

  const requireAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({
      icon: "info", title: "Iniciá sesión",
      text: "Necesitás una cuenta para hacer esto.",
      timer: 2000, showConfirmButton: false,
    });
  };

  const handleFollow = async () => {
    if (!token) { requireAuth(); return; }
    const isFollowing = social.following;
    const res = await fetch(`${API}/business/${bizIdParam}/${isFollowing ? "unfollow" : "follow"}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSocial(prev => ({ ...prev, following: !isFollowing, followersCount: data.followersCount }));
      showToast("success", !isFollowing ? `Siguiendo a ${business.name}` : "Dejaste de seguir");
    }
  };

  const handleLike = async () => {
    if (!token) { requireAuth(); return; }
    const isSaved = social.saved;
    const res = await fetch(`${API}/business/${bizIdParam}/${isSaved ? "unfavorite" : "favorite"}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSocial(prev => ({ ...prev, saved: !isSaved }));
      showToast("success", !isSaved ? "Guardado en favoritos" : "Quitado de favoritos");
    }
  };

  const handleRate = async (rating: number) => {
    if (!token) { requireAuth(); return; }
    const res = await fetch(`${API}/business/${bizIdParam}/rate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (res.ok) {
      const data = await res.json();
      setSocial(prev => ({ ...prev, myRating: rating, rating: data.rating, totalRatings: data.totalRatings }));
      showToast("success", `Votaste con ${rating} estrellas`);
    }
  };

  const handleContact = async () => {
    if (!token) { requireAuth(); return; }
    try {
      const convRes = await fetch(`${API}/chat/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId:
            typeof business?.owner === "object"
              ? (business.owner as any)?._id
              : business?.owner,
        }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      router.push(`/chatpage?conversationId=${conv._id}`);
    } catch {
      showToast("error", "No se pudo abrir el chat. Intentá de nuevo.");
    }
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (p: Product) => { setEditTarget(p); setModalOpen(true); };

  const handleProductSubmit = async (formData: FormData) => {
    try {
      setProductSaving(true);
      if (editTarget) {
        const updated = await updateProduct(editTarget._id, formData);
        setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
      } else {
        const created = await createProduct(formData);
        setProducts(prev => [created, ...prev]);
      }
      setModalOpen(false);
      showToast("success", editTarget ? "Producto actualizado" : "¡Producto agregado!");
    } catch (e: any) { showToast("error", e.message || "Error al guardar"); }
    finally { setProductSaving(false); }
  };

  const handleDeleteProduct = async (p: Product) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${p.name}" será eliminado permanentemente.`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Eliminar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await deleteProduct(p._id);
      setProducts(prev => prev.filter(x => x._id !== p._id));
      showToast("success", "Producto eliminado");
    } catch (e: any) { showToast("error", e.message || "Error al eliminar"); }
  };

  const showToast = async (icon: "success" | "error", title: string) => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon, title, timer: 1800, showConfirmButton: false, toast: true, position: "top-end" });
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find(c => c.value === value)?.label ?? value;

  const currentLogo         = logoPreview || business.logo || "/assets/offerton.jpg";
  const followersCount      = isOwner ? (business.followers?.length ?? 0) : social.followersCount;
  const displayRating       = isOwner ? (business.rating ?? 0)            : social.rating;
  const displayTotalRatings = isOwner ? (business.totalRatings ?? 0)      : social.totalRatings;
  const rankInfo            = getRankInfo(displayRating, displayTotalRatings);

  if (loading) {
    return (
      <MainLayout>
        <div className="negocio-loading-full">
          <div className="negocio-spinner" />
          <p>Cargando negocio...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>

      {/* ── BANNER CHATS NO LEÍDOS ── */}
      {isOwner && unreadChats > 0 && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.5rem" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
            border: "1.5px solid #fed7aa", borderRadius: 14,
            padding: "0.85rem 1.25rem", gap: "0.75rem", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: "#f97316", color: "#fff", borderRadius: "50%",
                width: 36, height: 36, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "0.85rem", fontWeight: 800,
                flexShrink: 0, boxShadow: "0 2px 8px rgba(249,115,22,0.4)",
              }}>
                {unreadChats}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#9a3412", fontSize: "0.93rem" }}>
                  💬 {unreadChats === 1 ? "Tenés 1 mensaje nuevo" : `Tenés ${unreadChats} chats sin leer`}
                </p>
                <p style={{ margin: 0, color: "#c2410c", fontSize: "0.78rem" }}>
                  Clientes esperando tu respuesta
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(latestConvId ? `/chatpage?conversationId=${latestConvId}` : "/chatpage")}
              style={{
                background: "#f97316", color: "#fff", border: "none",
                borderRadius: 10, padding: "0.5rem 1.2rem",
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(249,115,22,0.35)", whiteSpace: "nowrap",
              }}
            >
              <MessageCircle size={14} /> Ver chat
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="negocio-hero">
        <div className="negocio-wrapper">

          {/* Avatar */}
          <div className="negocio-avatar-container">
            <img src={currentLogo} alt={business.name} className="negocio-avatar" />
            {editing && isOwner && (
              <label className="avatar-upload" title="Cambiar foto">
                <Camera size={15} />
                <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="negocio-info">

            {/* Aviso primera vez */}
            {isOwner && !bizIdParam && !business._id && editing && (
              <div style={{
                background: "#fff7ed", border: "1.5px dashed #f97316",
                borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "0.75rem",
                color: "#9a3412", fontSize: "0.85rem", fontWeight: 600,
              }}>
                👋 Bienvenido. Completá los datos de tu negocio y guardá para crearlo.
              </div>
            )}

            {editing && isOwner ? (
              <div className="negocio-edit-fields">
                <input
                  className="negocio-input" placeholder="Nombre del negocio"
                  value={business.name}
                  onChange={e => setBusiness({ ...business, name: e.target.value })}
                />
                <textarea
                  className="negocio-textarea" placeholder="Descripción"
                  value={business.description}
                  onChange={e => setBusiness({ ...business, description: e.target.value })}
                />
                <input
                  className="negocio-input" placeholder="Ciudad"
                  value={business.city}
                  onChange={e => setBusiness({ ...business, city: e.target.value })}
                />

                {/* ── Selector de categorías ── */}
                <CategorySelector
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h1 className="negocio-title">{business.name || "Tu Negocio"}</h1>
                  <span style={{
                    background: rankInfo.bg, color: rankInfo.color,
                    fontSize: "0.72rem", fontWeight: 700,
                    padding: "3px 9px", borderRadius: 20,
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <TrendingUp size={10} />{rankInfo.label}
                  </span>
                </div>

                {business.verified
                  ? <span className="negocio-badge"><CheckCircle size={13} /> Verificado</span>
                  : <span className="negocio-badge unverified">Comercio no verificado</span>
                }

                {/* Badges de categorías */}
                <CategoryBadges categories={business.categories} />

                <p className="negocio-description">
                  {business.description || "Agrega una descripción de tu negocio."}
                </p>

                <div className="negocio-meta">
                  <span><MapPin size={13} /> {business.city || "Ciudad no definida"}</span>

                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                    <Users size={13} />
                    {followersCount} {followersCount === 1 ? "seguidor" : "seguidores"}
                  </span>

                  {isOwner ? (
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s} size={15}
                          className={s <= Math.round(displayRating) ? "star-filled" : "star-empty"}
                        />
                      ))}
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: 4 }}>
                        {displayRating.toFixed(1)} ({displayTotalRatings})
                      </span>
                    </div>
                  ) : (
                    <StarRating
                      current={social.rating}
                      total={social.totalRatings}
                      myRating={social.myRating}
                      onRate={handleRate}
                    />
                  )}

                  <span><Package size={13} /> {products.length} productos</span>
                </div>
              </>
            )}
          </div>

          {/* Acciones según rol */}
          <div className="negocio-hero-actions">
            {isOwner ? (
              editing ? (
                <>
                  {/* Cancelar solo si el negocio ya fue creado antes */}
                  {business._id && (
                    <button onClick={handleCancelEdit} className="negocio-btn cancel" disabled={saving}>
                      <X size={14} /> Cancelar
                    </button>
                  )}
                  <button onClick={handleSave} className="negocio-btn save" disabled={saving}>
                    <Save size={14} />
                    {saving ? "Guardando..." : business._id ? "Guardar" : "Crear negocio"}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="negocio-btn">
                  <Edit size={14} /> Editar negocio
                </button>
              )
            ) : (
              <VisitorPanel
                business={business}
                social={social}
                onFollow={handleFollow}
                onLike={handleLike}
                onContact={handleContact}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCTOS ── */}
      <div className="negocio-products-section">
        <div className="negocio-products-header">
          <div>
            <h2 className="negocio-products-title">
              <ShoppingBag size={19} />Productos publicados
            </h2>
            <p className="negocio-products-subtitle">
              {products.length} producto{products.length !== 1 ? "s" : ""}
              {isOwner && products.length >= 20 && (
                <span className="negocio-limit-warn"> · Límite alcanzado</span>
              )}
            </p>
          </div>
          {isOwner && (
            <div className="ng-header-actions">
              <button className="ng-btn-manage" onClick={() => router.push("/mis-productos")}>
                <LayoutList size={15} />Gestionar productos<ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {productsLoading ? (
          <div className="negocio-products-loading">
            <div className="negocio-spinner" /><p>Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="negocio-products-empty">
            <ShoppingBag size={52} strokeWidth={1} />
            <h3>No hay productos aún</h3>
            <p>
              {isOwner
                ? "Publicá tu primer producto y empezá a vender."
                : "Este negocio aún no tiene productos publicados."}
            </p>
            {isOwner && (
              <button className="negocio-btn-add" style={{ marginTop: "0.5rem" }} onClick={openCreate}>
                <Plus size={15} /> Agregar producto
              </button>
            )}
          </div>
        ) : (
          <div className="negocio-products-grid">
            {products.map(p => (
              <div key={p._id} className="negocio-product-card">
                <div className="negocio-product-img-wrap">
                  <img
                    src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=400&background=f97316&color=fff`}
                    alt={p.name} className="negocio-product-img"
                  />
                  <span className="negocio-product-category">{getCategoryLabel(p.category)}</span>
                  {p.discount && p.discount > 0
                    ? <span className="ng-ribbon">-{p.discount}%</span>
                    : null
                  }
                  {isOwner && (
                    <div className="negocio-product-actions">
                      <button className="negocio-product-action-btn" title="Editar" onClick={() => openEdit(p)}>
                        <Pencil size={13} />
                      </button>
                      <button className="negocio-product-action-btn danger" title="Eliminar" onClick={() => handleDeleteProduct(p)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="negocio-product-info">
                  <h3 className="negocio-product-name">{p.name}</h3>
                  {p.description && (
                    <p className="negocio-product-desc">
                      {p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}
                    </p>
                  )}
                  <div className="negocio-product-footer">
                    <ProductPrice price={p.price} discount={p.discount} />
                    <span className={`negocio-product-stock ${(p.stock ?? 0) < 5 ? "low" : "ok"}`}>
                      Stock: {p.stock ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleProductSubmit}
          initial={editTarget}
          loading={productSaving}
        />
      )}
    </MainLayout>
  );
}
