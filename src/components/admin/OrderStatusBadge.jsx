import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  nuevo: { label: 'Nuevo', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pendiente_pago: { label: 'Pend. pago', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmado: { label: 'Confirmado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_proceso: { label: 'En proceso', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  recogido: { label: 'Recogido', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  en_camino: { label: 'En camino', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  entregado: { label: 'Entregado', className: 'bg-green-50 text-green-700 border-green-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.nuevo;
  return (
    <Badge variant="outline" className={`${config.className} font-medium text-xs`}>
      {config.label}
    </Badge>
  );
}
