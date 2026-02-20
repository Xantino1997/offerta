"use client";
// context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "seller" | "admin";
  avatar?: string;
  businessId?: string;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  lat?: number;
  lng?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  enableNotifications: () => Promise<boolean>;
  enableLocation: () => Promise<{ lat: number; lng: number } | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("marketplace_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const saveUser = (u: AuthUser | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem("marketplace_user", JSON.stringify(u));
    } else {
      localStorage.removeItem("marketplace_user");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("https://offertabackend.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || "Error al iniciar sesión" };
      }

      // Guardar token
      localStorage.setItem("marketplace_token", data.token);

      const backendUser = data.user;

      const formattedUser: AuthUser = {
        id: backendUser._id,
        name: backendUser.name,
        email: backendUser.email,
        role: backendUser.role,
        // ✅ FIX: persistir businessId para que el backend pueda filtrarlo
        businessId: backendUser.businessId,
        notificationsEnabled: false,
        locationEnabled: false,
      };

      saveUser(formattedUser);

      return { success: true, message: `Bienvenido, ${formattedUser.name}!` };
    } catch {
      return { success: false, message: "Error de conexión con el servidor" };
    }
  };

  const register = async (name: string, email: string, password: string, role = "user") => {
    try {
      const res = await fetch("https://offertabackend.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || "Error al registrarse" };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, message: "Error de conexión con el servidor" };
    }
  };

  const logout = () => {
    localStorage.removeItem("marketplace_token");
    saveUser(null);
  };

  const updateUser = (data: Partial<AuthUser>) => {
    if (!user) return;
    saveUser({ ...user, ...data });
  };

  const enableNotifications = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        updateUser({ notificationsEnabled: true });
        new Notification("¡Notificaciones activadas!", {
          body: "Recibirás alertas de ofertas cercanas y novedades.",
          icon: "/favicon.ico",
        });
        return true;
      }
    } catch {}
    return false;
  };

  const enableLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          updateUser({ locationEnabled: true, ...coords });
          resolve(coords);
        },
        () => resolve(null)
      );
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, enableNotifications, enableLocation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}