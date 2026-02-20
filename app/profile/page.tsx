'use client';
// app/profile/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Store, ShoppingBag, LogOut, Bell, MapPin,
  Package, Save, KeyRound, User, Pin, Camera,
  TrendingUp, Heart, LayoutGrid,
} from 'lucide-react';
import MainLayout from '../componentes/MainLayout';
import { useAuth } from '../context/authContext';
import '../styles/profile.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://offertabackend.onrender.com/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('marketplace_token');
}

interface Stats { purchases: number; favorites: number; products: number; }

export default function ProfilePage() {
  const { user, loading, logout, enableNotifications, enableLocation, updateUser } = useAuth();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<Stats>({ purchases: 0, favorites: 0, products: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Initialize form with local user data immediately
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user?.id]);

  // Fetch stats from backend separately — graceful fallback if endpoint missing
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) { setStatsLoading(false); return; }

    setStatsLoading(true);
    fetch(`${API}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        // Guard: check Content-Type before parsing JSON
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          throw new Error(`El servidor respondió con HTML (status ${r.status}). ¿Existe el endpoint GET /api/user/profile?`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.name) setProfileName(data.name);
        if (data.email) setProfileEmail(data.email);
        if (data.avatar && data.avatar !== user.avatar) updateUser({ avatar: data.avatar });
      })
      .catch((err) => {
        console.warn('[profile] Stats no disponibles:', err.message);
        // Fallback: keep zeros, page still works
      })
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  if (loading || !user) return null;

  /* ── Avatar ─────────────────────────────────────── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    const Swal = (await import('sweetalert2')).default;
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${API}/user/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Respuesta inválida del servidor');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error subiendo avatar');
      updateUser({ avatar: data.avatar });
      Swal.fire({ icon: 'success', title: '¡Avatar actualizado!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: err.message || 'Error', timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' });
      setAvatarPreview(null);
    } finally {
      setAvatarLoading(false);
    }
  };

  /* ── Update profile ──────────────────────────────── */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const Swal = (await import('sweetalert2')).default;
    setProfileSaving(true);
    try {
      const res = await fetch(`${API}/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Respuesta inválida del servidor');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error guardando');
      updateUser({ name: data.user.name, email: data.user.email });
      Swal.fire({ icon: 'success', title: 'Datos guardados', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: err.message });
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── Change password ─────────────────────────────── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const Swal = (await import('sweetalert2')).default;
    if (newPwd !== confirmPwd) { Swal.fire({ icon: 'warning', title: 'Las contraseñas no coinciden' }); return; }
    if (newPwd.length < 6)    { Swal.fire({ icon: 'warning', title: 'Mínimo 6 caracteres' }); return; }

    setPwdSaving(true);
    try {
      const res = await fetch(`${API}/user/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Respuesta inválida del servidor');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      Swal.fire({ icon: 'success', title: 'Contraseña actualizada', timer: 1800, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: err.message });
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── Notifications / location / logout ──────────── */
  const handleNotifToggle = async () => {
    const Swal = (await import('sweetalert2')).default;
    if (user.notificationsEnabled) {
      updateUser({ notificationsEnabled: false });
      Swal.fire({ icon: 'info', title: 'Notificaciones desactivadas', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } else {
      const ok = await enableNotifications();
      if (!ok) Swal.fire({ icon: 'warning', title: 'No se pudo activar', text: 'Revisá los permisos.' });
    }
  };

  const handleLocationToggle = async () => {
    const Swal = (await import('sweetalert2')).default;
    if (user.locationEnabled) {
      updateUser({ locationEnabled: false, lat: undefined, lng: undefined });
      Swal.fire({ icon: 'info', title: 'Ubicación desactivada', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } else {
      const coords = await enableLocation();
      if (!coords) Swal.fire({ icon: 'warning', title: 'No se pudo activar', text: 'Revisá permisos de geolocalización.' });
      else Swal.fire({ icon: 'success', title: '¡Ubicación activada!', text: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, timer: 2000, showConfirmButton: false });
    }
  };

  const handleLogout = async () => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({
      title: '¿Cerrar sesión?', icon: 'question', showCancelButton: true,
      confirmButtonText: 'Sí, salir', cancelButtonText: 'Cancelar', confirmButtonColor: 'var(--danger)',
    });
    if (isConfirmed) { logout(); router.push('/'); }
  };

  const currentAvatar = avatarPreview || user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=90&background=f97316&color=fff`;

  const statItems = [
    { icon: <TrendingUp size={14} />, value: stats.purchases, label: 'Compras' },
    { icon: <Heart size={14} />,      value: stats.favorites, label: 'Favoritos' },
    ...(user.role === 'seller' ? [{ icon: <LayoutGrid size={14} />, value: stats.products, label: 'Productos' }] : []),
  ];

  return (
    <MainLayout>
      <div className="profile-page">

        {/* ── Header ── */}
        <div className="profile-header">

          <div className="profile-avatar-wrap">
            <img src={currentAvatar} alt={user.name} className="profile-avatar" />
            <button
              className="profile-avatar-btn"
              title="Cambiar foto"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
            >
              <Camera size={13} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} />
            {avatarLoading && <div className="profile-avatar-loading" />}
          </div>

          <div className="profile-info">
            <div className="profile-name">{user.name}</div>
            <div className="profile-email"><Mail size={13} strokeWidth={1.75} /> {user.email}</div>
            <span className="profile-role">
              {user.role === 'seller'
                ? <><Store size={12} strokeWidth={1.75} /> Vendedor</>
                : <><ShoppingBag size={12} strokeWidth={1.75} /> Comprador</>}
            </span>
          </div>

          <div className="profile-stats">
            {statItems.map(({ icon, value, label }) => (
              <div key={label} className="profile-stat">
                <div className="profile-stat-num">
                  {statsLoading ? <span className="profile-stat-skeleton" /> : value}
                </div>
                <div className="profile-stat-label">{icon} {label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-body">

          {/* ── Sidebar ── */}
          <div className="profile-sidebar">
            <div className="profile-card">
              <h3>Configuración</h3>
              <div className="profile-setting">
                <div className="profile-setting-info">
                  <h4><Bell size={13} strokeWidth={1.75} /> Notificaciones</h4>
                  <p>{user.notificationsEnabled ? 'Activas' : 'Inactivas'}</p>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={user.notificationsEnabled} onChange={handleNotifToggle} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="profile-setting">
                <div className="profile-setting-info">
                  <h4><MapPin size={13} strokeWidth={1.75} /> Ubicación</h4>
                  <p>{user.locationEnabled ? 'Activada' : 'Desactivada'}</p>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={user.locationEnabled} onChange={handleLocationToggle} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {user.lat && (
                <div className="profile-coords">
                  <Pin size={12} strokeWidth={1.75} />
                  {user.lat.toFixed(4)}, {user.lng?.toFixed(4)}
                </div>
              )}
            </div>

            <div className="profile-card">
              <h3>Accesos rápidos</h3>
              <div className="profile-quick-links">
                <Link href="/mis-productos" className="btn btn-outline profile-quick-btn">
                  <Package size={15} strokeWidth={1.75} /> Mis productos
                </Link>
                {user.businessId && (
                  <Link href={`/negocio?id=${user.businessId}`} className="btn btn-outline profile-quick-btn">
                    <Store size={15} strokeWidth={1.75} /> Mi negocio
                  </Link>
                )}
                <button className="btn btn-ghost profile-logout-btn" onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={1.75} /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>

          {/* ── Main ── */}
          <div className="profile-main">
            <div className="profile-card">
              <h3><User size={15} strokeWidth={1.75} /> Datos personales</h3>
              <form className="profile-form" onSubmit={handleSaveProfile}>
                <div className="profile-form-grid">
                  <div className="profile-field">
                    <label>Nombre</label>
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary profile-save-btn" disabled={profileSaving}>
                  <Save size={15} strokeWidth={1.75} />
                  {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </div>

            <div className="profile-card">
              <h3><KeyRound size={15} strokeWidth={1.75} /> Seguridad</h3>
              <form className="profile-form" onSubmit={handleChangePassword}>
                <div className="profile-form-grid profile-form-grid-3">
                  <div className="profile-field">
                    <label>Contraseña actual</label>
                    <input type="password" placeholder="••••••" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
                  </div>
                  <div className="profile-field">
                    <label>Nueva contraseña</label>
                    <input type="password" placeholder="••••••" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
                  </div>
                  <div className="profile-field">
                    <label>Confirmar nueva</label>
                    <input type="password" placeholder="••••••" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-outline profile-save-btn" disabled={pwdSaving}>
                  <KeyRound size={15} strokeWidth={1.75} />
                  {pwdSaving ? 'Cambiando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ============================================================
   AGREGAR AL FINAL DE app/styles/profile.css
   (no reemplaces nada, solo pegá esto al final)
============================================================ */

/*
.profile-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar-btn {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #f97316;
  border: 2px solid #fff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  z-index: 1;
}
.profile-avatar-btn:hover   { background: #ea6a00; }
.profile-avatar-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.profile-avatar-loading {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #f97316;
  animation: av-spin 0.7s linear infinite;
  pointer-events: none;
}
@keyframes av-spin { to { transform: rotate(360deg); } }

.profile-stat-label {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.profile-stat-skeleton {
  display: inline-block;
  width: 28px;
  height: 22px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
*/