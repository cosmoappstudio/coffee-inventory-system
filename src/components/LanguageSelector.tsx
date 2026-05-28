import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { LANGUAGES, type LanguageCode } from '../i18n/translations';

type LanguageSelectorProps = {
  variant?: 'dark' | 'light';
  compact?: boolean;
  placement?: 'top' | 'bottom';
};

export default function LanguageSelector({
  variant = 'light',
  compact = false,
  placement = 'bottom',
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = variant === 'dark';
  const activeLanguage = LANGUAGES.find((option) => option.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={compact ? 'relative inline-block text-left' : 'relative block w-full text-left'}
      data-i18n-skip="true"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`min-h-[42px] rounded-xl border transition-colors inline-flex items-center justify-between gap-2 cursor-pointer ${
          compact ? 'px-3' : 'w-full px-3'
        } ${
          isDark
            ? 'border-espresso-800 bg-espresso-900/80 text-espresso-100 hover:bg-espresso-900 hover:border-brand-amber/40'
            : 'border-espresso-200 bg-white text-espresso-900 hover:bg-espresso-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? 'bg-brand-amber/15 text-brand-darkcream' : 'bg-espresso-50 text-brand-terracotta'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
          </span>
          {!compact && (
            <span className="min-w-0">
              <span className={`block text-[10px] font-bold uppercase tracking-wider leading-none ${isDark ? 'text-espresso-300' : 'text-espresso-500'}`}>
                {t('Dil')}
              </span>
              <span className="block text-sm font-extrabold truncate mt-0.5">
                {activeLanguage.nativeName}
              </span>
            </span>
          )}
          {compact && (
            <span className="text-sm font-extrabold whitespace-nowrap">
              {activeLanguage.code.toUpperCase()}
            </span>
          )}
          </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 max-h-[260px] overflow-y-auto rounded-xl border p-1.5 shadow-xl ${
            compact ? 'min-w-[180px]' : 'w-full min-w-[210px]'
          } ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            isDark
              ? 'right-0 border-espresso-800 bg-espresso-950 text-espresso-100'
              : 'left-0 border-espresso-200 bg-white text-espresso-950'
          }`}
          role="listbox"
        >
          {LANGUAGES.map((option) => {
            const selected = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setLanguage(option.code as LanguageCode);
                  setOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 rounded-lg text-left flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  selected
                    ? isDark
                      ? 'bg-brand-amber text-espresso-950'
                      : 'bg-brand-terracotta text-white'
                    : isDark
                      ? 'hover:bg-espresso-900 text-espresso-200'
                      : 'hover:bg-espresso-50 text-espresso-800'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`w-8 h-7 rounded-md flex items-center justify-center text-[11px] font-extrabold ${
                    selected
                      ? 'bg-white/25'
                      : isDark
                        ? 'bg-espresso-900 text-espresso-300'
                        : 'bg-espresso-50 text-espresso-600'
                  }`}>
                    {option.code.toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold truncate">{option.nativeName}</span>
                  <span className={`block text-[10px] leading-tight ${selected ? 'opacity-75' : 'opacity-55'}`}>
                    {option.label}
                  </span>
                  </span>
                </span>
                {selected && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
