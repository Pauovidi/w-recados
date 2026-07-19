import React, { useState } from 'react';
import { MapPin, Pencil, Phone, Plus, Power, Smartphone, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useDemoStore } from '@/lib/DemoStore';

const blankCourier = { name: '', phone: '', zone: 'Las Playitas', is_active: true, notes: '' };

export default function DeliveryPersonList() {
  const { couriers, orders, settings, createCourier, updateCourier, deactivateCourier, setActiveCourier } = useDemoStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankCourier);

  const openNew = () => {
    setEditing(null);
    setForm(blankCourier);
    setDialogOpen(true);
  };

  const openEdit = (courier) => {
    setEditing(courier);
    setForm({ ...blankCourier, ...courier });
    setDialogOpen(true);
  };

  const save = () => {
    if (editing) updateCourier(editing.id, form);
    else createCourier(form);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black">Repartidores</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión del equipo y selección del perfil usado en la demo móvil.</p>
        </div>
        <Button onClick={openNew} className="rounded-full"><Plus className="h-4 w-4" /> Añadir repartidor</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {couriers.map((courier) => {
          const assigned = orders.filter((order) => order.assigned_delivery === courier.id && !['entregado', 'cancelado'].includes(order.order_status)).length;
          const activeDemo = settings.active_courier_id === courier.id;
          return (
            <Card key={courier.id} className={`rounded-[2rem] transition ${activeDemo ? 'border-blue-400 shadow-md shadow-blue-100' : ''} ${courier.is_active ? '' : 'opacity-60'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Truck className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-heading font-bold">{courier.name}</h2>
                        <Badge variant="outline" className={courier.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{courier.is_active ? 'Activo' : 'Inactivo'}</Badge>
                        {activeDemo && <Badge className="bg-blue-600">Perfil demo</Badge>}
                      </div>
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {courier.phone}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {courier.zone || 'Sin zona'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => openEdit(courier)}><Pencil className="h-4 w-4" /></Button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center"><strong className="text-xl">{assigned}</strong><p className="text-[11px] text-muted-foreground">pedidos activos</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-center"><strong className="text-xl">{orders.filter((order) => order.assigned_delivery === courier.id).length}</strong><p className="text-[11px] text-muted-foreground">pedidos totales</p></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant={activeDemo ? 'default' : 'outline'} className="flex-1 rounded-full" onClick={() => setActiveCourier(courier.id)} disabled={!courier.is_active}>
                    <Smartphone className="h-4 w-4" /> {activeDemo ? 'Usando en móvil' : 'Usar en demo móvil'}
                  </Button>
                  {courier.is_active && <Button variant="outline" size="icon" className="rounded-full text-destructive" onClick={() => deactivateCourier(courier.id)} title="Desactivar"><Power className="h-4 w-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle>{editing ? 'Editar repartidor' : 'Nuevo repartidor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Nombre"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Teléfono"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-xl" placeholder="+34…" /></Field>
            <Field label="Zona"><Input value={form.zone} onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Notas"><Textarea value={form.notes || ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-xl" /></Field>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(value) => setForm((current) => ({ ...current, is_active: value }))} /><Label>Repartidor activo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={save} disabled={!form.name || !form.phone}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
