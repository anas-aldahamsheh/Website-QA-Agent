import { ArrowUpRight, Github, Linkedin, ListChecks, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SignalField } from '@/components/motion/signal-field';
import { BrandMark } from './brand-mark';
import { DashboardPreferences } from './dashboard-preferences';
import type { DashboardCopy, DashboardLocale } from './dashboard-copy';
import { PageIntro } from './page-intro';
import { ShellNav } from './shell-nav';
import { WelcomeOverlay } from './welcome-overlay';

type DashboardShellProps = {
  activePage: 'home' | 'results';
  title: string;
  subtitle: string;
  copy: DashboardCopy;
  locale: DashboardLocale;
  actions?: ReactNode;
  children: ReactNode;
};

const capabilityTicker = ['SEO', 'Accessibility', 'Performance', 'Frontend', 'Network / API', 'Security', 'Privacy', 'Crawl coverage', 'Structured data', 'Responsive'];

export function DashboardShell({ activePage, title, subtitle, copy, locale, actions, children }: DashboardShellProps) {
  const navLabels = { home: copy.navRunCenter, results: copy.navResults };

  return (
    <div className="relative min-h-screen text-foreground">
      <SignalField />
      <WelcomeOverlay locale={locale} />

      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] flex-col border-e border-border/80 bg-background/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/Run%20Center" className="group mb-9 flex items-center gap-3 rounded-xl px-2">
          <BrandMark size={42} />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-tight">{copy.brandName}</span>
            <span className="eyebrow block text-[9.5px]">{copy.brandSubtitle}</span>
          </span>
        </Link>

        <div className="eyebrow mb-2 px-3">{copy.workspace}</div>
        <ShellNav activePage={activePage} labels={navLabels} layout="rail" />

        <div className="mt-auto space-y-3">
          <div className="panel overflow-hidden p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-primary" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>
              {copy.liveStatus}
            </div>
            <SignalWave />
            <p className="text-[11.5px] leading-5 text-muted-foreground">{copy.liveStatusBody}</p>
          </div>
          <div className="flex items-center justify-between px-2 font-mono text-[10px] text-muted-foreground/70">
            <span>v2.0 · signal</span>
            <span dir="ltr">© 2026</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ps-[264px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/60 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
            <Link href="/Run%20Center" className="flex items-center gap-2.5 lg:hidden">
              <BrandMark size={32} />
              <span className="text-sm font-semibold tracking-tight">{copy.brandName}</span>
            </Link>
            <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground lg:flex">
              <span className="text-foreground/80">{copy.workspace}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-primary">{activePage === 'home' ? copy.navRunCenter : copy.navResults}</span>
            </div>
            <DashboardPreferences locale={locale} />
          </div>
          <div className="mx-auto mt-3 max-w-[1320px] lg:hidden">
            <ShellNav activePage={activePage} labels={navLabels} layout="bar" />
          </div>
        </header>

        <main className="flex-1 px-4 pb-16 pt-8 md:px-8 md:pt-12">
          <div className="mx-auto max-w-[1320px] space-y-8">
            <PageIntro crumb={`${copy.brandName} / ${activePage === 'home' ? copy.navRunCenter : copy.navResults}`} title={title} subtitle={subtitle} side={actions} />
            {children}
          </div>
        </main>

        <footer className="relative mt-auto overflow-hidden border-t border-border/80 bg-background/70 backdrop-blur-xl">
          <div className="border-b border-border/60 py-3" aria-hidden>
            <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
              {[...capabilityTicker, ...capabilityTicker].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-10">
                  {item}
                  <span className="h-1 w-1 rounded-full bg-primary/70" />
                </span>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1320px] px-4 py-12 md:px-8">
            <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={38} live={false} />
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      Website QA <span className="text-primary">Agent</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {locale === 'ar' ? 'تطوير: أنس الدهامشة' : 'Engineered by Anas Al-Dahamsheh'}
                    </p>
                  </div>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {locale === 'ar'
                    ? 'منظومة عملية متقدمة لفحص ومراقبة جودة المواقع، متابعة التقدم لحظياً، وتنظيم وتحليل النتائج الفنية بدقة.'
                    : 'A practical console for website quality scanning, live progress tracking, and organized technical review.'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="eyebrow">{locale === 'ar' ? 'بيانات التواصل المباشر' : 'Contact developer'}</h4>
                <div className="flex flex-col items-start gap-1 text-xs">
                  <FooterContact href="tel:+962789495167" icon={<Phone className="h-3.5 w-3.5" />} label="+962 789 495 167" />
                  <FooterContact href="https://www.linkedin.com/in/anas-aldahamsheh" icon={<Linkedin className="h-3.5 w-3.5" />} label="linkedin.com/in/anas-aldahamsheh" external />
                  <FooterContact href="https://github.com/anas-aldahamsheh" icon={<Github className="h-3.5 w-3.5" />} label="github.com/anas-aldahamsheh" external />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="eyebrow">{locale === 'ar' ? 'روابط سريعة' : 'Navigation'}</h4>
                <div className="flex flex-col gap-2 text-sm">
                  <Link href="/Run%20Center" className="group inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                    {copy.navRunCenter}
                    <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                  <Link href="/results" className="group inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                    {copy.navResults}
                    <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-border/60 pt-6 sm:flex-row sm:items-end">
              <p className="text-xs text-muted-foreground">
                © 2026 <strong className="font-semibold text-foreground">Anas Al-Dahamsheh</strong>. {locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
              </p>
              <p aria-hidden className="display select-none text-5xl leading-none text-foreground/[0.07] sm:text-7xl" dir="ltr">
                quality, observed.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FooterContact({ href, icon, label, external = false }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group inline-flex items-center gap-2.5 rounded-lg py-1.5 pe-2 font-medium text-foreground/90 transition-colors hover:text-primary"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-primary transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_18px_-4px_hsl(var(--primary))]">
        {icon}
      </span>
      <span dir="ltr" className="font-mono text-xs">{label}</span>
    </a>
  );
}

// A small oscilloscope trace for the live status card.
function SignalWave() {
  return (
    <svg viewBox="0 0 200 36" className="my-3 h-9 w-full" aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id="wave-fade" x1="0" x2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0" />
          <stop offset="0.5" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 18 H40 L48 18 L54 6 L60 30 L66 12 L72 22 L78 18 H120 L128 18 L134 4 L140 32 L146 10 L152 24 L158 18 H200"
        fill="none"
        stroke="url(#wave-fade)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        pathLength="200"
        strokeDasharray="70 130"
      >
        <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2.6s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: string }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
        <span className="animate-pulse-ring absolute inset-0 rounded-2xl border border-primary/50" />
        <ListChecks className="h-7 w-7 text-primary" />
      </span>
      <h2 className="display text-3xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {cta ? (
        <Link href="/Run%20Center" className="btn-primary mt-6">
          {cta}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
