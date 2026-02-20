'use client';
// app/admin/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/authContext';
import {
  LayoutDashboard, Users, Store, Shield, Ban,
  CheckCircle, XCircle, Search, Trash2,
  Package, Clock, AlertTriangle, Crown,
  RefreshCw, LogOut, X,
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

  // ── Actions ────────────────────────────────────────────
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
      toast('success', currentBlocked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
    } catch (e: any) { toast('error', e.message); }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
      toast('success', 'Rol actualizado');
    } catch (e: any) { toast('error', e.message); }
  };

  const verifyBusiness = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/businesses/${id}/verify`, { method: 'PATCH' });
      setBusinesses(prev => prev.map(b => b._id === id ? { ...b, verified: !current } : b));
      toast('success', current ? 'Verificación removida' : '¡Negocio verificado!');
    } catch (e: any) { toast('error', e.message); }
  };

  const openBlockBusiness = (id: string) => { setBlockBizId(id); setBlockReason(''); setBlockModal(true); };
  const confirmBlockBusiness = async () => {
    try {
      const biz = businesses.find(b => b._id === blockBizId);
      await apiFetch(`/businesses/${blockBizId}/block`, { method: 'PATCH', body: JSON.stringify({ reason: blockReason }) });
      setBusinesses(prev => prev.map(b => b._id === blockBizId ? { ...b, blocked: !b.blocked, blockedReason: blockReason } : b));
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
        <div className="adm-logo">
          <Shield size={22} />
          <span>Admin Panel</span>
        </div>

        <nav className="adm-nav">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} className={`adm-nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

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
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        <div className="adm-topbar">
          <div>
            <h1 className="adm-page-title">
              {tab === 'dashboard' && 'Dashboard'}
              {tab === 'users' && 'Gestión de Usuarios'}
              {tab === 'businesses' && 'Gestión de Negocios'}
              {tab === 'featured' && 'Negocios Destacados'}
            </h1>
            <p className="adm-page-sub">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="adm-refresh" onClick={() => { if (tab === 'dashboard') loadStats(); else if (tab === 'users') loadUsers(); else if (tab === 'businesses') loadBusinesses(); else loadFeatured(); }}>
            <RefreshCw size={15} />
          </button>
        </div>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && stats && (
          <div className="adm-content">
            <div className="adm-stats-grid">
              {[
                { label: 'Usuarios totales',   value: stats.totalUsers,         icon: Users,         color: 'blue'   },
                { label: 'Negocios',           value: stats.totalBusinesses,    icon: Store,         color: 'orange' },
                { label: 'Productos',          value: stats.totalProducts,      icon: Package,       color: 'green'  },
                { label: 'Destacados activos', value: stats.activeFeatured,     icon: Crown,         color: 'gold'   },
                { label: 'Usuarios bloqueados',value: stats.blockedUsers,       icon: Ban,           color: 'red'    },
                { label: 'Negocios bloqueados',value: stats.blockedBusinesses,  icon: AlertTriangle, color: 'red'    },
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
              <table className="adm-table">
                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Registrado</th></tr></thead>
                <tbody>
                  {stats.recentUsers.map((u: any) => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td className="adm-muted">{u.email}</td>
                      <td><span className={`adm-role-badge adm-role-${u.role}`}>{u.role}</span></td>
                      <td className="adm-muted">{new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                              {b.verified ? <><XCircle size={12}/> Quitar verificación</> : <><CheckCircle size={12}/> Verificar</>}
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