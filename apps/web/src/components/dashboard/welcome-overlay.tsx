'use client';

import { ArrowRight, Github, Linkedin, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardLocale } from './dashboard-copy';

const englishLines = [
  'Website QA Agent scans websites and organizes findings by page, severity, status, and technical area.',
  'It checks SEO titles, meta descriptions, headings, canonical tags, structured data, accessibility signals, responsive behavior, frontend structure, runtime errors, failed resources, network/API responses, security headers, cookies, consent signals, performance metrics, resource sizes, and crawl coverage.',
  'While a scan is running, the dashboard shows live progress, scanned pages, queued URLs, failed pages, blocked/skipped URLs, downloads, API endpoints, feature checks, logs, and navigation steps.',
  'After completion, the results workspace lets you filter by issue type, page, severity, and status, then update issue state and review evidence in a clean workflow.'
];

const arabicLines = [
  'Website QA Agent يفحص المواقع وينظم النتائج حسب الصفحة والخطورة والحالة والمجال التقني.',
  'يفحص عناوين SEO، أوصاف meta، العناوين الرئيسية، canonical، البيانات المنظمة، الوصول، تجاوب الشاشات، بنية الواجهة، أخطاء التشغيل، الموارد الفاشلة، الشبكة وواجهات API، ترويسات الأمان، الكوكيز، الموافقات، الأداء، أحجام الموارد، وتغطية الزحف.',
  'أثناء تشغيل الفحص يعرض التقدم المباشر، الصفحات المفحوصة، الروابط المنتظرة، الصفحات الفاشلة، الروابط المحجوبة أو المتخطاة، التحميلات، نقاط API، فحوصات الميزات، السجلات، وخطوات التنقل.',
  'بعد الانتهاء يمكنك فلترة النتائج حسب نوع المشكلة، الصفحة، الخطورة، والحالة، ثم تحديث حالة المشكلة ومراجعة الأدلة ضمن واجهة منظمة.'
];

export function WelcomeOverlay({ locale }: { locale: DashboardLocale }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const lines = useMemo(() => (locale === 'ar' ? arabicLines : englishLines), [locale]);
  const fullText = lines.join('\n\n');

  useEffect(() => {
    const dismissed = window.localStorage.getItem('sitescope-intro-dismissed');
    setIsOpen(dismissed !== 'true');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setText(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [fullText, isOpen]);

  if (!isOpen) {
    return null;
  }

  const close = () => {
    window.localStorage.setItem('sitescope-intro-dismissed', 'true');
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur">
      <div className="grid h-[720px] w-full max-w-6xl overflow-hidden rounded-md border border-border bg-card shadow-2xl lg:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col justify-between bg-primary p-8 text-primary-foreground">
          <div>
          <div className="text-sm font-semibold uppercase tracking-wide">{locale === 'ar' ? 'تم التطوير بواسطة' : 'Built by'}</div>
          <h2 className="mt-3 text-3xl font-semibold">Anas Al Dahamsheh</h2>
          <p className="mt-4 text-sm leading-6 text-primary-foreground/85">
            {locale === 'ar'
              ? 'واجهة عملية لفحص جودة المواقع، متابعة التقدم، وتنظيم النتائج الفنية بشكل واضح.'
              : 'A practical console for website quality scanning, progress tracking, and organized technical review.'}
          </p>
          </div>
          <div className="space-y-3 text-sm">
            <a className="flex items-center gap-3" href="tel:+962789495167">
              <Phone className="h-4 w-4" />
              +962789495167
            </a>
            <a className="flex items-center gap-3" href="https://github.com/anas-aldahamsheh" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              github.com/anas-aldahamsheh
            </a>
            <a className="flex items-center gap-3" href="https://www.linkedin.com/in/anas-aldahamsheh" target="_blank" rel="noopener noreferrer">
              <Linkedin className="h-4 w-4" />
              linkedin.com/in/anas-aldahamsheh
            </a>
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-8">
          <div className="text-sm font-semibold uppercase tracking-wide text-primary">Website QA Agent</div>
          <h1 className="mt-3 text-3xl font-semibold">{locale === 'ar' ? 'لوحة فحص جودة المواقع' : 'Website Quality Console'}</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <IntroPill label="SEO" />
            <IntroPill label="Accessibility" />
            <IntroPill label="Performance" />
            <IntroPill label="Frontend" />
            <IntroPill label="Network/API" />
            <IntroPill label="Security" />
          </div>
          <pre className="mt-6 h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
            {text}
            <span className="text-primary">▌</span>
          </pre>
          <button
            type="button"
            onClick={close}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            {locale === 'ar' ? 'الدخول إلى التطبيق' : 'Open the app'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IntroPill({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
      {label}
    </div>
  );
}
