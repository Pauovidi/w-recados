import React from 'react';
import { Badge } from '@/components/ui/badge';

const paymentConfig = {
  sin_presupuestar: { label: 'Sin presupuesto', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  sin_cobrar: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pendiente: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pagado: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reembolsado: { label: 'Reembolsado', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  pagado_tarjeta: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pagado_bizum: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pagado_efectivo: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function PaymentStatusBadge({ status }) {
  const config = paymentConfig[status] || paymentConfig.pendiente;
  return (
    <Badge variant="outline" className={`${config.className} font-medium text-xs`}>
      {config.label}
    </Badge>
  );
}
