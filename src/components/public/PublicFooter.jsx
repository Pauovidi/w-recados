import React from 'react';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export default function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-heading text-2xl font-black text-white">W</div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('footer.description')}</p>
          </div>

          <div>
            <h4 className="mb-3 font-heading font-semibold text-foreground">{t('footer.contact')}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>{import.meta.env.VITE_WHATSAPP_PHONE_DISPLAY || t('footer.phonePending')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{t('footer.location')}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-heading font-semibold text-foreground">{t('footer.hours')}</h4>
            <p className="text-sm text-muted-foreground">{t('footer.hoursLine1')}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} W · {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
