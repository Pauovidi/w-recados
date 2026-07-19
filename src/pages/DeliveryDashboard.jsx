import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PackageCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AssignedOrderCard from '@/components/delivery/AssignedOrderCard';
import { useDemoStore } from '@/lib/DemoStore';

const NEXT_DELIVERY_STATUS = {
  asignado: 'recogido',
  recogido: 'en_camino',
  en_camino: 'entregado',
};

const STATUS_PRIORITY = {
  en_camino: 0,
  recogido: 1,
  asignado: 2,
  entregado: 3,
};

export default function DeliveryDashboard() {
  const { orders, couriers, settings, updateOrder } = useDemoStore();
  const activeCourierId = settings?.active_courier_id;
  const courier = couriers.find((item) => item.id === activeCourierId);

  const assignedOrders = useMemo(() => {
    if (!activeCourierId) return [];

    return orders
      .filter((order) => order.assigned_delivery === activeCourierId)
      .sort((first, second) => {
        const priorityDifference = (STATUS_PRIORITY[first.order_status] ?? 99)
          - (STATUS_PRIORITY[second.order_status] ?? 99);

        if (priorityDifference !== 0) return priorityDifference;
        return new Date(second.updated_date || 0) - new Date(first.updated_date || 0);
      });
  }, [activeCourierId, orders]);

  const activeOrders = assignedOrders.filter((order) => order.order_status !== 'entregado');
  const completedOrders = assignedOrders.length - activeOrders.length;

  const handleStatusUpdate = (id, order_status) => {
    const order = assignedOrders.find((item) => item.id === id);

    if (!courier || !order) {
      toast.error('No se ha podido identificar el pedido asignado.');
      return;
    }

    if (NEXT_DELIVERY_STATUS[order.order_status] !== order_status) {
      toast.error('Ese cambio de estado no está permitido.');
      return;
    }

    updateOrder(id, { order_status }, courier.name);
    toast.success(`Pedido #${order.order_number || order.id} actualizado`);
  };

  return (
    <div className="min-h-screen bg-muted/35 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-3 sm:px-5">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full">
            <Link to="/admin" aria-label="Volver al panel de administración">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Zona de reparto</p>
            <h1 className="truncate font-heading text-xl font-extrabold sm:text-2xl">{courier?.name || 'Panel repartidor'}</h1>
          </div>
          {courier && (
            <div className="flex h-11 min-w-11 items-center justify-center rounded-full bg-primary px-3 text-sm font-bold text-primary-foreground" aria-label={`${activeOrders.length} pedidos activos`}>
              {activeOrders.length}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        {!activeCourierId || !courier ? (
          <section className="rounded-3xl border border-border bg-card px-5 py-12 text-center shadow-sm">
            <Truck className="mx-auto mb-4 h-11 w-11 text-muted-foreground/45" />
            <h2 className="font-heading text-xl font-bold">No hay un repartidor activo</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Administración debe seleccionar un repartidor antes de abrir esta ruta de trabajo.
            </p>
          </section>
        ) : assignedOrders.length === 0 ? (
          <section className="rounded-3xl border border-border bg-card px-5 py-12 text-center shadow-sm">
            <PackageCheck className="mx-auto mb-4 h-11 w-11 text-primary/55" />
            <h2 className="font-heading text-xl font-bold">Todo despejado</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ahora mismo no tienes pedidos asignados.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-foreground/75">Tu jornada</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {activeOrders.length} {activeOrders.length === 1 ? 'recado activo' : 'recados activos'}
                  </p>
                </div>
                {completedOrders > 0 && (
                  <p className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold">
                    {completedOrders} {completedOrders === 1 ? 'entregado' : 'entregados'}
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="assigned-orders-title" className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 id="assigned-orders-title" className="font-heading text-lg font-bold">Pedidos asignados</h2>
                <span className="text-sm font-medium text-muted-foreground">{assignedOrders.length}</span>
              </div>
              {assignedOrders.map((order) => (
                <AssignedOrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleStatusUpdate}
                />
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
