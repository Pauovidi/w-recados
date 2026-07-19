import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-8xl font-black text-primary/15">404</p>
        <h1 className="mt-4 font-heading text-2xl font-extrabold">Página no encontrada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          El enlace no existe o ya no está disponible.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
