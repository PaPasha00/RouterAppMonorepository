export type AnalysisResult = any;

let lastAnalysis: AnalysisResult | null = null;

export function setAnalysisResult(result: AnalysisResult) {
  lastAnalysis = result;
}

export function getAnalysisResult(): AnalysisResult | null {
  return lastAnalysis;
}

export function clearAnalysisResult() {
  lastAnalysis = null;
}
