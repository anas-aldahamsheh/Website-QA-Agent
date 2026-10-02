import { IMPLEMENTED_CHECK_IDS } from '@sentinelqa/contracts';

export type LiveCheckStatus = 'WAITING' | 'RUNNING' | 'DONE' | 'ATTENTION' | 'NOT_RUN';

export type CheckProgress = {
  id: string;
  label: string;
  section: string;
  status: LiveCheckStatus;
  detail: string;
};

const IMPLEMENTED_CHECKS = new Set<string>(IMPLEMENTED_CHECK_IDS);

export const CHECK_CATALOG: { id: string; label: string; section: string; eventHints: string[] }[] = [
  { id: 'discovery', label: 'Discovery', section: 'Crawl Coverage', eventHints: ['CRAWL', 'Coverage counters'] },
  { id: 'recursive_links', label: 'Recursive Links', section: 'Crawl Coverage', eventHints: ['QUEUED', 'VISITED'] },
  { id: 'visual_layout', label: 'Visual Layout', section: 'UI Visual', eventHints: ['VISUAL', 'Screenshot evidence'] },
  { id: 'font_sizing', label: 'Font Sizing', section: 'Accessibility', eventHints: ['A11Y_TEXT_SIZE'] },
  { id: 'navigation_flows', label: 'Navigation Flows', section: 'Functional', eventHints: ['navigate', 'VISITED'] },
  { id: 'interaction_loops', label: 'Interaction Loops', section: 'Functional', eventHints: ['Deterministic page audit'] },
  { id: 'mobile_viewport', label: 'Mobile Viewport', section: 'Responsive', eventHints: ['RESPONSIVE', 'viewport'] },
  { id: 'tablet_viewport', label: 'Tablet Viewport', section: 'Responsive', eventHints: ['RESPONSIVE', 'viewport'] },
  { id: 'accessibility', label: 'Accessibility', section: 'Accessibility', eventHints: ['A11Y', 'ACCESSIBILITY'] },
  { id: 'screen_reader', label: 'Screen Reader', section: 'Accessibility', eventHints: ['heading', 'alt'] },
  { id: 'performance', label: 'Performance', section: 'Performance', eventHints: ['Performance', 'Page.NavigationDurationMs'] },
  { id: 'resource_sizes', label: 'Resource Sizes', section: 'Performance', eventHints: ['TransferSize', 'RESOURCE'] },
  { id: 'seo', label: 'SEO', section: 'SEO', eventHints: ['SEO'] },
  { id: 'structured_data', label: 'Structured Data', section: 'SEO', eventHints: ['JSON_LD', 'STRUCTURED_DATA'] },
  { id: 'security', label: 'Security', section: 'Security', eventHints: ['WEBSEC', 'SECURITY'] },
  { id: 'ssrf_protection', label: 'SSRF Protection', section: 'Security', eventHints: ['SSRF'] },
  { id: 'cookies_inspection', label: 'Cookies Inspection', section: 'Tracking Privacy', eventHints: ['cookie', 'PRIVACY'] },
  { id: 'consent_banners', label: 'Consent Banners', section: 'Tracking Privacy', eventHints: ['CONSENT'] },
  { id: 'broken_links', label: 'Broken Links', section: 'Network API', eventHints: ['HTTP_4XX', 'FAILED'] },
  { id: 'spell_check', label: 'Spell Check', section: 'Content', eventHints: ['CONTENT'] },
  { id: 'api_payload', label: 'API Payload', section: 'Network API', eventHints: ['API', 'NETWORK'] },
  { id: 'schema_match', label: 'Schema Match', section: 'Network API', eventHints: ['schema', 'JSON'] },
  { id: 'full_page_trace', label: 'Full Page Trace', section: 'Evidence', eventHints: ['EVIDENCE', 'trace'] },
  { id: 'video_recording', label: 'Video Recording', section: 'Evidence', eventHints: ['video', 'EVIDENCE'] }
];

export function buildCheckProgress(checkId: string, runStatus: string, eventText: string): CheckProgress {
  const catalogItem = CHECK_CATALOG.find((check) => check.id === checkId);
  if (!IMPLEMENTED_CHECKS.has(checkId)) {
    // The scanner has no implementation for this check, so it never runs; do not report it as done.
    return {
      id: checkId,
      label: catalogItem?.label ?? checkId,
      section: catalogItem?.section ?? 'Other',
      status: 'NOT_RUN',
      detail: 'Not run: this check is not implemented in the scanner yet'
    };
  }
  const matched = catalogItem?.eventHints.some((hint) => eventText.toLowerCase().includes(hint.toLowerCase())) ?? false;
  const finished = ['COMPLETED', 'PARTIALLY_COMPLETED'].includes(runStatus);
  const failed = ['FAILED', 'CANCELED', 'TIMED_OUT'].includes(runStatus);
  const status: LiveCheckStatus = failed ? 'ATTENTION' : finished || matched ? 'DONE' : runStatus === 'QUEUED' ? 'WAITING' : 'RUNNING';
  return {
    id: checkId,
    label: catalogItem?.label ?? checkId,
    section: catalogItem?.section ?? 'Other',
    status,
    detail: status === 'WAITING'
      ? 'Waiting for worker pickup'
      : status === 'RUNNING'
        ? 'In progress or waiting for related evidence'
        : status === 'ATTENTION'
          ? 'Needs review because the run stopped or failed'
          : 'Evidence observed or run finished'
  };
}
