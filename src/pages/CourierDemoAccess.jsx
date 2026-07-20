import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, MapPin, PackageCheck, Phone, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDemoStore } from '@/lib/DemoStore';

export default function CourierDemoAccess() {
  const navigate = useNavigate();
  const { couriers = [], orders = [], settings, setActiveCourier } = useDemoStore();
  const activeCouriers = couriers.filter((courier) => courier.is_active);

  const enterCourier = (courierId) => {
    setActiveCourier(courierId);
    navigate('/repartidor');
  };

  return (
    <div className="min-h-screen bg-muted/35 px-4 py-8 pb-28 sm:py-12">
      <main className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3"><Button asChild variant="outline" size="icon" className="rounded-full"><Link to="/admin" aria-label="Volver a administración"><ArrowLeft className="h-4 w-4" /></Link></Button><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Demo guiada</p><h1 className="font-heading text-3xl font-extrabold">Entrar como repartidor</h1></div></div>
        <Card className="rounded-[2rem] border-primary/20 bg-primary/5 p-5 text-sm leading-6 text-muted-foreground">Selecciona un perfil para ver exactamente los pedidos, teléfonos, direcciones y acciones que tendría esa persona. Es una simulación: no requiere contraseña ni cambia permisos reales.</Card>
        <section className="grid gap-4 sm:grid-cols-2">
          {activeCouriers.map((courier) => {
            const assigned = orders.filter((order) => order.assigned_delivery === courier.id && order.order_status !== 'entregado');
            const selected = settings?.active_courier_id === courier.id;
            return (
              <Card key={courier.id} className={`rounded-[2rem] p-5 shadow-sm ${selected ? 'border-primary ring-2 ring-primary/15' : ''}`}>
                <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Truck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><h2 className="font-heading text-lg font-bold">{courier.name}</h2>{selected && <Badge>Perfil actual</Badge>}</div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {courier.phone}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {courier.zone || 'Sin zona'}</p></div></div>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span className="flex items-center gap-2 text-sm font-semibold"><PackageCheck className="h-4 w-4 text-primary" /> {assigned.length} activos</span><Button data-testid={`courier-enter-${courier.id}`} onClick={() => enterCourier(courier.id)} className="rounded-full"><LogIn className="h-4 w-4" /> Ver como repartidor</Button></div>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
