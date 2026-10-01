import { Activity, BarChart3, Github, Home, LayoutDashboard, Linkedin, ListChecks, Phone, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { DashboardPreferences } from './dashboard-preferences';
import type { DashboardCopy, DashboardLocale } from './dashboard-copy';
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

export function DashboardShell({ activePage, title, subtitle, copy, locale, actions, children }: DashboardShellProps) {
  const navigationItems = [
    { href: '/Run%20Center', label: copy.navRunCenter, icon: Home, key: 'home' },
    { href: '/results', label: copy.navResults, icon: BarChart3, key: 'results' }
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WelcomeOverlay locale={locale} />
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-4 py-5 lg:block">
        <Link href="/Run%20Center" className="mb-8 flex items-center gap-3 rounded-md px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{copy.brandName}</span>
            <span className="text-xs text-muted-foreground">{copy.brandSubtitle}</span>
          </span>
        </Link>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            {copy.liveStatus}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {copy.liveStatusBody}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex gap-2 lg:hidden">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.key;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs ${
                        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <LayoutDashboard className="h-4 w-4" />
                {copy.workspace}
              </div>
              <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DashboardPreferences locale={locale} />
              {actions}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>

        <footer className="mt-auto border-t border-border bg-card/95 text-card-foreground">
          <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              {/* Brand & Creator Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                      Website QA <span className="text-primary">Agent</span>
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      {locale === 'ar' ? 'تطوير: أنس الدحامشة' : 'Engineered by Anas Aldahamsheh'}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {locale === 'ar'
                    ? 'منظومة عملية متقدمة لفحص ومراقبة جودة المواقع، متابعة التقدم لحظياً، وتنظيم وتحليل النتائج الفنية بدقة.'
                    : 'A practical console for website quality scanning, live progress tracking, and organized technical review.'}
                </p>
              </div>

              {/* Developer Contacts */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {locale === 'ar' ? 'بيانات التواصل المباشر' : 'Contact Developer'}
                </h4>
                <div className="flex flex-col items-start gap-2.5 text-xs">
                  {/* Phone */}
                  <a
                    href="tel:+962789495167"
                    className="group inline-flex items-center gap-2.5 font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary/20">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <span dir="ltr" className="font-mono text-xs">+962 789 495 167</span>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="https://www.linkedin.com/in/anas-aldahamsheh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary/20">
                      <Linkedin className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <span dir="ltr" className="font-mono text-xs">linkedin.com/in/anas-aldahamsheh</span>
                  </a>

                  {/* GitHub */}
                  <a
                    href="https://github.com/anas-aldahamsheh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary/20">
                      <Github className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <span dir="ltr" className="font-mono text-xs">github.com/anas-aldahamsheh</span>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {locale === 'ar' ? 'روابط سريعة' : 'Navigation'}
                </h4>
                <div className="flex flex-col gap-2 text-xs font-medium">
                  <Link href="/Run%20Center" className="text-muted-foreground hover:text-primary transition-colors">
                    {copy.navRunCenter}
                  </Link>
                  <Link href="/results" className="text-muted-foreground hover:text-primary transition-colors">
                    {copy.navResults}
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom copyright line */}
            <div className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground sm:text-start">
              <p>
                © 2026 <strong>Anas Aldahamsheh</strong>. {locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-6 text-center">
      <ListChecks className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
