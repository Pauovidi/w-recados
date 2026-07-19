import React from 'react';
import { Globe2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';

export default function LanguageSelector({ dark = false }) {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe2 className={`w-4 h-4 ${dark ? 'text-white/70' : 'text-muted-foreground'}`} />
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className={dark ? 'h-10 w-[132px] rounded-full border-white/15 bg-white/10 text-white' : 'h-10 w-[132px] rounded-full'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}