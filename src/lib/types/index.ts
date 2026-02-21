export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';
export type IssueCategory = 'clash' | 'missing-label' | 'code-violation' | 'clearance';

export type BoundingBox = {
  x: number;      // normalized 0–1 from left
  y: number;      // normalized 0–1 from top
  width: number;  // normalized 0–1
  height: number; // normalized 0–1
};

export type Issue = {
  id: string;
  page: number;           // 1-indexed
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
  criterionId?: string;   // optional link to parent QA criterion
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

// --- Gemini AI Analysis Types ---

export type CriterionResult = 'pass' | 'fail' | 'not-applicable';

export type QACriterion = {
  id: string;           // "EQ-1", "DIM-1"
  name: string;         // "Equipment Labels Present"
  description: string;  // what this criterion checks
  result: CriterionResult;
  summary: string;      // AI-generated explanation
  page: number;         // which page this was evaluated on
};

export type AnalysisResponse = {
  criteria: QACriterion[];
  issues: Issue[];
};
