"use client";
// app/panel/page.tsx — usa el CartContext global

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import {
  ShoppingCart, Package, Heart, Trash2, Plus, Minus,
  CreditCard, CheckCircle, Clock, ArrowRight,
  Star, Truck, X, ShoppingBag,
} from "lucide-react";

type Tab = "cart" | "purchases" | "favorites";

interface Purchase {
  _id: string;
  date: string;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  items: { name: string; quantity: number; price: number }[];
}

const STATUS_MAP = {
  pending:   { label: "Pendiente",  color: "#f59e0b", icon: <Clock size={13} /> },
  confirmed: { label: "Confirmado", color: "#3b82f6", icon: <CheckCircle size={13} /> },
  shipped:   { label: "En camino",  color: "#8b5cf6", icon: <Truck size={13} /> },
  delivered: { label: "Entregado",  color: "#10b981", icon: <CheckCircle size={13} /> },
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://offertabackend.onrender.com/api";

function PanelContent() {
  const { user, loading } = useAuth();
  const { cart, cartCount, cartTotal, loading: cartLoading, removeFromCart, updateQuantity, clearCart, checkout } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") as Tab) || "cart";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);

  // Cargar historial de compras
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("marketplace_token");
    fetch(`${API}/orders/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPurchases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  const handleCheckout = async () => {
    const Swal = (await import("sweetalert2")).default;
    if (cart.length === 0) { Swal.fire({ icon: "warning", title: "Tu carrito está vacío" }); return; }
    const { isConfirmed } = await Swal.fire({
      title: "¿Confirmar compra?",
      html: `<p>Total: <strong>$${cartTotal.toLocaleString()}</strong></p><p style="color:#6b7280;font-size:.88rem">El vendedor te contactará para coordinar el pago y envío.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmar pedido",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#f97316",
    });
    if (isConfirmed) {
      const ok = await checkout();
      if (ok) {
        Swal.fire({ icon: "success", title: "¡Pedido realizado!", text: "El vendedor te contactará pronto.", timer: 3000, showConfirmButton: false });
        setTab("purchases");
      } else {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo procesar el pedido. Intentá de nuevo." });
      }
    }
  };

  const tabs = [
    { id: "cart" as Tab,      label: "Carrito",    icon: <ShoppingCart size={16} />, badge: cartCount || undefined },
    { id: "purchases" as Tab, label: "Mis compras", icon: <Package size={16} /> },
    { id: "favorites" as Tab, label: "Favoritos",   icon: <Heart size={16} /> },
  ];

  return (
    <MainLayout>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .panel-anim { animation: fadeUp 0.3s ease both; }
        .panel-tab-btn:hover { background: rgba(249,115,22,0.07); }
        .panel-rm-btn:hover { background: #fee2e2 !important; color: #dc2626 !important; }
        .panel-qty-btn:hover { background: #f3f4f6; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontWeight: 800, fontSize: "1.6rem", color: "var(--text,#111)", margin: 0 }}>Mi panel</h1>
          <p style={{ color: "#6b7280", marginTop: 4, fontSize: "0.9rem" }}>
            Hola, {user.name.split(" ")[0]} 👋 Acá podés gestionar tus compras.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border,#e5e7eb)", marginBottom: "1.75rem" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="panel-tab-btn"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", border: "none", borderRadius: "10px 10px 0 0",
                cursor: "pointer", fontWeight: 600, fontSize: "0.88rem",
                color: tab === t.id ? "#f97316" : "#6b7280",
                background: tab === t.id ? "rgba(249,115,22,0.08)" : "transparent",
                borderBottom: tab === t.id ? "2px solid #f97316" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.15s",
              }}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && (
                <span style={{ background: "#f97316", color: "#fff", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, padding: "1px 7px" }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CART ── */}
        {tab === "cart" && (
          <div className="panel-anim">
            {cartLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⏳</div>
                <p>Cargando carrito...</p>
              </div>
            ) : cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af" }}>
                <ShoppingCart size={56} strokeWidth={1} />
                <h3 style={{ marginTop: 12, color: "#374151" }}>Tu carrito está vacío</h3>
                <p style={{ marginBottom: 24 }}>Explorá los negocios y agregá productos.</p>
                <Link href="/" style={{ background: "#f97316", color: "#fff", padding: "10px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 600 }}>
                  Explorar productos
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem", alignItems: "start" }}>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  {cart.map(item => {
                    const finalPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
                    return (
                      <div key={item._id} style={{
                        background: "var(--bg-card,#fff)", borderRadius: 14, padding: "1rem",
                        border: "1px solid var(--border,#e5e7eb)",
                        display: "flex", gap: "0.9rem", alignItems: "center",
                      }}>
                        <img
                          src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&size=80&background=f97316&color=fff`}
                          alt={item.name}
                          style={{ width: 70, height: 70, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 2px", color: "var(--text,#111)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name}
                          </h4>
                          {item.businessName && (
                            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{item.businessName}</span>
                          )}
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            {/* Qty controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#f9fafb", borderRadius: 8, border: "1px solid var(--border,#e5e7eb)", overflow: "hidden" }}>
                              <button className="panel-qty-btn"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                style={{ background: "none", border: "none", cursor: item.quantity > 1 ? "pointer" : "not-allowed", color: "#6b7280", padding: "6px 10px", opacity: item.quantity <= 1 ? 0.4 : 1 }}>
                                <Minus size={12} />
                              </button>
                              <span style={{ fontWeight: 700, fontSize: "0.9rem", minWidth: 28, textAlign: "center", padding: "0 4px" }}>{item.quantity}</span>
                              <button className="panel-qty-btn"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                style={{ background: "none", border: "none", cursor: item.quantity < item.stock ? "pointer" : "not-allowed", color: "#6b7280", padding: "6px 10px", opacity: item.quantity >= item.stock ? 0.4 : 1 }}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <span style={{ fontWeight: 700, color: "#f97316", fontSize: "0.95rem" }}>
                              ${(finalPrice * item.quantity).toLocaleString()}
                            </span>
                            {item.discount ? (
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af", textDecoration: "line-through" }}>
                                ${(item.price * item.quantity).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button className="panel-rm-btn"
                          onClick={() => removeFromCart(item.productId)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "8px", borderRadius: 8, display: "flex", transition: "all 0.15s" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={clearCart}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <X size={13} /> Vaciar carrito
                  </button>
                </div>

                {/* Summary */}
                <div style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--border,#e5e7eb)", minWidth: 240, position: "sticky", top: 80 }}>
                  <h3 style={{ fontWeight: 700, margin: "0 0 1rem", fontSize: "1rem" }}>Resumen</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.88rem", color: "#6b7280" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Subtotal ({cartCount} artículo{cartCount !== 1 ? "s" : ""})</span>
                      <span style={{ fontWeight: 600, color: "var(--text,#111)" }}>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Envío</span>
                      <span style={{ color: "#10b981", fontWeight: 600 }}>A coordinar</span>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border,#e5e7eb)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "var(--text,#111)" }}>
                      <span>Total</span>
                      <span style={{ color: "#f97316" }}>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={handleCheckout}
                    style={{
                      marginTop: "1rem", width: "100%", padding: "11px",
                      background: "#f97316", color: "#fff", border: "none",
                      borderRadius: 12, fontWeight: 700, fontSize: "0.95rem",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "background 0.15s", boxShadow: "0 3px 12px rgba(249,115,22,0.35)",
                    }}>
                    <CreditCard size={16} /> Confirmar pedido
                  </button>
                  <p style={{ fontSize: "0.73rem", color: "#9ca3af", marginTop: 8, textAlign: "center" }}>El pago se coordina con el vendedor</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASES ── */}
        {tab === "purchases" && (
          <div className="panel-anim">
            {purchases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af" }}>
                <Package size={52} strokeWidth={1} />
                <h3 style={{ marginTop: 12, color: "#374151" }}>No tenés compras aún</h3>
                <p>Tus pedidos confirmados aparecerán acá.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {purchases.map(p => {
                  const si = STATUS_MAP[p.status];
                  return (
                    <div key={p._id} style={{ background: "var(--bg-card,#fff)", borderRadius: 14, border: "1px solid var(--border,#e5e7eb)", overflow: "hidden" }}>
                      <div style={{ padding: "0.9rem 1.2rem", borderBottom: "1px solid var(--border,#f3f4f6)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Pedido #{p._id}</span>
                          <span style={{ marginLeft: 12, fontSize: "0.8rem", color: "#9ca3af" }}>
                            {new Date(p.date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${si.color}18`, color: si.color, padding: "4px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700 }}>
                          {si.icon} {si.label}
                        </div>
                      </div>
                      <div style={{ padding: "0.9rem 1.2rem" }}>
                        {p.items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#374151", padding: "3px 0" }}>
                            <span>{item.name} × {item.quantity}</span>
                            <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: "1px dashed var(--border,#e5e7eb)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.95rem" }}>
                          <span>Total</span>
                          <span style={{ color: "#f97316" }}>${p.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FAVORITES ── */}
        {tab === "favorites" && (
          <div className="panel-anim" style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af" }}>
            <Heart size={52} strokeWidth={1} />
            <h3 style={{ marginTop: 12, color: "#374151" }}>Tus favoritos</h3>
            <p>Los negocios y productos que guardaste aparecerán acá.</p>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, background: "#f97316", color: "#fff", padding: "10px 22px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
              Explorar negocios <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function PanelPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center" }}>Cargando panel...</div>}>
      <PanelContent />
    </Suspense>
  );
}