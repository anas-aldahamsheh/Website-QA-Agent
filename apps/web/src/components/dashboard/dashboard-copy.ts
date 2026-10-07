export type DashboardLocale = 'en' | 'ar';

export type DashboardCopy = {
  brandName: string;
  brandSubtitle: string;
  navRunCenter: string;
  navResults: string;
  workspace: string;
  liveStatus: string;
  liveStatusBody: string;
  runCenterTitle: string;
  runCenterSubtitle: string;
  resultsTitle: string;
  resultsSubtitle: string;
  clearData: string;
  publicDemoNote: string;
  publicDemoBusy: string;
  totalRuns: string;
  runningNow: string;
  needsReview: string;
  openIssues: string;
  startScan: string;
  startScanBody: string;
  targetUrl: string;
  scanMode: string;
  standard: string;
  deep: string;
  assisted: string;
  apiFrontend: string;
  maxPages: string;
  maxDepth: string;
  maxRequests: string;
  maxMinutes: string;
  concurrency: string;
  perHost: string;
  requestsPerSecond: string;
  retries: string;
  profileName: string;
  profilePlaceholder: string;
  runScan: string;
  saveProfile: string;
  recentRuns: string;
  recentRunsBody: string;
  viewDetails: string;
  noRuns: string;
  savedProfiles: string;
  savedProfilesBody: string;
  noProfiles: string;
  duplicate: string;
  noResultsTitle: string;
  noResultsBody: string;
  filters: string;
  issueType: string;
  allIssueTypes: string;
  page: string;
  allPages: string;
  severity: string;
  allSeverities: string;
  status: string;
  allStatuses: string;
  applyFilters: string;
  reset: string;
  sections: string;
  selectedRun: string;
  noRunSelected: string;
  runHistory: string;
  workspaceBody: string;
  runs: string;
  running: string;
  review: string;
  resultOrganization: string;
  resultOrganizationBody: string;
  severityMix: string;
  inspectionLogs: string;
  noRunLogs: string;
  recentEvents: string;
  issueCenter: string;
  issueCenterBody: string;
  searchIssues: string;
  search: string;
  noMatchingIssues: string;
  update: string;
  metrics: string;
  auditTrail: string;
  noMetrics: string;
  noAuditEvents: string;
  readoutProtocol: string;
  readoutHost: string;
  readoutPath: string;
  scopeStatus: string;
  scopeIdle: string;
  scopeLocked: string;
  launching: string;
  limitsTitle: string;
  checksTitle: string;
  checksSelectedHint: string;
  standardHint: string;
  deepHint: string;
  customHint: string;
  launchNote: string;
  stop: string;
  retry: string;
  useProfile: string;
  pagesUnit: string;
  liveProgress: string;
  technicalDetails: string;
  suggestedFix: string;
  evidence: string;
  issueCount: string;
  noIssuesInCategory: string;
  sectionOverview: string;
  sectionLive: string;
  sectionLogs: string;
  sectionIssues: string;
  sectionMetrics: string;
};

