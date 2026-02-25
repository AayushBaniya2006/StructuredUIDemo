export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';
export type IssueCategory = 'clash' | 'missing-label' | 'code-violation' | 'clearance';

/** Sheet type detected from title block / drawing content */
export type SheetType =
  | 'architectural'
  | 'electrical'
  | 'mechanical'
  | 'structural'
  | 'plumbing'
  | 'civil'
  | 'cover'
  | 'schedule'
  | 'unknown';

/** Short abbreviation badge shown in UI (e.g. "E", "A", "M") */
export const SHEET_TYPE_ABBREV: Record<SheetType, string> = {
  architectural: 'A',
  electrical: 'E',
  mechanical: 'M',
  structural: 'S',
  plumbing: 'P',
  civil: 'C',
  cover: 'CV',
  schedule: 'SCH',
  unknown: '?',
};

export const SHEET_TYPE_LABEL: Record<SheetType, string> = {
  architectural: 'Architectural',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  structural: 'Structural',
  plumbing: 'Plumbing',
  civil: 'Civil',
  cover: 'Cover Sheet',
  schedule: 'Schedule',
  unknown: 'Unknown',
};

export type BoundingBox = {
  x: number;      // normalized 0–1 from left
  y: number;      // normalized 0–1 from top
  width: number;  // normalized 0–1
  height: number; // normalized 0–1
};

export type Issue = {
  id: string;
  page: number;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
  criterionId?: string;
  confidence?: number;
  sheetType?: SheetType;
};

export type ViewerState = {
  currentPage: number;
  totalPages: number;
  zoom: number;
  panX: number;
  panY: number;
  showAllOverlays: boolean;
};

export type SeverityFilter = IssueSeverity | 'all';
export type StatusFilter = IssueStatus | 'all';

export type CriterionResult = 'pass' | 'fail' | 'not-applicable';

export type QACriterion = {
  id: string;
  name: string;
  description: string;
  result: CriterionResult;
  summary: string;
  page: number;
  confidence?: number;
  sheetType?: SheetType;
};

export type AnalysisResponse = {
  criteria: QACriterion[];
  issues: Issue[];
  metadata?: {
    totalPages: number;
    analyzedPages: number;
    failedPages: number;
    emptyIssues: boolean;
  };
};
