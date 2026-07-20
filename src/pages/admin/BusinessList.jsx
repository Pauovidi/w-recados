import { useMemo, useState } from 'react';
import { Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Power, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useDemoStore } from '@/lib/DemoStore';

const blankBusiness = {
  name: '', phone: '', email: '', address: '', category: '', preferred_channel: 'whatsapp', notes: '', is_active: true,
};

export default function BusinessList() {
  const {
    businesses = [], orders = [], createBusiness, updateBusiness, deactivateBusiness,
  } = useDemoStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankBusiness);

  const assignmentsByBusiness = useMemo(() => orders.reduce((count, order) => {
    (order.business_assignments || []).forEach((assignment) => {
      count.set(assignment.business_id, (count.get(assignment.business_id) || 0) + 1);
    });
    return count;
  }, new Map()), [orders]);

  const openNew = () => {
    setEditing(null);
    setForm(blankBusiness);
    setDialogOpen(true);
  };

  const openEdit = (business) => {
    setEditing(business);
    setForm({ ...blankBusiness, ...business });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (editing) updateBusiness(editing.id, form);
    else createBusiness(form);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Operación de compra</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Negocios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Contactos de confianza para resolver compras y recados.</p>
        </div>
        <Button onClick={openNew} className="rounded-full"><Plus className="h-4 w-4" /> Añadir negocio</Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {businesses.map((business) => {
          const assignments = assignmentsByBusiness.get(business.id) || 0;
          const whatsappHref = business.phone
            ? `https://wa.me/${String(business.phone).replace(/\D/g, '')}`
            : '';
          return (
            <Card key={business.id} className={`rounded-[2rem] p-5 shadow-sm ${business.is_active ? '' : 'opacity-60'}`}>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-bold">{business.name}</h2>
                    <Badge variant="outline" className={business.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{business.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    {business.category && <Badge variant="secondary">{business.category}</Badge>}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {business.phone}</p>
                  {business.email && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {business.email}</p>}
                  {business.address && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {business.address}</p>}
                  {business.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{business.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => openEdit(business)} aria-label={`Editar ${business.name}`}><Pencil className="h-4 w-4" /></Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                <Badge variant="secondary">{assignments} {assignments === 1 ? 'pedido asignado' : 'pedidos asignados'}</Badge>
                {whatsappHref && business.preferred_channel !== 'email' && <Button asChild variant="outline" size="sm" className="rounded-full"><a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp</a></Button>}
                {business.email && business.preferred_channel !== 'whatsapp' && <Button asChild variant="outline" size="sm" className="rounded-full"><a href={`mailto:${business.email}`}><Mail className="h-3.5 w-3.5" /> Email</a></Button>}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => business.is_active ? deactivateBusiness(business.id) : updateBusiness(business.id, { is_active: true })}
                >
                  <Power className="h-3.5 w-3.5" /> {business.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader><DialogTitle>{editing ? 'Editar negocio' : 'Nuevo negocio'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre *"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Teléfono *"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-xl" placeholder="+34…" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-xl" placeholder="pedidos@negocio.com" /></Field>
            <Field label="Categoría"><Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="h-11 rounded-xl" placeholder="Supermercado, farmacia…" /></Field>
            <Field label="Dirección"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Canal preferido"><select value={form.preferred_channel} onChange={(event) => setForm((current) => ({ ...current, preferred_channel: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="both">WhatsApp y email</option></select></Field>
            <div className="sm:col-span-2"><Field label="Notas internas"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-xl" /></Field></div>
            <div className="flex items-center gap-3 sm:col-span-2"><Switch checked={form.is_active} onCheckedChange={(value) => setForm((current) => ({ ...current, is_active: value }))} /><Label>Negocio activo</Label></div>
          </div>
          <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button className="rounded-full" onClick={save} disabled={!form.name.trim() || !form.phone.trim()}>{editing ? 'Guardar' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
