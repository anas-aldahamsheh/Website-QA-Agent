import { Play, Save } from 'lucide-react';
import { saveTestProfileAction, triggerTestRunAction } from '@/app/actions';
import type { DashboardCopy } from './dashboard-copy';
import type { SavedProfileConfig } from '@/server/queries/dashboard';
import { IMPLEMENTED_CHECK_IDS } from '@sentinelqa/contracts';
import { FormSelect } from './form-select';

const checkGroups = [
  {
    title: 'Discovery',
    help: 'Finds internal pages, follows allowed links, and detects broken navigation targets.',
    checks: [
      ['discovery', 'Discover pages', 'Collects the starting page and discovered internal URLs.'],
      ['recursive_links', 'Recursive links', 'Continues crawling allowed links until depth and page limits are reached.'],
      ['broken_links', 'Broken links', 'Flags links and resources that return failing HTTP responses.']
    ]
  },
  {
    title: 'Experience',
    help: 'Checks visible interface quality and navigation behavior.',
    checks: [
      ['visual_layout', 'Visual layout', 'Looks for layout and page-state problems.'],
      ['font_sizing', 'Font sizing', 'Reviews text sizing and readable content structure.'],
      ['navigation_flows', 'Navigation flows', 'Checks whether important navigation paths are reachable.'],
      ['interaction_loops', 'Interactions', 'Reviews repeated interaction and navigation patterns.']
    ]
  },
  {
    title: 'Devices',
    help: 'Checks responsive behavior and evidence capture across target views.',
    checks: [
      ['mobile_viewport', 'Mobile', 'Checks mobile viewport behavior.'],
      ['tablet_viewport', 'Tablet', 'Checks tablet viewport behavior.'],
      ['full_page_trace', 'Full page trace', 'Keeps trace context for investigation.'],
      ['video_recording', 'Video recording', 'Enables visual evidence capture where configured.']
    ]
  },
  {
    title: 'Quality',
    help: 'Checks accessibility, performance, SEO, structured data, and page quality signals.',
    checks: [
      ['accessibility', 'Accessibility', 'Checks accessibility-related page signals.'],
      ['screen_reader', 'Screen reader', 'Reviews structural signals used by assistive technologies.'],
      ['performance', 'Performance', 'Measures load and runtime performance indicators.'],
      ['resource_sizes', 'Resource sizes', 'Finds large transfers and heavy resources.'],
      ['seo', 'SEO', 'Checks titles, descriptions, headings, canonical tags, and indexability signals.'],
      ['structured_data', 'Structured data', 'Checks JSON-LD and structured data validity.']
    ]
  },
  {
    title: 'Security and APIs',
    help: 'Checks passive security, privacy, cookie, consent, and API/network signals.',
    checks: [
      ['security', 'Security', 'Reviews passive security headers and page security signals.'],
      ['ssrf_protection', 'SSRF', 'Validates target URLs before scanning.'],
      ['cookies_inspection', 'Cookies', 'Inspects cookie and privacy-related signals.'],
      ['consent_banners', 'Consent', 'Checks consent banner and tracking/privacy signals.'],
      ['api_payload', 'API payload', 'Reviews network/API failures and payload-related signals.'],
      ['schema_match', 'Schema match', 'Checks schema and structured response consistency.']
    ]
  }
] as const;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring';

const availableChecks = new Set<string>(IMPLEMENTED_CHECK_IDS);