const english: DashboardCopy = {
  brandName: 'Website QA Agent',
  brandSubtitle: 'Quality Console',
  navRunCenter: 'Run Center',
  navResults: 'Results',
  workspace: 'Workspace',
  liveStatus: 'Live status',
  liveStatusBody: 'Runs update from the server progress endpoint so the interface reflects test progress without manual refreshes.',
  runCenterTitle: 'Run Center',
  runCenterSubtitle: 'Configure scans, watch live progress, and open the results workspace when details start streaming in.',
  resultsTitle: 'Results Workspace',
  resultsSubtitle: 'Review progress, coverage, logs, issues, metrics, filters, and page-level findings in a focused workspace.',
  clearData: 'Clear data',
  publicDemoNote: 'Public demo: one scan at a time, up to 10 pages and 5 minutes each. Only scan sites you own or may test.',
  publicDemoBusy: 'Another scan is running on this public demo. Please try again in a few minutes.',
  totalRuns: 'Total runs',
  runningNow: 'Running now',
  needsReview: 'Needs review',
  openIssues: 'Open issues',
  startScan: 'Start a scan',
  startScanBody: 'Launch a controlled site scan and watch progress update live.',
  targetUrl: 'Target URL',
  scanMode: 'Scan mode',
  standard: 'Standard',
  deep: 'Deep',
  assisted: 'Custom',
  apiFrontend: 'API and frontend',
  maxPages: 'Max pages',
  maxDepth: 'Max depth',
  maxRequests: 'Max requests',
  maxMinutes: 'Max minutes',
  concurrency: 'Concurrency',
  perHost: 'Per host',
  requestsPerSecond: 'Requests/sec',
  retries: 'Retries',
  profileName: 'Profile name',
  profilePlaceholder: 'Reusable scan profile',
  runScan: 'Run scan',
  saveProfile: 'Save profile',
  recentRuns: 'Recent runs',
  recentRunsBody: 'Open the results page for detailed logs, issues, metrics, and page filters.',
  viewDetails: 'View details',
  noRuns: 'No runs yet.',
  savedProfiles: 'Saved profiles',
  savedProfilesBody: 'Reuse previous scan choices without rebuilding the setup from scratch.',
  noProfiles: 'No saved profiles yet.',
  duplicate: 'Duplicate',
  noResultsTitle: 'No results yet',
  noResultsBody: 'Start a scan from the Run Center, then this page will fill with live and historical results.',
  filters: 'Filters',
  issueType: 'Issue type',
  allIssueTypes: 'All issue types',
  page: 'Page',
  allPages: 'All pages',
  severity: 'Severity',
  allSeverities: 'All severities',
  status: 'Status',
  allStatuses: 'All statuses',
  applyFilters: 'Apply filters',
  reset: 'Reset',
  sections: 'Sections',
  selectedRun: 'Selected run',
  noRunSelected: 'No run selected.',
  runHistory: 'Run history',
  workspaceBody: 'This workspace keeps run details, live progress, logs, issues, metrics, filters, and history in one organized results flow.',
  runs: 'Runs',
  running: 'Running',
  review: 'Review',
  resultOrganization: 'Result organization',
  resultOrganizationBody: 'Issues are grouped by feature area so you can scan what was checked and what needs attention.',
  severityMix: 'Severity mix',
  inspectionLogs: 'Inspection session logs',
  noRunLogs: 'No run logs yet.',
  recentEvents: 'Recent events',
  issueCenter: 'Triage issue center',
  issueCenterBody: 'Filter by category, page, severity, status, browser, viewport, or deterministic source.',
  searchIssues: 'Search issues',
  search: 'Search',
  noMatchingIssues: 'No issues match the current filters.',
  update: 'Update',
  metrics: 'Run metrics',
  auditTrail: 'Audit trail',
  noMetrics: 'No metrics recorded yet.',
  noAuditEvents: 'No audit events yet.',
  readoutProtocol: 'Protocol',
  readoutHost: 'Host',
  readoutPath: 'Path',
  scopeStatus: 'Scope',
  scopeIdle: 'searching',
  scopeLocked: 'target locked',
  launching: 'Launching scan',
  limitsTitle: 'Scan limits',
  checksTitle: 'Checks to run',
  checksSelectedHint: 'Every available check is on by default. Turn off what you do not need.',
  standardHint: 'balanced',
  deepHint: 'thorough',
  customHint: 'your rules',
  launchNote: 'The scan runs in a real Chromium browser. Progress streams in below.',
  stop: 'Stop',
  retry: 'Retry',
  useProfile: 'Use profile',
  pagesUnit: 'pages',
  liveProgress: 'Live run progress',
  technicalDetails: 'Technical details',
  suggestedFix: 'Suggested fix',
  evidence: 'Evidence',
  issueCount: 'issues',
  noIssuesInCategory: 'Clear',
  sectionOverview: 'Overview',
  sectionLive: 'Live progress',
  sectionLogs: 'Logs',
  sectionIssues: 'Issues',
  sectionMetrics: 'Metrics'
};

