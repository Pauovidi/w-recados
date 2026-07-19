import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { useLanguage } from '@/hooks/useLanguage';
import { useDemoStore } from '@/lib/DemoStore';
import { normalizePhone } from '@/lib/domain';

export default function OrderConfirmation() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const { orders, settings } = useDemoStore();
  const order = orders.find((item) => item.id === searchParams.get('pedido'));
  const whatsappNumber = normalizePhone(settings.whatsapp_phone).replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${t('confirmation.whatsappPrefill')} #${order?.order_number || ''}`)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="w-full max-w-xl px-4">
          <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm md:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-extrabold">{t('confirmation.title')}</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{t('confirmation.description')}</p>
            {order && (
              <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{t('confirmation.reference')}</p>
                    <p className="mt-1 font-heading text-2xl font-black text-blue-950">{t('confirmation.order')} #{order.order_number}</p>
                  </div>
                  <Clock3 className="h-8 w-8 text-blue-600" />
                </div>
                <p className="mt-3 text-sm leading-6 text-blue-900">{t('confirmation.nextSteps')}</p>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/">
                <Button variant="outline" className="h-12 rounded-full px-6 font-semibold w-full sm:w-auto">
                  <Home className="w-4 h-4" /> {t('confirmation.home')}
                </Button>
              </Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="h-12 rounded-full px-6 font-semibold w-full sm:w-auto">
                  <MessageCircle className="w-4 h-4" /> {t('confirmation.whatsapp')}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
