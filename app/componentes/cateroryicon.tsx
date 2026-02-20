'use client';
// components/CategoryIcon.tsx
// Renderiza dinámicamente cualquier icono de lucide-react por nombre

import {
  Monitor,
  Shirt,
  Home,
  Dumbbell,
  ShoppingBag,
  Heart,
  Car,
  Gift,
  BookOpen,
  PawPrint,
  Tag,
  MapPin,
  Bell,
  CheckCircle,
  Package,
  Star,
  Search,
  User,
  LogOut,
  Store,
  ShoppingCart,
  ChevronDown,
  ArrowRight,
  Trash2,
  Pencil,
  Plus,
  X,
  LucideProps,
} from 'lucide-react';
import { FC } from 'react';

const iconMap: { [key: string]: FC<LucideProps> } = {
  Monitor,
  Shirt,
  Home,
  Dumbbell,
  ShoppingBag,
  Heart,
  Car,
  Gift,
  BookOpen,
  PawPrint,
  Tag,
  MapPin,
  Bell,
  CheckCircle,
  Package,
  Star,
  Search,
  User,
  LogOut,
  Store,
  ShoppingCart,
  ChevronDown,
  ArrowRight,
  Trash2,
  Pencil,
  Plus,
  X,
};

interface CategoryIconProps extends LucideProps {
  name: string;
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}