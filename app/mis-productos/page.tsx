"use client";
// app/mis-productos/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, PackageOpen, Tag } from "lucide-react";
import MainLayout from "../componentes/MainLayout";
import ProductModal from "../componentes/ProductModal";
import { useAuth } from "../context/authContext";
import { ArrowRight, LayoutList } from "lucide-react";
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  CATEGORIES,
  type Product,
} from "../lib/productService";
import "../styles/misproductos.css";

// ── Celda de precio (reutilizable en tabla y cards) ──────────────────────────
function PriceDisplay({ price, discount }: { price: number; discount?: number }) {
  if (!discount || discount === 0) {
    return <span className="mp-price">${price.toLocaleString()}</span>;
  }
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span className="mp-price-final">${Number(final).toLocaleString()}</span>
      <span className="mp-price-original-strike">${price.toLocaleString()}</span>
      <span className="mp-discount-pill">-{discount}%</span>
    </span>
  );
}

export default function MisProductosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      const data = await getMyProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (p: Product) => { setEditTarget(p); setModalOpen(true); };

  const handleSubmit = async (formData: FormData) => {
    try {
      setSaving(true);
      if (editTarget) {
        const updated = await updateProduct(editTarget._id, formData);
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      } else {
        const created = await createProduct(formData);
        setProducts((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      showToast("success", editTarget ? "Producto actualizado" : "¡Producto agregado!");
    } catch (e: any) {
      showToast("error", e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${product.name}" será eliminado permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await deleteProduct(product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      showToast("success", "Producto eliminado");
    } catch (e: any) {
      showToast("error", e.message || "Error al eliminar");
    }
  };

  const showToast = async (icon: "success" | "error", title: string) => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon, title, timer: 1800, showConfirmButton: false, toast: true, position: "top-end" });
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label ?? value;

  if (loading || !user) return null;

  return (
    <MainLayout>
      <div className="mp-page">

        {/* ── Topbar ── */}
        <div className="mp-topbar">
          <div>
            <h1 className="mp-title">Mis Productos</h1>
            <p className="mp-subtitle">
              {products.length} producto{products.length !== 1 ? "s" : ""} publicado{products.length !== 1 ? "s" : ""}
              {products.length >= 20 && (
                <span style={{ color: "#f97316", fontWeight: 600 }}> · Límite alcanzado</span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {products.length < 20 && (
              <button className="mp-btn-add" onClick={openCreate}>
                <Plus size={16} /> Nuevo producto
              </button>
            )}
            <button className="ng-btn-manage" onClick={() => router.push("/negocio")}>
              <LayoutList size={15} />Mi negocio<ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="mp-table-card">
          {fetching ? (
            <div className="mp-loading">
              <div className="mp-spinner" />
              <p>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="mp-empty">
              <PackageOpen size={56} strokeWidth={1} className="mp-empty-icon" />
              <h3>Aún no tenés productos</h3>
              <p>Publicá tu primer producto y empezá a vender.</p>
              <button className="mp-btn-add" style={{ marginTop: "1rem" }} onClick={openCreate}>
                <Plus size={16} /> Agregar producto
              </button>
            </div>
          ) : (
            <>
              {/* ══ TABLA — solo desktop ══ */}
              <div className="mp-table-wrap">
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>Imagen</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Descuento</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <img
                            src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=200&background=f97316&color=fff`}
                            alt={p.name}
                            className="mp-table-img"
                          />
                        </td>
                        <td>
                          <div className="mp-product-name">{p.name}</div>
                          <div className="mp-product-desc">
                            {p.description ? `${p.description.slice(0, 50)}…` : "—"}
                          </div>
                        </td>
                        <td><span className="mp-badge">{getCategoryLabel(p.category)}</span></td>
                        <td><PriceDisplay price={p.price} discount={p.discount} /></td>
                        <td>
                          <span className={`mp-stock ${(p.stock || 0) < 5 ? "low" : "ok"}`}>
                            {p.stock ?? "—"}
                          </span>
                        </td>
                        <td>
                          {p.discount && p.discount > 0 ? (
                            <span className="mp-discount-pill">
                              <Tag size={11} style={{ display: "inline", marginRight: 2 }} />
                              {p.discount}% OFF
                            </span>
                          ) : (
                            <span style={{ color: "#d1d5db", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="mp-actions">
                            <button className="mp-action-btn" title="Editar" onClick={() => openEdit(p)}>
                              <Pencil size={15} />
                            </button>
                            <button className="mp-action-btn danger" title="Eliminar" onClick={() => handleDelete(p)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ══ CARDS — solo mobile ══ */}
              <div className="mp-mobile-list">
                {products.map((p) => {
                  const hasDisco = p.discount && p.discount > 0;
                  const finalPrice = hasDisco
                    ? (p.price * (1 - (p.discount ?? 0) / 100)).toFixed(2)
                    : null;
                  return (
                    <div key={p._id} className="mp-card-item">
                      {/* Foto */}
                      <img
                        src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=200&background=f97316&color=fff`}
                        alt={p.name}
                        className="mp-card-img"
                      />

                      {/* Info */}
                      <div className="mp-card-body">
                        <div className="mp-card-name">{p.name}</div>

                        {/* Precio + descuento */}
                        <div className="mp-card-meta">
                          {hasDisco ? (
                            <>
                              <span className="mp-card-price">${Number(finalPrice).toLocaleString()}</span>
                              <span className="mp-card-price-orig">${p.price.toLocaleString()}</span>
                              <span className="mp-discount-pill">-{p.discount}%</span>
                            </>
                          ) : (
                            <span className="mp-card-price">${p.price.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Badges: categoría + stock */}
                        <div className="mp-card-meta">
                          <span className="mp-badge">{getCategoryLabel(p.category)}</span>
                          <span className={`mp-stock ${(p.stock || 0) < 5 ? "low" : "ok"}`}>
                            Stock: {p.stock ?? 0}
                          </span>
                        </div>

                        {/* Acciones */}
                        <div className="mp-card-actions">
                          <button className="mp-action-btn" title="Editar" onClick={() => openEdit(p)}>
                            <Pencil size={15} />
                          </button>
                          <button className="mp-action-btn danger" title="Eliminar" onClick={() => handleDelete(p)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
        loading={saving}
      />
    </MainLayout>
  );
}
