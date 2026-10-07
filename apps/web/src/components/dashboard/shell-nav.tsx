'use client';

import { BarChart3, Radar } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

type ShellNavProps = {
  activePage: 'home' | 'results';
  labels: { home: string; results: string };
  layout: 'rail' | 'bar';
};

// Navigation with a lit indicator that glides between items.
export function ShellNav({ activePage, labels, layout }: ShellNavProps) {
  const items = [
    { href: '/Run%20Center', label: labels.home, icon: Radar, key: 'home', index: '01' },
    { href: '/results', label: labels.results, icon: BarChart3, key: 'results', index: '02' }
  ] as const;

  if (layout === 'bar') {
    return (
      <nav className="flex gap-1 rounded-xl border border-border bg-card/70 p-1 backdrop-blur" aria-label="Main">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {isActive ? <motion.span layoutId="nav-bar-pill" className="absolute inset-0 rounded-lg bg-primary" transition={{ type: 'spring', stiffness: 380, damping: 32 }} /> : null}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1" aria-label="Main">
      {items.map((item, position) => {
        const Icon = item.icon;
        const isActive = activePage === item.key;
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + position * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {isActive ? (
                <motion.span
                  layoutId="nav-rail-pill"
                  className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/[0.08]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
                </motion.span>
              ) : null}
              <Icon className={`relative h-4 w-4 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
              <span className="relative font-medium">{item.label}</span>
              <span className="relative ms-auto font-mono text-[10px] text-muted-foreground/70">{item.index}</span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
