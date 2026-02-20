'use client';
// app/componentes/ProductModal.tsx

import { useEffect, useRef, useState } from 'react';
import { X, Upload, ImageIcon, Tag } from 'lucide-react';
import { CATEGORIES, type Product } from '../lib/productService';

type ProductForm = {
  name: string;
  price: string;
  discount: string;
  category: string;
  description: string;
  stock: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initial?: Product | null;
  loading?: boolean;
};

export default function ProductModal({ open, onClose, onSubmit, initial, loading }: Props) {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    price: '',
    discount: '0',
    category: 'electronica',
    description: '',
    stock: '10',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        price: String(initial.price),
        discount: String(initial.discount ?? 0),
        category: initial.category,
        description: initial.description || '',
        stock: String(initial.stock),
      });
      setImagePreview(initial.image || null);
    } else {
      setForm({ name: '', price: '', discount: '0', category: 'electronica', description: '', stock: '10' });
      setImagePreview(null);
    }
    setImageFile(null);
  }, [initial, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const discountNum = Math.min(100, Math.max(0, Number(form.discount) || 0));
  const priceNum = parseFloat(form.price) || 0;
  const finalPrice = priceNum > 0 && discountNum > 0
    ? (priceNum * (1 - discountNum / 100)).toFixed(2)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('price', form.price);
    fd.append('discount', String(discountNum));
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('stock', form.stock);
    if (imageFile) fd.append('image', imageFile);
    await onSubmit(fd);
  };

  if (!open) return null;

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mp-modal-header">
          <h2>{initial ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button className="mp-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mp-modal-form">

          {/* Image Upload */}
          <div className="mp-image-upload" onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="mp-image-preview" />
            ) : (
              <div className="mp-image-placeholder">
                <ImageIcon size={32} strokeWidth={1.5} />
                <span>Subir imagen</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <div className="mp-image-upload-overlay">
              <Upload size={20} />
              <span>Cambiar imagen</span>
            </div>
          </div>

          {/* Nombre */}
          <div className="mp-field">
            <label className="mp-label">Nombre del producto *</label>
            <input
              type="text"
              placeholder="Ej: Laptop Gamer RTX 4060"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="mp-input"
              required
            />
          </div>

          {/* Precio + Stock */}
          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label">Precio ($) *</label>
              <input
                type="number"
                placeholder="999.99"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className="mp-input"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="mp-field">
              <label className="mp-label">Stock</label>
              <input
                type="number"
                placeholder="10"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                className="mp-input"
                min="0"
              />
            </div>
          </div>

          {/* Descuento */}
          <div className="mp-field">
            <label className="mp-label">
              <Tag size={13} style={{ display: 'inline', marginRight: 4 }} />
              Descuento (%)
            </label>
            <div className="mp-discount-wrap">
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={form.discount}
                onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
                className="mp-range"
              />
              <div className="mp-discount-info">
                <span className="mp-discount-badge">
                  {discountNum}% OFF
                </span>
                {finalPrice && priceNum > 0 ? (
                  <span className="mp-discount-final">
                    Precio final: <strong>${finalPrice}</strong>
                    <s className="mp-discount-original">${priceNum.toFixed(2)}</s>
                  </span>
                ) : (
                  <span className="mp-discount-none">Sin descuento</span>
                )}
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div className="mp-field">
            <label className="mp-label">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="mp-input mp-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="mp-field">
            <label className="mp-label">Descripción</label>
            <textarea
              placeholder="Breve descripción del producto..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="mp-input mp-textarea"
              rows={3}
            />
          </div>

          <div className="mp-modal-footer">
            <button type="button" className="mp-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="mp-btn-submit" disabled={loading}>
              {loading ? 'Guardando...' : initial ? '💾 Guardar cambios' : '➕ Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}