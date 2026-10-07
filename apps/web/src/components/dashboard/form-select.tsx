'use client';

import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background/70 px-3 text-start text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-300 hover:border-muted-foreground/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 ${open ? 'border-primary ring-4 ring-primary/15' : 'border-input'}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180 text-foreground' : ''}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={selectId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-64 origin-top overflow-y-auto rounded-xl border border-border p-1 text-sm text-popover-foreground shadow-[0_24px_60px_-12px_hsl(0_0%_0%/0.6)]"
            style={{ backgroundColor: 'hsl(var(--popover))' }}
            data-lenis-prevent
          >
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-popover-foreground hover:bg-secondary'
                  }`}
                  onClick={() => {
                    setSelected(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </motion.button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
