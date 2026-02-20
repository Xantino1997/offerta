"use client";
// components/Navbar.tsx — con badge de carrito global

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import { categories } from "../lib/db";
import "../styles/navbar.css";
import CategoryIcon from "../componentes/cateroryicon";
import { Home, Search, User, Package, Store, LogOut, ChevronDown, ShoppingCart } from "lucide-react";

export default function Navbar() {
  const { user, logout }    = useAuth();
  const { cartCount }       = useCart();
  const pathname            = usePathname();
  const router              = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link href="/" className="navbar-logo">
          Off<span>erton</span>
          <span className="navbar-logo-dot" />
        </Link>

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <Search size={16} className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Buscar productos, negocios..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="navbar-user" ref={dropdownRef} onClick={() => setDropdownOpen(v => !v)}>
              {/* Cart icon with badge */}
              <Link href="/panel?tab=cart" onClick={e => e.stopPropagation()}
                style={{ position: "relative", display: "flex", alignItems: "center", marginRight: "0.5rem", color: "var(--text-muted)", textDecoration: "none" }}>
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute", top: -7, right: -8,
                    background: "#f97316", color: "#fff",
                    borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700,
                    minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", lineHeight: 1,
                  }}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f97316&color=fff`}
                alt={user.name}
              />
              <span className="navbar-user-name">{user.name.split(" ")[0]}</span>
              <ChevronDown size={14} />

              {dropdownOpen && (
                <div className="navbar-dropdown">
                  <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                    <User size={16} /> Mi Perfil
                  </Link>
                  {user.role === "seller" ? (
                    <Link href="/mis-productos" onClick={() => setDropdownOpen(false)}>
                      <Package size={16} /> Mis Productos
                    </Link>
                  ) : (
                    <Link href="/panel" onClick={() => setDropdownOpen(false)}>
                      <ShoppingCart size={16} /> Mi Panel
                      {cartCount > 0 && (
                        <span style={{ background: "#f97316", color: "#fff", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", marginLeft: "auto" }}>
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {user.role === "seller" && (
                    <Link href="/negocio" onClick={() => setDropdownOpen(false)}>
                      <Store size={16} /> Mi Negocio
                    </Link>
                  )}
                  <div className="navbar-dropdown-divider" />
                  <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hide-mobile">Iniciar sesión</Link>
              <Link href="/register" className="btn btn-primary">Registrarse</Link>
            </>
          )}
        </div>
      </div>

      {/* Category strip */}
      <nav className="navbar-cats">
        <div className="navbar-cats-inner">
          <Link href="/" className={`navbar-cat-link ${!pathname.includes("category") ? "active" : ""}`}>
            <Home size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />Inicio
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/?category=${cat.slug}`} className={`navbar-cat-link ${pathname.includes(cat.slug) ? "active" : ""}`}>
              <CategoryIcon name={cat.iconName} size={24} strokeWidth={1.75} />
              <span className="category-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
