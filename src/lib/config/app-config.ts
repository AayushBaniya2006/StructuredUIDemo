export const appConfig = {
  branding: {
    appName: 'Structured AI Blueprint QA',
    appTitle: 'Structured AI Blueprint QA',
    faviconPath: '/favicon.svg'
  },
  welcome: {
    title: 'Structured AI Blueprint QA',
    description: 'AI-powered construction blueprint quality assurance. Upload a PDF to get started.',
    uploadButton: 'Upload PDF',
    keyboardShortcutsTitle: 'Keyboard shortcuts'
  },
  toolbar: {
    title: 'Structured AI',
    uploadButton: 'Upload PDF',
    runCheck: 'Run Check',
    reRunCheck: 'Re-run Check',
    analyzing: 'Analyzing...',
    zoomIn: '+',
    zoomOut: '−',
    zoomReset: 'Fit',
    severityLabel: 'Severity:',
    statusLabel: 'Status:',
    showAll: 'All Boxes',
    selectedOnly: 'Selected Only'
  },
  filters: {
    severity: {
      all: 'All',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    },
    status: {
      all: 'All',
      open: 'Open',
      resolved: 'Resolved'
    }
  },
  panels: {
    issues: {
      title: 'Issues',
      countSingular: 'issue',
      countPlural: 'issues',
      empty: 'No issues match filters',
      emptyFiltered: 'No issues match filters',
      emptySuccess: 'No issues found!',
      emptySuccessSubtext: 'The blueprint passed all QA criteria. Great job!',
      pageLabel: 'Page'
    },
    issueDetail: {
      empty: 'Select an issue to view details',
      markResolved: 'Mark as Resolved',
      reopenIssue: 'Reopen Issue',
      prev: '← Prev',
      next: 'Next →'
    },
    criteria: {
      title: 'QA Criteria',
      pass: 'pass',
      fail: 'fail',
      na: 'n/a',
      empty: 'No analysis results yet',
      pageLabel: 'Page',
      passLabel: 'PASS',
      failLabel: 'FAIL',
      naLabel: 'N/A'
    }
  },
  thumbnails: {
    title: 'Pages'
  },
  viewer: {
    pageCounter: 'Page {current} of {total}',
    rendering: 'Rendering...',
    prevPage: '←',
    nextPage: '→'
  },
  analysis: {
    title: 'Analyzing Blueprint',
    preparing: 'Preparing analysis...',
    checking: 'Checking page {current} of {total}...',
    cancel: 'Cancel',
    failed: 'Analysis Failed',
    dismiss: 'Dismiss'
  },
  upload: {
    errorNotPdf: 'Only PDF files are supported.',
    errorLoading: 'Failed to load PDF'
  }
} as const;

export type AppConfig = typeof appConfig;
export const t = appConfig;
