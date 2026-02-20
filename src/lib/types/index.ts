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
