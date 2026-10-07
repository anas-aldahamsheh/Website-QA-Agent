import { Save, ShieldCheck } from 'lucide-react';
import { saveTestProfileAction, triggerTestRunAction } from '@/app/actions';
import type { DashboardCopy } from './dashboard-copy';
import type { SavedProfileConfig } from '@/server/queries/dashboard';
import { IMPLEMENTED_CHECK_IDS } from '@sentinelqa/contracts';
import { Reveal, RevealItem } from '@/components/motion/primitives';
import { LaunchButton, ModeSelector, TargetComposer } from './launcher-client';

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

const availableChecks = new Set<string>(IMPLEMENTED_CHECK_IDS);

export function ScanLauncherPanel({ copy, profile, publicDemo = false }: { copy: DashboardCopy; profile?: SavedProfileConfig | undefined; publicDemo?: boolean }) {
  const configuredNumber = (name: string, fallback: number) => {
    const value = profile?.scopeConfig?.[name];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };
  return (
    <Reveal as="section" className="panel overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-primary">01</span>
          <h2 className="text-lg font-semibold tracking-tight">{copy.startScan}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{copy.startScanBody}</p>
      </div>

      <form action={triggerTestRunAction} className="divide-y divide-border">
        <div className="grid gap-8 px-5 py-6 md:px-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <RevealItem>
            <TargetComposer
              label={<FieldLabel label={copy.targetUrl} help="The public website URL to scan. Use the home page or the exact page you want as the entry point." />}
              defaultValue={profile?.targetUrl}
              readouts={{
                protocol: copy.readoutProtocol,
                host: copy.readoutHost,
                path: copy.readoutPath,
                status: copy.scopeStatus,
                idle: copy.scopeIdle,
                locked: copy.scopeLocked
              }}
            />
          </RevealItem>
          <RevealItem className="space-y-6">
            <ModeSelector
              name="scanMode"
              defaultValue={profile?.scanMode ?? 'STANDARD'}
              label={<FieldLabel label={copy.scanMode} help="Labels the run. The limits and enabled checks below determine scan coverage." />}
              options={[
                { value: 'STANDARD', label: copy.standard, hint: copy.standardHint },
                { value: 'DEEP', label: copy.deep, hint: copy.deepHint },
                { value: 'CUSTOM', label: copy.assisted, hint: copy.customHint }
              ]}
            />
            <div>
              <div className="eyebrow mb-3">{copy.limitsTitle}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                <NumberField name="maxPages" label={copy.maxPages} help="Maximum number of HTML pages the scan can visit." defaultValue={configuredNumber('maxPages', 100)} />
                <NumberField name="maxDepth" label={copy.maxDepth} help="Maximum link depth from the starting URL." defaultValue={configuredNumber('maxDepth', 5)} />
                <NumberField name="maxRequests" label={copy.maxRequests} help="Maximum total network requests before stopping." defaultValue={configuredNumber('maxRequests', 500)} />
                <NumberField name="maxExecutionTime" label={copy.maxMinutes} help="Maximum runtime budget in minutes." defaultValue={configuredNumber('maxExecutionTime', 30)} />
                <NumberField name="requestsPerSecond" label={copy.requestsPerSecond} help="Maximum request rate. Lower values are gentler on the target site." defaultValue={configuredNumber('requestsPerSecond', 10)} />
                <NumberField name="retryCount" label={copy.retries} help="How many times temporary failures should be retried." defaultValue={configuredNumber('retryCount', 3)} />
              </div>
            </div>
          </RevealItem>
        </div>

        <div className="px-5 py-6 md:px-7">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-primary">02</span>
              <h3 className="font-semibold tracking-tight">{copy.checksTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{copy.checksSelectedHint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {checkGroups.map((group, groupIndex) => (
              <RevealItem key={group.title}>
                <fieldset className="panel-inset h-full p-3">
                  <legend className="sr-only">{group.title}</legend>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      <span className="text-primary/80">{String(groupIndex + 1).padStart(2, '0')}</span>
                      {group.title}
                    </span>
                    <HelpTip text={group.help} />
                  </div>
                  <div className="space-y-1">
                    {group.checks.map(([value, label, help]) => {
                      const available = availableChecks.has(value);
                      return (
                        <label
                          key={value}
                          className={`group/check flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13px] transition-colors ${available ? 'cursor-pointer hover:bg-secondary/70' : 'cursor-not-allowed opacity-45'}`}
                        >
                          <input
                            className="peer sr-only"
                            type="checkbox"
                            name="checks"
                            value={value}
                            defaultChecked={available && (profile?.checks ? profile.checks.includes(value) : true)}
                            disabled={!available}
                          />
                          <span
                            aria-hidden
                            className="relative h-[18px] w-8 shrink-0 rounded-full border border-input bg-secondary transition-colors duration-300 after:absolute after:start-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-muted-foreground after:transition-all after:duration-300 after:ease-out-expo peer-checked:border-primary/60 peer-checked:bg-primary/20 peer-checked:after:translate-x-[14px] peer-checked:after:bg-primary peer-checked:after:shadow-[0_0_10px_hsl(var(--primary))] peer-focus-visible:ring-2 peer-focus-visible:ring-ring rtl:peer-checked:after:-translate-x-[14px]"
                          />
                          <span className="min-w-0 flex-1 truncate peer-checked:text-foreground">{label}</span>
                          <HelpTip text={available ? help : `${help} This check is not implemented yet.`} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </RevealItem>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 bg-background/40 px-5 py-5 md:px-7 lg:flex-row lg:items-end lg:justify-between">
          {publicDemo ? (
            <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {copy.launchNote}
            </p>
          ) : (
            <label className="block w-full max-w-md">
              <FieldLabel label={copy.profileName} help="Optional name for saving this scan setup as a reusable profile." />
              <input className="field mt-2" name="profileName" placeholder={copy.profilePlaceholder} />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {publicDemo ? null : (
              <button
                formAction={saveTestProfileAction}
                className="btn-ghost h-14 px-5"
              >
                <Save className="h-4 w-4" />
                {copy.saveProfile}
              </button>
            )}
            <LaunchButton label={copy.runScan} launching={copy.launching} />
          </div>
        </div>
      </form>
    </Reveal>
  );
}

function NumberField({ name, label, help, defaultValue }: { name: string; label: string; help: string; defaultValue: number }) {
  return (
    <label className="group/num panel-inset block px-3 py-2.5 transition-colors focus-within:border-primary/60 hover:border-muted-foreground/40">
      <span className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <HelpTip text={help} />
      </span>
      <input
        className="mt-1 w-full bg-transparent font-mono text-xl font-medium text-foreground outline-none transition-colors group-focus-within/num:text-primary"
        name={name}
        type="number"
        min={1}
        defaultValue={defaultValue}
        dir="ltr"
      />
    </label>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
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
      className="group/help relative z-20 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-secondary font-mono text-[9px] font-bold text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-primary focus:ring-2 focus:ring-ring/30"
    >
      ?
      <span
        className="pointer-events-none invisible absolute bottom-6 left-1/2 z-[9999] w-72 -translate-x-1/2 translate-y-1 whitespace-normal rounded-lg border border-border p-3 text-start font-sans text-xs font-medium leading-5 text-popover-foreground opacity-0 shadow-[0_18px_60px_hsl(var(--background)/0.9)] transition-all duration-300 ease-out-expo group-hover/help:visible group-hover/help:translate-y-0 group-hover/help:opacity-100 group-focus/help:visible group-focus/help:translate-y-0 group-focus/help:opacity-100"
        style={{ backgroundColor: 'hsl(var(--popover))' }}
      >
        {text}
      </span>
    </span>
  );
}
