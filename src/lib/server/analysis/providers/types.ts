export type AnalyzePageInput = {
  pageNumber: number;
  image: string; // data URL
  requestId?: string;
};

export interface AnalysisProvider {
  readonly name: string;
  analyzePage(input: AnalyzePageInput): Promise<unknown>;
}
