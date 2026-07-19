import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Globe2,
  MessageCircle,
  Package,
  Pill,
  ShoppingBag,
  ShoppingCart,
  Shield,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import ServiceCard from '@/components/public/ServiceCard';
import { useLanguage } from '@/hooks/useLanguage';

const serviceIcons = {
  supermercado: ShoppingCart,
  farmacia: Pill,
  compras_personales: ShoppingBag,
  recados: Package,
  transporte_productos: Truck,
};

export default function Home() {
  const { dictionary, t } = useLanguage();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_PHONE || '34600000000';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('header.whatsappPrefill'))}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
              {t('home.heroBadge')}
            </div>
            <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-tight md:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 md:text-lg">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/pedido">
                <Button size="lg" className="h-14 rounded-full px-8 text-base font-semibold shadow-lg">
                  {t('home.primaryCta')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-14 rounded-full border-white/20 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white">
                  <MessageCircle className="w-4 h-4" />
                  {t('home.secondaryCta')}
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-heading text-2xl font-black text-white shadow-lg" aria-label="W Recados">
                W
              </div>
              <p className="text-sm text-white/60">{t('home.servicesSubtitle')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {dictionary.services.list.map((service) => {
                const Icon = serviceIcons[service.value];
                return (
                  <div key={service.value} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Icon className="mb-3 w-5 h-5 text-primary" />
                    <p className="text-sm font-semibold">{service.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold">{t('home.servicesTitle')}</h2>
            <p className="mt-3 text-muted-foreground">{t('home.servicesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {dictionary.services.list.map((service) => (
              <ServiceCard
                key={service.value}
                icon={serviceIcons[service.value]}
                title={service.title}
                description={service.description}
                serviceType={service.value}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold">{t('home.stepsTitle')}</h2>
            <p className="mt-3 text-muted-foreground">{t('home.stepsSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {dictionary.home.steps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-heading text-lg font-bold text-primary">
                  {index + 1}
                </div>
                <h3 className="font-heading text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Shield, item: dictionary.home.trust[0] },
              { icon: Globe2, item: dictionary.home.trust[1] },
              { icon: Clock, item: dictionary.home.trust[2] },
            ].map(({ icon: Icon, item }) => (
              <div key={item.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-xl">
            <h2 className="font-heading text-2xl font-extrabold md:text-3xl">{t('home.seoTitle')}</h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-primary-foreground/90 md:text-base">
              {t('home.seoText')}
            </p>
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">{t('home.seoKeywordsTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {dictionary.home.seoKeywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-white/15 px-3 py-2 text-xs font-medium text-white">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
