import React from 'react';
export default function ServiceCard({ icon, title, description }) {
  const ServiceIcon = icon;

  return (
    <div className="group rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
        <ServiceIcon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="mb-2 font-heading text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
