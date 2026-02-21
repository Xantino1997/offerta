'use client';
// app/admin/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/authContext';
import {
  LayoutDashboard, Users, Store, Shield, Ban,
  CheckCircle, XCircle, Search, Trash2,
  Package, Clock, AlertTriangle, Crown,
  RefreshCw, LogOut, X, ChevronRight,
} from 'lucide-react';
import '../styles/admin.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://offertabackend.onrender.com/api';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('marketplace_token') : null; }
function authH(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authH(), ...(opts.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

type Tab = 'dashboard' | 'users' | 'businesses' | 'featured';

interface Stats { totalUsers: number; totalBusinesses: number; totalProducts: number; activeFeatured: number; blockedUsers: number; blockedBusinesses: number; recentUsers: any[]; }
interface UserRow { _id: string; name: string; email: string; role: string; blocked?: boolean; createdAt: string; }
interface BusinessRow { _id: string; name: string; city: string; logo?: string; verified: boolean; blocked: boolean; blockedReason?: string; owner: { name: string; email: string }; featuredInfo?: any; }
interface FeaturedRow { _id: string; business: { _id: string; name: string; city: string; logo?: string; owner: { name: string } }; type: string; startDate: string; endDate: string; note?: string; addedBy?: { name: string }; }

// ── Modal de detalle mobile ───────────────────────────────────────────────────
function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h2 style={{ fontSize: '0.95rem' }}>{title}</h2>
          <button onClick={onClose}><X size={17} /></button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);

  // Featured modal state
  const [featModal, setFeatModal] = useState(false);
  const [featBizId, setFeatBizId] = useState('');
  const [featBizName, setFeatBizName] = useState('');
  const [featType, setFeatType] = useState<'daily'|'weekly'|'monthly'|'custom'>('weekly');
  const [featDays, setFeatDays] = useState('7');
  const [featNote, setFeatNote] = useState('');
  const [featSaving, setFeatSaving] = useState(false);

  // Block business modal
  const [blockModal, setBlockModal] = useState(false);
  const [blockBizId, setBlockBizId] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // ── Mobile detail modals ──
  const [userDetail, setUserDetail]             = useState<UserRow | null>(null);
  const [bizDetail, setBizDetail]               = useState<BusinessRow | null>(null);
  const [recentUserDetail, setRecentUserDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  const toast = useCallback(async (icon: 'success'|'error'|'warning', title: string) => {
    const Swal = (await import('sweetalert2')).default;
    Swal.fire({ icon, title, timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
  }, []);

  const loadStats = useCallback(async () => {
    try { setStats(await apiFetch('/stats')); } catch (e: any) { toast('error', e.message); }
  }, []);

  const loadUsers = useCallback(async () => {
    setFetching(true);
    try { const d = await apiFetch(`/users?search=${search}&limit=50`); setUsers(d.users); }
    catch (e: any) { toast('error', e.message); } finally { setFetching(false); }
  }, [search]);

  const loadBusinesses = useCallback(async () => {
    setFetching(true);
    try { const d = await apiFetch(`/businesses?search=${search}&limit=50`); setBusinesses(d.businesses); }
    catch (e: any) { toast('error', e.message); } finally { setFetching(false); }
  }, [search]);

  const loadFeatured = useCallback(async () => {
    setFetching(true);
    try { setFeatured(await apiFetch('/featured')); }
    catch (e: any) { toast('error', e.message); } finally { setFetching(false); }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (tab === 'dashboard') loadStats();
    else if (tab === 'users') loadUsers();
    else if (tab === 'businesses') loadBusinesses();
    else if (tab === 'featured') loadFeatured();
  }, [tab, user]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'businesses') loadBusinesses();
  }, [search]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const blockUser = async (id: string, name: string, currentBlocked: boolean) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({
      title: currentBlocked ? `¿Desbloquear a ${name}?` : `¿Bloquear a ${name}?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: currentBlocked ? 'Desbloquear' : 'Bloquear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: currentBlocked ? '#16a34a' : '#ef4444',
    });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/users/${id}/block`, { method: 'PATCH' });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, blocked: !u.blocked } : u));
      // Actualizar el detalle mobile si está abierto
      if (userDetail?._id === id) setUserDetail(prev => prev ? { ...prev, blocked: !prev.blocked } : null);
      toast('success', currentBlocked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
    } catch (e: any) { toast('error', e.message); }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
      if (userDetail?._id === id) setUserDetail(prev => prev ? { ...prev, role } : null);
      toast('success', 'Rol actualizado');
    } catch (e: any) { toast('error', e.message); }
  };

  const verifyBusiness = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/businesses/${id}/verify`, { method: 'PATCH' });
      setBusinesses(prev => prev.map(b => b._id === id ? { ...b, verified: !current } : b));
      if (bizDetail?._id === id) setBizDetail(prev => prev ? { ...prev, verified: !current } : null);
      toast('success', current ? 'Verificación removida' : '¡Negocio verificado!');
    } catch (e: any) { toast('error', e.message); }
  };

  const openBlockBusiness = (id: string) => { setBlockBizId(id); setBlockReason(''); setBlockModal(true); };
  const confirmBlockBusiness = async () => {
    try {
      const biz = businesses.find(b => b._id === blockBizId);
      await apiFetch(`/businesses/${blockBizId}/block`, { method: 'PATCH', body: JSON.stringify({ reason: blockReason }) });
      setBusinesses(prev => prev.map(b => b._id === blockBizId ? { ...b, blocked: !b.blocked, blockedReason: blockReason } : b));
      if (bizDetail?._id === blockBizId) setBizDetail(prev => prev ? { ...prev, blocked: !prev.blocked, blockedReason: blockReason } : null);
      toast('success', biz?.blocked ? 'Negocio desbloqueado' : 'Negocio bloqueado');
      setBlockModal(false);
    } catch (e: any) { toast('error', e.message); }
  };

  const openFeatured = (biz: BusinessRow) => {
    setFeatBizId(biz._id); setFeatBizName(biz.name);
    setFeatType('weekly'); setFeatDays('7'); setFeatNote('');
    setFeatModal(true);
  };
  const submitFeatured = async () => {
    setFeatSaving(true);
    try {
      await apiFetch('/featured', { method: 'POST', body: JSON.stringify({ businessId: featBizId, type: featType, days: featDays, note: featNote }) });
      toast('success', '¡Negocio destacado!');
      setFeatModal(false);
      if (tab === 'businesses') loadBusinesses();
      if (tab === 'featured') loadFeatured();
    } catch (e: any) { toast('error', e.message); }
    finally { setFeatSaving(false); }
  };

  const removeFeat = async (businessId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: '¿Quitar destacado?', icon: 'question', showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/featured/${businessId}`, { method: 'DELETE' });
      setFeatured(prev => prev.filter(f => f.business._id !== businessId));
      toast('success', 'Destacado removido');
    } catch (e: any) { toast('error', e.message); }
  };

  const daysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading || !user) return null;
  if (user.role !== 'admin') return null;

  const navItems: { id: Tab; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'users',     icon: Users,           label: 'Usuarios' },
    { id: 'businesses',icon: Store,            label: 'Negocios' },
    { id: 'featured',  icon: Crown,            label: 'Destacados' },
  ];

  return (
    <div className="adm-root">
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top-row">
          <div className="adm-logo">
            <Shield size={22} />
            <span>Admin Panel</span>
          </div>
          <div className="adm-sidebar-footer">
            <div className="adm-user-chip">
              <div className="adm-user-dot" />
              <div>
                <div className="adm-user-name">{user.name}</div>
                <div className="adm-user-role">Administrador</div>
              </div>
            </div>
            <button className="adm-logout" onClick={async () => { logout(); router.push('/'); }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <nav className="adm-nav">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} className={`adm-nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        <div className="adm-topbar">
          <div>
            <h1 className="adm-page-title">
              {tab === 'dashboard' && 'Dashboard'}
              {tab === 'users' && 'Usuarios'}
              {tab === 'businesses' && 'Negocios'}
              {tab === 'featured' && 'Destacados'}
            </h1>
            <p className="adm-page-sub">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="adm-refresh" onClick={() => {
            if (tab === 'dashboard') loadStats();
            else if (tab === 'users') loadUsers();
            else if (tab === 'businesses') loadBusinesses();
            else loadFeatured();
          }}>
            <RefreshCw size={15} />
          </button>
        </div>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && stats && (
          <div className="adm-content">
            <div className="adm-stats-grid">
              {[
                { label: 'Usuarios totales',   value: stats.totalUsers,        icon: Users,         color: 'blue'   },
                { label: 'Negocios',           value: stats.totalBusinesses,   icon: Store,         color: 'orange' },
                { label: 'Productos',          value: stats.totalProducts,     icon: Package,       color: 'green'  },
                { label: 'Destacados activos', value: stats.activeFeatured,    icon: Crown,         color: 'gold'   },
                { label: 'Usuarios bloqueados',value: stats.blockedUsers,      icon: Ban,           color: 'red'    },
                { label: 'Negocios bloqueados',value: stats.blockedBusinesses, icon: AlertTriangle, color: 'red'    },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`adm-stat-card adm-stat-${color}`}>
                  <div className="adm-stat-icon"><Icon size={20} /></div>
                  <div className="adm-stat-num">{value}</div>
                  <div className="adm-stat-label">{label}</div>
                </div>
              ))}
            </div>

            <div className="adm-card">
              <h3 className="adm-card-title"><Users size={16} /> Usuarios recientes</h3>

              {/* Vista desktop */}
              <div className="adm-table-wrap adm-desktop-only">
                <table className="adm-table">
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Registrado</th></tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((u: any) => (
                      <tr key={u._id}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar-sm">{u.name[0]}</div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td className="adm-muted">{u.email}</td>
                        <td><span className={`adm-role-badge adm-role-${u.role} adm-role-fixed`}>{u.role}</span></td>
                        <td className="adm-muted">{new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista mobile */}
              <div className="adm-mobile-only adm-list">
                {stats.recentUsers.map((u: any) => (
                  <button
                    key={u._id}
                    className="adm-list-row"
                    onClick={() => setRecentUserDetail(u)}
                  >
                    <div className="adm-avatar-sm" style={{ flexShrink: 0 }}>{u.name[0]}</div>
                    <div className="adm-list-info">
                      <span className="adm-list-name">{u.name}</span>
                      <span className={`adm-role-badge adm-role-${u.role} adm-role-fixed`}>{u.role}</span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--adm-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ USUARIOS ════ */}
        {tab === 'users' && (
          <div className="adm-content">
            <div className="adm-search-bar">
              <Search size={16} />
              <input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="adm-card">
              {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : (
                <>
                  {/* ── Vista desktop: tabla ── */}
                  <div className="adm-table-wrap adm-desktop-only">
                    <table className="adm-table">
                      <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id} className={u.blocked ? 'adm-row-blocked' : ''}>
                            <td><div className="adm-user-cell"><div className="adm-avatar-sm">{u.name[0]}</div><span>{u.name}</span></div></td>
                            <td className="adm-muted">{u.email}</td>
                            <td>
                              <select
                                className={`adm-role-select adm-role-${u.role}`}
                                value={u.role}
                                onChange={e => changeRole(u._id, e.target.value)}
                                disabled={u.role === 'admin'}
                              >
                                <option value="user">user</option>
                                <option value="seller">seller</option>
                                <option value="admin">admin</option>
                              </select>
                            </td>
                            <td>
                              {u.blocked
                                ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span>
                                : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}
                            </td>
                            <td>
                              <button
                                className={`adm-btn-sm ${u.blocked ? 'green' : 'red'}`}
                                onClick={() => blockUser(u._id, u.name, !!u.blocked)}
                                disabled={u.role === 'admin'}
                              >
                                {u.blocked ? <><CheckCircle size={13} /> Desbloquear</> : <><Ban size={13} /> Bloquear</>}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Vista mobile: lista de filas simples ── */}
                  <div className="adm-mobile-only adm-list">
                    {users.map(u => (
                      <button
                        key={u._id}
                        className={`adm-list-row ${u.blocked ? 'adm-row-blocked' : ''}`}
                        onClick={() => setUserDetail(u)}
                      >
                        <div className="adm-avatar-sm" style={{ flexShrink: 0 }}>{u.name[0]}</div>
                        <div className="adm-list-info">
                          <span className="adm-list-name">{u.name}</span>
                          <span className={`adm-role-badge adm-role-${u.role}`}>{u.role}</span>
                          {u.blocked && <span className="adm-status blocked" style={{ fontSize: '0.68rem' }}><Ban size={10} /> Bloq.</span>}
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--adm-muted)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ════ NEGOCIOS ════ */}
        {tab === 'businesses' && (
          <div className="adm-content">
            <div className="adm-search-bar">
              <Search size={16} />
              <input placeholder="Buscar negocio..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="adm-card">
              {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : (
                <>
                  {/* ── Vista desktop: tabla ── */}
                  <div className="adm-table-wrap adm-desktop-only">
                    <table className="adm-table">
                      <thead><tr><th>Negocio</th><th>Dueño</th><th>Ciudad</th><th>Estado</th><th>Destacado</th><th>Acciones</th></tr></thead>
                      <tbody>
                        {businesses.map(b => (
                          <tr key={b._id} className={b.blocked ? 'adm-row-blocked' : ''}>
                            <td>
                              <div className="adm-biz-cell">
                                <img src={b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=36&background=f97316&color=fff`} alt="" className="adm-biz-logo" />
                                <div>
                                  <div className="adm-biz-name">{b.name}</div>
                                  {b.verified && <span className="adm-verified-chip"><CheckCircle size={10} /> Verificado</span>}
                                </div>
                              </div>
                            </td>
                            <td><div className="adm-muted">{b.owner?.name}</div><div className="adm-muted" style={{fontSize:'0.75rem'}}>{b.owner?.email}</div></td>
                            <td className="adm-muted">{b.city || '—'}</td>
                            <td>
                              {b.blocked
                                ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span>
                                : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}
                            </td>
                            <td>
                              {b.featuredInfo
                                ? <span className="adm-featured-chip"><Crown size={11} /> {daysLeft(b.featuredInfo.endDate)}d</span>
                                : <span className="adm-muted" style={{fontSize:'0.78rem'}}>—</span>}
                            </td>
                            <td>
                              <div className="adm-action-group">
                                <button className={`adm-btn-sm ${b.verified ? 'orange' : 'green'}`} onClick={() => verifyBusiness(b._id, b.verified)}>
                                  {b.verified ? <><XCircle size={12}/> Quitar verif.</> : <><CheckCircle size={12}/> Verificar</>}
                                </button>
                                <button className="adm-btn-sm gold" onClick={() => openFeatured(b)}>
                                  <Crown size={12} /> Destacar
                                </button>
                                <button className={`adm-btn-sm ${b.blocked ? 'green' : 'red'}`} onClick={() => openBlockBusiness(b._id)}>
                                  {b.blocked ? <><CheckCircle size={12}/> Desbloquear</> : <><Ban size={12}/> Bloquear</>}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Vista mobile: lista de filas simples ── */}
                  <div className="adm-mobile-only adm-list">
                    {businesses.map(b => (
                      <button
                        key={b._id}
                        className={`adm-list-row ${b.blocked ? 'adm-row-blocked' : ''}`}
                        onClick={() => setBizDetail(b)}
                      >
                        <img
                          src={b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=36&background=f97316&color=fff`}
                          alt=""
                          className="adm-biz-logo"
                          style={{ flexShrink: 0 }}
                        />
                        <div className="adm-list-info">
                          <span className="adm-list-name">{b.name}</span>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {b.verified && <span className="adm-verified-chip" style={{ fontSize: '0.65rem' }}><CheckCircle size={9} /> Verif.</span>}
                            {b.blocked && <span className="adm-status blocked" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}><Ban size={10} /> Bloq.</span>}
                            {b.featuredInfo && <span className="adm-featured-chip" style={{ fontSize: '0.68rem' }}><Crown size={9} /> {daysLeft(b.featuredInfo.endDate)}d</span>}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--adm-muted)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ════ DESTACADOS ════ */}
        {tab === 'featured' && (
          <div className="adm-content">
            <div className="adm-featured-header">
              <p className="adm-muted">{featured.length} negocio{featured.length !== 1 ? 's' : ''} destacado{featured.length !== 1 ? 's' : ''} actualmente</p>
            </div>
            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : featured.length === 0 ? (
              <div className="adm-empty"><Crown size={48} strokeWidth={1} /><p>No hay negocios destacados activos</p></div>
            ) : (
              <div className="adm-featured-grid">
                {featured.map(f => (
                  <div key={f._id} className="adm-featured-card">
                    <div className="adm-featured-card-top">
                      <img
                        src={f.business.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.business.name)}&size=56&background=f97316&color=fff`}
                        alt={f.business.name}
                        className="adm-featured-logo"
                      />
                      <div className="adm-featured-info">
                        <div className="adm-featured-name">{f.business.name}</div>
                        <div className="adm-muted" style={{fontSize:'0.78rem'}}>{f.business.city}</div>
                        {f.note && <div className="adm-featured-note">"{f.note}"</div>}
                      </div>
                      <button className="adm-remove-feat" onClick={() => removeFeat(f.business._id)} title="Quitar destacado">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="adm-featured-card-footer">
                      <span className="adm-feat-type">{f.type}</span>
                      <span className="adm-feat-days">
                        <Clock size={12} /> {daysLeft(f.endDate)} días restantes
                      </span>
                      <span className="adm-muted" style={{fontSize:'0.72rem'}}>
                        hasta {new Date(f.endDate).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal detalle: Usuario (mobile) ── */}
      {userDetail && (
        <DetailModal title={`👤 ${userDetail.name}`} onClose={() => setUserDetail(null)}>
          <div className="adm-detail-row"><span className="adm-detail-label">Email</span><span className="adm-detail-val adm-muted">{userDetail.email}</span></div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Registrado</span>
            <span className="adm-detail-val adm-muted">{new Date(userDetail.createdAt).toLocaleDateString('es-AR')}</span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Estado</span>
            <span className="adm-detail-val">
              {userDetail.blocked
                ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span>
                : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}
            </span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Rol</span>
            <span className="adm-detail-val">
              <select
                className={`adm-role-select adm-role-${userDetail.role}`}
                value={userDetail.role}
                onChange={e => changeRole(userDetail._id, e.target.value)}
                disabled={userDetail.role === 'admin'}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.7rem' }}
              >
                <option value="user">user</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
            </span>
          </div>
          <div className="adm-modal-footer" style={{ paddingTop: '0.75rem' }}>
            <button className="adm-btn-cancel" onClick={() => setUserDetail(null)}>Cerrar</button>
            <button
              className={`adm-btn-confirm ${userDetail.blocked ? 'green' : 'red'}`}
              onClick={() => blockUser(userDetail._id, userDetail.name, !!userDetail.blocked)}
              disabled={userDetail.role === 'admin'}
            >
              {userDetail.blocked ? <><CheckCircle size={14} /> Desbloquear</> : <><Ban size={14} /> Bloquear</>}
            </button>
          </div>
        </DetailModal>
      )}

      {/* ── Modal detalle: Negocio (mobile) ── */}
      {bizDetail && (
        <DetailModal title={bizDetail.name} onClose={() => setBizDetail(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <img src={bizDetail.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(bizDetail.name)}&size=48&background=f97316&color=fff`} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--adm-border2)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--adm-text)' }}>{bizDetail.name}</div>
              <div className="adm-muted" style={{ fontSize: '0.8rem' }}>{bizDetail.city || 'Sin ciudad'}</div>
            </div>
          </div>

          <div className="adm-detail-row"><span className="adm-detail-label">Dueño</span><span className="adm-detail-val adm-muted">{bizDetail.owner?.name}</span></div>
          <div className="adm-detail-row"><span className="adm-detail-label">Email</span><span className="adm-detail-val adm-muted" style={{ fontSize: '0.78rem' }}>{bizDetail.owner?.email}</span></div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Estado</span>
            <span className="adm-detail-val">
              {bizDetail.blocked
                ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span>
                : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}
            </span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Verificado</span>
            <span className="adm-detail-val">
              {bizDetail.verified
                ? <span className="adm-verified-chip"><CheckCircle size={10} /> Sí</span>
                : <span className="adm-muted" style={{ fontSize: '0.82rem' }}>No</span>}
            </span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Destacado</span>
            <span className="adm-detail-val">
              {bizDetail.featuredInfo
                ? <span className="adm-featured-chip"><Crown size={11} /> {daysLeft(bizDetail.featuredInfo.endDate)} días</span>
                : <span className="adm-muted" style={{ fontSize: '0.82rem' }}>No</span>}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem' }}>
            <button
              className={`adm-btn-sm ${bizDetail.verified ? 'orange' : 'green'}`}
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => verifyBusiness(bizDetail._id, bizDetail.verified)}
            >
              {bizDetail.verified ? <><XCircle size={14}/> Quitar verificación</> : <><CheckCircle size={14}/> Verificar negocio</>}
            </button>
            <button
              className="adm-btn-sm gold"
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => { setBizDetail(null); openFeatured(bizDetail); }}
            >
              <Crown size={14} /> Destacar negocio
            </button>
            <button
              className={`adm-btn-sm ${bizDetail.blocked ? 'green' : 'red'}`}
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => { setBizDetail(null); openBlockBusiness(bizDetail._id); }}
            >
              {bizDetail.blocked ? <><CheckCircle size={14}/> Desbloquear</> : <><Ban size={14}/> Bloquear</>}
            </button>
            <button className="adm-btn-cancel" style={{ textAlign: 'center' }} onClick={() => setBizDetail(null)}>Cerrar</button>
          </div>
        </DetailModal>
      )}

      {/* ── Modal detalle: Usuario reciente (mobile) ── */}
      {recentUserDetail && (
        <DetailModal title={`👤 ${recentUserDetail.name}`} onClose={() => setRecentUserDetail(null)}>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Email</span>
            <span className="adm-detail-val adm-muted">{recentUserDetail.email}</span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Rol</span>
            <span className="adm-detail-val">
              <span className={`adm-role-badge adm-role-${recentUserDetail.role} adm-role-fixed`}>
                {recentUserDetail.role}
              </span>
            </span>
          </div>
          <div className="adm-detail-row">
            <span className="adm-detail-label">Registrado</span>
            <span className="adm-detail-val adm-muted">
              {new Date(recentUserDetail.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="adm-modal-footer" style={{ paddingTop: '0.75rem' }}>
            <button className="adm-btn-cancel" onClick={() => setRecentUserDetail(null)}>Cerrar</button>
          </div>
        </DetailModal>
      )}

      {/* ── Modal: Destacar negocio ── */}
      {featModal && (
        <div className="adm-modal-overlay" onClick={() => setFeatModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2><Crown size={18} /> Destacar "{featBizName}"</h2>
              <button onClick={() => setFeatModal(false)}><X size={17} /></button>
            </div>
            <div className="adm-modal-body">
              <label className="adm-label">Tipo de destacado</label>
              <div className="adm-feat-options">
                {(['daily','weekly','monthly','custom'] as const).map(t => (
                  <button key={t} className={`adm-feat-opt ${featType === t ? 'active' : ''}`} onClick={() => setFeatType(t)}>
                    {t === 'daily' && '📅 1 día'}
                    {t === 'weekly' && '📆 1 semana'}
                    {t === 'monthly' && '🗓️ 1 mes'}
                    {t === 'custom' && '⚙️ Personalizado'}
                  </button>
                ))}
              </div>

              {featType === 'custom' && (
                <div className="adm-field">
                  <label className="adm-label">Cantidad de días</label>
                  <input type="number" min="1" max="365" value={featDays} onChange={e => setFeatDays(e.target.value)} className="adm-input" />
                </div>
              )}

              <div className="adm-field">
                <label className="adm-label">Nota interna (opcional)</label>
                <input type="text" placeholder="Ej: Plan Premium pagado" value={featNote} onChange={e => setFeatNote(e.target.value)} className="adm-input" />
              </div>

              <div className="adm-modal-footer">
                <button className="adm-btn-cancel" onClick={() => setFeatModal(false)}>Cancelar</button>
                <button className="adm-btn-confirm gold" onClick={submitFeatured} disabled={featSaving}>
                  <Crown size={15} /> {featSaving ? 'Guardando...' : 'Confirmar destacado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Bloquear negocio ── */}
      {blockModal && (
        <div className="adm-modal-overlay" onClick={() => setBlockModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2><Ban size={18} /> Bloquear negocio</h2>
              <button onClick={() => setBlockModal(false)}><X size={17} /></button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-label">Motivo del bloqueo</label>
                <input type="text" placeholder="Ej: Incumplimiento de términos" value={blockReason} onChange={e => setBlockReason(e.target.value)} className="adm-input" />
              </div>
              <div className="adm-modal-footer">
                <button className="adm-btn-cancel" onClick={() => setBlockModal(false)}>Cancelar</button>
                <button className="adm-btn-confirm red" onClick={confirmBlockBusiness}>
                  <Ban size={15} /> Confirmar bloqueo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
