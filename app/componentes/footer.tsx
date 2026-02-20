"use client";
// components/footer.tsx

import Link from "next/link";
import {
  ShoppingCart,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Monitor,
  Shirt,
  Home,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo">
            <Link href="/" className="navbar-logo">
              <ShoppingCart size={22} strokeWidth={1.75} />
              Offerton
            </Link>
          </div>
          <p>
            La plataforma donde encontrás las mejores ofertas de negocios
            cercanos a vos. Ofertas reales, negocios verificados, entrega
            rápida.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">
              <Facebook size={16} strokeWidth={1.75} />
            </a>
            <a href="#" aria-label="Instagram">
              <Instagram size={16} strokeWidth={1.75} />
            </a>
            <a href="#" aria-label="Twitter">
              <Twitter size={16} strokeWidth={1.75} />
            </a>
            <a href="#" aria-label="WhatsApp">
              <MessageCircle size={16} strokeWidth={1.75} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Categorías</h4>
          <ul>
            <li>
              <Link href="/?category=electronica">
                <Monitor size={13} strokeWidth={1.75} /> Electrónica
              </Link>
            </li>
            <li>
              <Link href="/?category=ropa-moda">
                <Shirt size={13} strokeWidth={1.75} /> Ropa y Moda
              </Link>
            </li>
            <li>
              <Link href="/?category=hogar">
                <Home size={13} strokeWidth={1.75} /> Hogar
              </Link>
            </li>
            <li>
              <Link href="/?category=deportes">
                <Dumbbell size={13} strokeWidth={1.75} /> Deportes
              </Link>
            </li>
            <li>
              <Link href="/?category=alimentos">
                <ShoppingBag size={13} strokeWidth={1.75} /> Alimentos
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Cuenta</h4>
          <ul>
            <li>
              <Link href="/login">Iniciar sesión</Link>
            </li>
            <li>
              <Link href="/register">Registrarse</Link>
            </li>
            <li>
              <Link href="/profile">Mi perfil</Link>
            </li>
            <li>
              <Link href="/mis-productos">Mis productos</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Empresa</h4>
          <ul>
            <li>
              <Link href="#">Acerca de nosotros</Link>
            </li>
            <li>
              <Link href="#">Vender en MarketPlace</Link>
            </li>
            <li>
              <Link href="#">Centro de ayuda</Link>
            </li>
            <li>
              <Link href="#">Contacto</Link>
            </li>
            <li>
              <Link href="#">Blog</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>
            © {new Date().getFullYear()} MarketPlace. Todos los derechos
            reservados.
          </p>
          <div className="footer-bottom-links">
            <Link href="#">Privacidad</Link>
            <Link href="#">Términos</Link>
            <Link href="#">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
