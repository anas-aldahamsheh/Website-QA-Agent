'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  name: string;
  defaultValue: string;
  options: FormSelectOption[];
  ariaLabel: string;
  className?: string;
};

export function FormSelect({ name, defaultValue, options, ariaLabel, className }: FormSelectProps) {
  const selectId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selected) ?? options[0],
    [options, selected]
  );
  const selectedValue = selectedOption?.value ?? defaultValue;
  const selectedLabel = selectedOption?.label ?? defaultValue;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        aria-controls={selectId}
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-start text-sm text-foreground outline-none transition hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/25"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180 text-foreground' : ''}`} />
      </button>
      {open ? (
        <div
          id={selectId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1 text-sm text-card-foreground shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: 'hsl(var(--card))' }}
        >
          {options.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                    : 'text-card-foreground hover:bg-secondary hover:text-secondary-foreground'
                }`}
                onClick={() => {
                  setSelected(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
