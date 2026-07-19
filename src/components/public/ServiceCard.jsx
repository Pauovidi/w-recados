import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

export default function ServiceCard({ icon, title, description, serviceType }) {
  const { t } = useLanguage();
  const ServiceIcon = icon;

  return (
    <div className="group rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
        <ServiceIcon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="mb-2 font-heading text-lg font-bold text-foreground">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Link to={`/pedido?servicio=${serviceType}`}>
        <Button className="h-11 rounded-full px-5 text-sm font-semibold shadow-sm">
          {t('common.orderNow')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}