export function ScanLauncherPanel({ copy, profile, publicDemo = false }: { copy: DashboardCopy; profile?: SavedProfileConfig | undefined; publicDemo?: boolean }) {
  const configuredNumber = (name: string, fallback: number) => {
    const value = profile?.scopeConfig?.[name];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{copy.startScan}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.startScanBody}</p>
        </div>
      </div>

      <form action={triggerTestRunAction} className="mt-5 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <label className="block">
            <FieldLabel label={copy.targetUrl} help="The public website URL to scan. Use the home page or the exact page you want as the entry point." />
            <input className={`${inputClass} mt-2`} name="targetUrl" type="url" placeholder="https://example.com" defaultValue={profile?.targetUrl} required />
          </label>
          <label className="block">
            <FieldLabel label={copy.scanMode} help="Labels the run. The limits and enabled checks below determine scan coverage." />
            <FormSelect
              name="scanMode"
              defaultValue={profile?.scanMode ?? 'STANDARD'}
              ariaLabel={copy.scanMode}
              className="mt-2"
              options={[
                { value: 'STANDARD', label: copy.standard },
                { value: 'DEEP', label: copy.deep },
                { value: 'CUSTOM', label: copy.assisted }
              ]}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField name="maxPages" label={copy.maxPages} help="Maximum number of HTML pages the scan can visit." defaultValue={configuredNumber('maxPages', 100)} />
          <NumberField name="maxDepth" label={copy.maxDepth} help="Maximum link depth from the starting URL." defaultValue={configuredNumber('maxDepth', 5)} />
          <NumberField name="maxRequests" label={copy.maxRequests} help="Maximum total network requests before stopping." defaultValue={configuredNumber('maxRequests', 500)} />
          <NumberField name="maxExecutionTime" label={copy.maxMinutes} help="Maximum runtime budget in minutes." defaultValue={configuredNumber('maxExecutionTime', 30)} />
          <NumberField name="requestsPerSecond" label={copy.requestsPerSecond} help="Maximum request rate. Lower values are gentler on the target site." defaultValue={configuredNumber('requestsPerSecond', 10)} />
          <NumberField name="retryCount" label={copy.retries} help="How many times temporary failures should be retried." defaultValue={configuredNumber('retryCount', 3)} />
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {checkGroups.map((group) => (
            <fieldset key={group.title} className="rounded-md border border-border bg-background p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {group.title}
                  <HelpTip text={group.help} />
                </span>
              </legend>
              <div className="mt-2 space-y-2">
                {group.checks.map(([value, label, help]) => (
                  <label key={value} className={`flex items-center gap-2 text-sm ${availableChecks.has(value) ? '' : 'opacity-50'}`}>
                    <input
                      className="h-4 w-4 rounded border-input accent-primary"
                      type="checkbox"
                      name="checks"
                      value={value}
                      defaultChecked={availableChecks.has(value) && (profile?.checks ? profile.checks.includes(value) : true)}
                      disabled={!availableChecks.has(value)}
                    />
                    {label}
                    <HelpTip text={availableChecks.has(value) ? help : `${help} This check is not implemented yet.`} />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          {publicDemo ? <div /> : (
            <label className="block">
              <FieldLabel label={copy.profileName} help="Optional name for saving this scan setup as a reusable profile." />
              <input className={`${inputClass} mt-2`} name="profileName" placeholder={copy.profilePlaceholder} />
            </label>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Play className="h-4 w-4" />
              {copy.runScan}
            </button>
            {publicDemo ? null : (
              <button
                formAction={saveTestProfileAction}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground"
              >
                <Save className="h-4 w-4" />
                {copy.saveProfile}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

function NumberField({ name, label, help, defaultValue }: { name: string; label: string; help: string; defaultValue: number }) {
  return (
    <label className="block">
      <FieldLabel label={label} help={help} />
      <input className={`${inputClass} mt-2`} name={name} type="number" min={1} defaultValue={defaultValue} />
    </label>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      {label}
      <HelpTip text={help} />
    </span>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      aria-label={text}
      className="group/help relative z-20 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-bold text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
    >
      ?
      <span
        className="pointer-events-none absolute bottom-6 left-1/2 z-[9999] hidden w-72 -translate-x-1/2 whitespace-normal rounded-md border border-border p-3 text-left text-xs font-semibold leading-5 text-popover-foreground opacity-100 shadow-[0_18px_60px_hsl(var(--background)/0.9)] ring-1 ring-border group-hover/help:block group-focus/help:block"
        style={{ backgroundColor: 'hsl(var(--popover))' }}
      >
        {text}
      </span>
    </span>
  );
}
