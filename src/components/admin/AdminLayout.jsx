import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, ClipboardList, Menu, MessageCircle, Search, Store, Truck, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoStore } from '@/lib/DemoStore';

const navItems = [
  { path: '/admin', label: 'Pedidos', icon: ClipboardList, exact: true },
  { path: '/admin/conversaciones', label: 'Conversaciones', icon: MessageCircle },
  { path: '/admin/negocios', label: 'Negocios', icon: Store },
  { path: '/admin/paquetes', label: 'Paquetes', icon: Box },
  { path: '/admin/repartidores', label: 'Repartidores', icon: Users },
  { path: '/repartidor/acceso', label: 'Vista repartidor', icon: Truck },
  { path: '/', label: 'Vista cliente', icon: Search },
];

export default function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, currentAccount, authLoading, isProduction } = useDemoStore();
  const user = currentUser || currentAccount;

  if (isProduction && authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando panel…</div>;
  }
  if (isProduction && !user) return <Navigate to="/acceso?return=/admin" replace />;
  if (isProduction && user.role !== 'admin') return <Navigate to="/mi-cuenta" replace />;

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path || location.pathname.startsWith('/admin/pedido/');
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex fixed h-full w-64 flex-col border-r border-white/10 bg-foreground text-background">
        <div className="border-b border-white/10 p-5">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-lg font-extrabold">
              W
            </div>
            <div>
              <p className="font-heading text-base font-bold">Panel</p>
              <p className="text-xs text-white/50">Operación manual</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                    isActive(item)
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs font-semibold text-white">{isProduction ? 'Operación real' : 'Demo operativa'}</p>
            <p className="mt-1 text-[11px] leading-4 text-white/45">{isProduction ? 'Datos persistentes · chat web activo.' : 'Servicios externos en modo simulado.'}</p>
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-foreground px-4 py-3 text-background">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-base font-extrabold">
            W
          </div>
          <div>
            <p className="font-heading text-sm font-bold">Panel</p>
            <p className="text-[11px] text-white/55">Operación manual</p>
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-foreground pt-20 px-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <div
                  className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-base ${
                    isActive(item) ? 'bg-primary/20 text-white font-semibold' : 'text-white/65'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="min-h-screen flex-1 pt-16 md:ml-64 md:pt-0">
        <div className="max-w-7xl p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
