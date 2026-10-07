'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

// Section tabs for the results workspace; the lit marker glides to the chosen tab.
export function ResultsTabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto p-2" aria-label="Results sections">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={`relative inline-flex h-10 shrink-0 items-center rounded-lg px-4 text-sm font-semibold transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {isActive ? (
              <motion.span layoutId="results-tab" className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/[0.08]" transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
                <span className="absolute inset-x-4 -bottom-px h-[2px] rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
              </motion.span>
            ) : null}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
