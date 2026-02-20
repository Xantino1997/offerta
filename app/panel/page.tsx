"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import {
  ShoppingCart, Package, Heart, Trash2, Plus, Minus,
  CreditCard, CheckCircle, Clock, ArrowRight,
  Truck, X,
} from "lucide-react";
import "../styles/panel.css";

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
  const {
    cart, cartCount, cartTotal,
    loading: cartLoading,
    removeFromCart, updateQuantity, clearCart, checkout,
  } = useCart();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const defaultTab   = (searchParams.get("tab") as Tab) || "cart";
  const [tab, setTab]             = useState<Tab>(defaultTab);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);

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
    { id: "cart" as Tab,      label: "Carrito",     icon: <ShoppingCart size={16} />, badge: cartCount || undefined },
    { id: "purchases" as Tab, label: "Mis compras",  icon: <Package size={16} /> },
    { id: "favorites" as Tab, label: "Favoritos",    icon: <Heart size={16} /> },
  ];

  return (
    <MainLayout>
      <div className="panel-wrapper">

        {/* Header */}
        <div className="panel-header">
          <h1>Mi panel</h1>
          <p>Hola, {user.name.split(" ")[0]} 👋 Acá podés gestionar tus compras.</p>
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`panel-tab-btn${tab === t.id ? " active" : ""}`}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && (
                <span className="panel-tab-badge">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CART ── */}
        {tab === "cart" && (
          <div className="panel-anim">
            {cartLoading ? (
              <div className="panel-loading">
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⏳</div>
                <p>Cargando carrito...</p>
              </div>
            ) : cart.length === 0 ? (
              <div className="panel-empty">
                <ShoppingCart size={56} strokeWidth={1} />
                <h3>Tu carrito está vacío</h3>
                <p>Explorá los negocios y agregá productos.</p>
                <Link href="/" className="panel-empty-link">Explorar productos</Link>
              </div>
            ) : (
              <div className="cart-grid">

                {/* Items */}
                <div className="cart-items">
                  {cart.map(item => {
                    const finalPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
                    return (
                      <div key={item._id} className="cart-item">
                        <img
                          src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&size=80&background=f97316&color=fff`}
                          alt={item.name}
                          className="cart-item-img"
                        />
                        <div className="cart-item-info">
                          <h4 className="cart-item-name">{item.name}</h4>
                          {item.businessName && (
                            <span className="cart-item-business">{item.businessName}</span>
                          )}
                          <div className="cart-item-controls">
                            <div className="cart-qty-box">
                              <button className="panel-qty-btn"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= 1}>
                                <Minus size={12} />
                              </button>
                              <span className="cart-qty-val">{item.quantity}</span>
                              <button className="panel-qty-btn"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="cart-item-price">
                              ${(finalPrice * item.quantity).toLocaleString()}
                            </span>
                            {item.discount ? (
                              <span className="cart-item-original">
                                ${(item.price * item.quantity).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button className="panel-rm-btn" onClick={() => removeFromCart(item.productId)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <button className="cart-clear-btn" onClick={clearCart}>
                    <X size={13} /> Vaciar carrito
                  </button>
                </div>

                {/* Summary */}
                <div className="cart-summary">
                  <h3>Resumen</h3>
                  <div className="cart-summary-rows">
                    <div className="cart-summary-row">
                      <span>Subtotal ({cartCount} artículo{cartCount !== 1 ? "s" : ""})</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="cart-summary-row green">
                      <span>Envío</span>
                      <span>A coordinar</span>
                    </div>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button className="cart-checkout-btn" onClick={handleCheckout}>
                    <CreditCard size={16} /> Confirmar pedido
                  </button>
                  <p className="cart-summary-note">El pago se coordina con el vendedor</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASES ── */}
        {tab === "purchases" && (
          <div className="panel-anim">
            {purchases.length === 0 ? (
              <div className="panel-empty">
                <Package size={52} strokeWidth={1} />
                <h3>No tenés compras aún</h3>
                <p>Tus pedidos confirmados aparecerán acá.</p>
              </div>
            ) : (
              <div className="purchases-list">
                {purchases.map(p => {
                  const si = STATUS_MAP[p.status];
                  return (
                    <div key={p._id} className="purchase-card">
                      <div className="purchase-card-header">
                        <div>
                          <span className="purchase-card-id">Pedido #{p._id}</span>
                          <span className="purchase-card-date">
                            {new Date(p.date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <div className="purchase-status" style={{ background: `${si.color}18`, color: si.color }}>
                          {si.icon} {si.label}
                        </div>
                      </div>
                      <div className="purchase-card-body">
                        {p.items.map((item, i) => (
                          <div key={i} className="purchase-item-row">
                            <span>{item.name} × {item.quantity}</span>
                            <span>${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="purchase-total">
                          <span>Total</span>
                          <span>${p.total.toLocaleString()}</span>
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
          <div className="panel-anim panel-empty">
            <Heart size={52} strokeWidth={1} />
            <h3>Tus favoritos</h3>
            <p>Los negocios y productos que guardaste aparecerán acá.</p>
            <Link href="/" className="panel-empty-link">
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
