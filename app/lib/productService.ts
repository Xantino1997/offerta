// app/lib/productService.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://offertabackend.onrender.com/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('marketplace_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;      // % de descuento (0-100)
  finalPrice?: number;    // virtual del backend
  category: string;
  stock: number;
  image?: string;
  imagePublicId?: string;
  businessId?: string;
  createdAt?: string;
}

export const CATEGORIES = [
  { value: 'electronica', label: '💻 Electrónica' },
  { value: 'ropa-moda',   label: '👗 Ropa y Moda' },
  { value: 'hogar',       label: '🏠 Hogar' },
  { value: 'deportes',    label: '⚽ Deportes' },
  { value: 'juguetes',    label: '🧸 Juguetes' },
  { value: 'alimentos',   label: '🍎 Alimentos' },
  { value: 'belleza',     label: '💄 Belleza' },
  { value: 'automotor',   label: '🚗 Automotor' },
  { value: 'mascotas',    label: '🐾 Mascotas' },
  { value: 'otros',       label: '📦 Otros' },
];

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  return res.json();
}

export async function getMyProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products/my-products`, {
    headers: authHeaders(),
  });
  return handleResponse<Product[]>(res);
}

// ⚠️ NO agregar Content-Type — el browser lo setea con el boundary multipart
export async function createProduct(formData: FormData): Promise<Product> {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<Product>(res);
}

export async function updateProduct(id: string, formData: FormData): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<Product>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}