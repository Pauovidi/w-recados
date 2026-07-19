import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RotateCcw, Search, ShieldCheck, Truck, X } from 'lucide-react';
import { useDemoStore } from '@/lib/DemoStore';

const views = [
  { path: '/', label: 'Cliente', icon: Search },
  { path: '/admin', label: 'Admin', icon: ShieldCheck },
  { path: '/repartidor', label: 'Repartidor', icon: Truck },
];

export default function DemoNavigator() {
  const location = useLocation();
  const { resetDemo } = useDemoStore();
  const [hidden, setHidden] = useState(false);

  if (import.meta.env.VITE_DEMO_MODE === 'false') return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-3 right-3 z-[80] rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-xl"
      >
        Demo
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-[80] flex w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/95 p-1.5 text-white shadow-2xl backdrop-blur md:w-auto">
      <span className="hidden px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 sm:inline">Demo MVP</span>
      {views.map((view) => {
        const active = view.path === '/' ? location.pathname === '/' || location.pathname.startsWith('/pedido') : location.pathname.startsWith(view.path);
        return (
          <Link
            key={view.path}
            to={view.path}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition sm:flex-none ${
              active ? 'bg-blue-600 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <view.icon className="h-3.5 w-3.5" />
            {view.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => window.confirm('¿Restablecer todos los datos de la demostración?') && resetDemo()}
        title="Restablecer demo"
        className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => setHidden(true)} title="Ocultar barra" className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
