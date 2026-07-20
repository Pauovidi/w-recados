import { useState } from 'react';
import { Box, PackagePlus, Pencil, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SERVICE_LABELS } from '@/lib/domain';
import { useDemoStore } from '@/lib/DemoStore';

const blankPackage = {
  name: '', service_type: 'supermercado', description: '', contents: '', notes: '', is_active: true,
};

export default function PackageList() {
  const { packages = [], createPackage, updatePackage, deactivatePackage } = useDemoStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankPackage);

  const openNew = () => { setEditing(null); setForm(blankPackage); setDialogOpen(true); };
  const openEdit = (productPackage) => { setEditing(productPackage); setForm({ ...blankPackage, ...productPackage }); setDialogOpen(true); };
  const save = () => {
    if (!form.name.trim() || !form.contents.trim()) return;
    if (editing) updatePackage(editing.id, form);
    else createPackage(form);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Plantillas internas</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Paquetes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Referencias reutilizables; el cliente siempre puede describir su pedido libremente.</p>
        </div>
        <Button onClick={openNew} className="rounded-full"><PackagePlus className="h-4 w-4" /> Añadir paquete</Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {packages.map((productPackage) => (
          <Card key={productPackage.id} className={`rounded-[2rem] p-5 shadow-sm ${productPackage.is_active ? '' : 'opacity-60'}`}>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Box className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-lg font-bold">{productPackage.name}</h2><Badge variant="secondary">{SERVICE_LABELS[productPackage.service_type] || productPackage.service_type}</Badge><Badge variant="outline" className={productPackage.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{productPackage.is_active ? 'Activo' : 'Inactivo'}</Badge></div>
                {productPackage.description && <p className="mt-2 text-sm text-muted-foreground">{productPackage.description}</p>}
                <div className="mt-4 rounded-2xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contenido orientativo</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{productPackage.contents}</p></div>
                {productPackage.notes && <p className="mt-3 text-xs leading-5 text-muted-foreground">{productPackage.notes}</p>}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => openEdit(productPackage)} aria-label={`Editar ${productPackage.name}`}><Pencil className="h-4 w-4" /></Button>
            </div>
            <div className="mt-4 border-t pt-4"><Button variant="outline" size="sm" className="rounded-full" onClick={() => productPackage.is_active ? deactivatePackage(productPackage.id) : updatePackage(productPackage.id, { is_active: true })}><Power className="h-3.5 w-3.5" /> {productPackage.is_active ? 'Desactivar' : 'Activar'}</Button></div>
          </Card>
        ))}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader><DialogTitle>{editing ? 'Editar paquete' : 'Nuevo paquete'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Nombre *"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Tipo de servicio"><select value={form.service_type} onChange={(event) => setForm((current) => ({ ...current, service_type: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Descripción"><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-11 rounded-xl" /></Field>
            <Field label="Contenido orientativo *"><Textarea value={form.contents} onChange={(event) => setForm((current) => ({ ...current, contents: event.target.value }))} className="min-h-28 rounded-xl" placeholder="Productos, cantidades o instrucciones…" /></Field>
            <Field label="Notas internas"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-xl" /></Field>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(value) => setForm((current) => ({ ...current, is_active: value }))} /><Label>Paquete activo</Label></div>
          </div>
          <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button className="rounded-full" onClick={save} disabled={!form.name.trim() || !form.contents.trim()}>{editing ? 'Guardar' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
