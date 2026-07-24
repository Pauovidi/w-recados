import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/public/LanguageSelector';
import { useLanguage } from '@/hooks/useLanguage';
import { useDemoStore } from '@/lib/DemoStore';
import { WHATSAPP_ENABLED } from '@/lib/features';

export default function PublicHeader() {
  const { t } = useLanguage();
  const { currentAccount } = useDemoStore();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_PHONE || '34600000000';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('header.whatsappPrefill'))}`;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <Link to="/" className="order-1 flex items-center gap-3 self-start sm:order-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary font-heading text-xl font-black text-white">W</div>
          <div>
            <p className="font-heading text-base font-black leading-none">W Recados</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Las Playitas</p>
          </div>
        </Link>

        <div className="order-2 flex flex-wrap items-center gap-2 sm:order-2 sm:flex-nowrap">
          <LanguageSelector />
          <Link to={currentAccount ? currentAccount.role === 'admin' ? '/admin' : '/mi-cuenta' : '/acceso'} className="flex-1 sm:flex-none">
            <Button variant="outline" className="h-11 w-full rounded-full px-4 text-sm font-semibold">
              <UserRound className="h-4 w-4" />
              {currentAccount ? t('account.myAccount') : t('account.access')}
            </Button>
          </Link>
          {WHATSAPP_ENABLED && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" className="h-11 w-full rounded-full px-5 text-sm font-semibold">
              <MessageCircle className="w-4 h-4" />
              {t('header.whatsapp')}
            </Button>
          </a>}
          <a href="/#pedido" className="flex-1 sm:flex-none">
            <Button className="h-11 w-full rounded-full px-5 text-sm font-semibold shadow-sm">
              <Send className="w-4 h-4" />
              {t('header.order')}
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