const arabic: DashboardCopy = {
  ...english,
  brandName: 'Website QA Agent',
  brandSubtitle: 'لوحة الجودة',
  navRunCenter: 'مركز التشغيل',
  navResults: 'النتائج',
  workspace: 'مساحة العمل',
  liveStatus: 'الحالة المباشرة',
  liveStatusBody: 'يتم تحديث الفحوصات من الخادم حتى تظهر حالة التقدم بدون تحديث يدوي.',
  runCenterTitle: 'مركز التشغيل',
  runCenterSubtitle: 'اضبط الفحص، راقب التقدم مباشرة، وافتح صفحة النتائج عند بدء ظهور التفاصيل.',
  resultsTitle: 'مساحة النتائج',
  resultsSubtitle: 'راجع التقدم، التغطية، السجلات، المشاكل، المؤشرات، والفلاتر في صفحة منظمة.',
  clearData: 'مسح البيانات',
  publicDemoNote: 'نسخة تجريبية عامة: فحص واحد في كل مرة، حتى 10 صفحات و5 دقائق لكل فحص. افحص فقط المواقع التي تملكها أو المسموح لك بفحصها.',
  publicDemoBusy: 'يوجد فحص آخر قيد التشغيل على هذه النسخة التجريبية. يرجى المحاولة بعد بضع دقائق.',
  totalRuns: 'كل الفحوصات',
  runningNow: 'قيد التشغيل',
  needsReview: 'بحاجة مراجعة',
  openIssues: 'مشاكل مفتوحة',
  startScan: 'بدء فحص',
  startScanBody: 'ابدأ فحص موقع مضبوط وشاهد التقدم بشكل مباشر.',
  targetUrl: 'رابط الموقع',
  scanMode: 'نوع الفحص',
  standard: 'قياسي',
  deep: 'عميق',
  assisted: 'مخصص',
  apiFrontend: 'واجهة وواجهات برمجية',
  maxPages: 'أقصى صفحات',
  maxDepth: 'أقصى عمق',
  maxRequests: 'أقصى طلبات',
  maxMinutes: 'أقصى دقائق',
  concurrency: 'التوازي',
  perHost: 'لكل مضيف',
  requestsPerSecond: 'طلبات/ثانية',
  retries: 'إعادة المحاولة',
  profileName: 'اسم القالب',
  profilePlaceholder: 'قالب فحص قابل لإعادة الاستخدام',
  runScan: 'تشغيل الفحص',
  saveProfile: 'حفظ القالب',
  recentRuns: 'آخر الفحوصات',
  recentRunsBody: 'افتح صفحة النتائج لرؤية السجلات والمشاكل والمؤشرات والفلاتر.',
  viewDetails: 'عرض التفاصيل',
  noRuns: 'لا توجد فحوصات بعد.',
  savedProfiles: 'القوالب المحفوظة',
  savedProfilesBody: 'أعد استخدام إعدادات سابقة بدون ضبطها من البداية.',
  noProfiles: 'لا توجد قوالب محفوظة بعد.',
  duplicate: 'نسخ',
  noResultsTitle: 'لا توجد نتائج بعد',
  noResultsBody: 'ابدأ فحصاً من مركز التشغيل، ثم ستظهر النتائج المباشرة والسابقة هنا.',
  filters: 'الفلاتر',
  issueType: 'نوع المشكلة',
  allIssueTypes: 'كل أنواع المشاكل',
  page: 'الصفحة',
  allPages: 'كل الصفحات',
  severity: 'الخطورة',
  allSeverities: 'كل مستويات الخطورة',
  status: 'الحالة',
  allStatuses: 'كل الحالات',
  applyFilters: 'تطبيق الفلاتر',
  reset: 'إعادة ضبط',
  sections: 'الأقسام',
  selectedRun: 'الفحص المختار',
  noRunSelected: 'لا يوجد فحص مختار.',
  runHistory: 'سجل الفحوصات',
  workspaceBody: 'هذه الصفحة تجمع تفاصيل الفحص، التقدم المباشر، السجلات، المشاكل، المؤشرات، والفلاتر في مسار واحد منظم.',
  runs: 'الفحوصات',
  running: 'يعمل',
  review: 'مراجعة',
  resultOrganization: 'تنظيم النتائج',
  resultOrganizationBody: 'المشاكل مصنفة حسب مجالها حتى تعرف ما تم فحصه وما يحتاج انتباه.',
  severityMix: 'توزيع الخطورة',
  inspectionLogs: 'سجلات جلسة الفحص',
  noRunLogs: 'لا توجد سجلات فحص بعد.',
  recentEvents: 'آخر الأحداث',
  issueCenter: 'مركز معالجة المشاكل',
  issueCenterBody: 'فلتر حسب التصنيف، الصفحة، الخطورة، الحالة، المتصفح، حجم الشاشة، أو مصدر الفحص.',
  searchIssues: 'ابحث في المشاكل',
  search: 'بحث',
  noMatchingIssues: 'لا توجد مشاكل تطابق الفلاتر الحالية.',
  update: 'تحديث',
  metrics: 'مؤشرات الفحص',
  auditTrail: 'سجل العمليات',
  noMetrics: 'لا توجد مؤشرات مسجلة بعد.',
  noAuditEvents: 'لا توجد أحداث تدقيق بعد.',
  readoutProtocol: 'البروتوكول',
  readoutHost: 'المضيف',
  readoutPath: 'المسار',
  scopeStatus: 'المنظار',
  scopeIdle: 'يبحث',
  scopeLocked: 'تم تحديد الهدف',
  launching: 'جاري بدء الفحص',
  limitsTitle: 'حدود الفحص',
  checksTitle: 'الفحوصات المطلوبة',
  checksSelectedHint: 'كل الفحوصات المتاحة مفعلة افتراضياً. أطفئ ما لا تحتاجه.',
  standardHint: 'متوازن',
  deepHint: 'شامل',
  customHint: 'قواعدك',
  launchNote: 'يعمل الفحص داخل متصفح Chromium حقيقي، ويظهر التقدم مباشرة في الأسفل.',
  stop: 'إيقاف',
  retry: 'إعادة',
  useProfile: 'استخدام القالب',
  pagesUnit: 'صفحات',
  liveProgress: 'تقدم الفحص المباشر',
  technicalDetails: 'التفاصيل التقنية',
  suggestedFix: 'الحل المقترح',
  evidence: 'الدليل',
  issueCount: 'مشاكل',
  noIssuesInCategory: 'سليم',
  sectionOverview: 'نظرة عامة',
  sectionLive: 'التقدم المباشر',
  sectionLogs: 'السجلات',
  sectionIssues: 'المشاكل',
  sectionMetrics: 'المؤشرات'
};

export function getDashboardCopy(locale: string | undefined): DashboardCopy {
  return locale === 'ar' ? arabic : english;
}
