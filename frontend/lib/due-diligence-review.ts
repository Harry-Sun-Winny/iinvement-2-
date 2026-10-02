import { ASSET_DECISION_BRANCHES, type DecisionBranchId } from "@/lib/asset-decision-framework";

export type EvidenceStatus = "verified" | "estimated" | "missing";
export type RiskGateSeverity = "hard-stop" | "warning";

export interface BranchReview {
  id: DecisionBranchId;
  score: number;
  confidence: number;
  evidenceStatus: EvidenceStatus;
  verdict: string;
  evidence: string[];
  risks: string[];
  action: string;
}

export interface SourceLedgerEntry {
  claim: string;
  document: string;
  excerpt: string;
  locator: string;
  asOf: string;
  quality: "primary" | "secondary" | "estimate";
  stance: "support" | "counter" | "conflict" | "neutral";
}

export interface CalculationLedgerEntry {
  branch: DecisionBranchId;
  name: string;
  formula: string;
  inputs: Array<{ name: string; value: string; unit: string; sourceType: "quoted" | "calculated" | "assumption" }>;
  result: string;
  sanityCheck: string;
}

export interface ScenarioReview {
  name: "base" | "bull" | "bear";
  probability: number;
  trigger: string;
  valuationImpact: string;
  action: string;
}

export interface FactorScorecardEntry {
  branch: DecisionBranchId;
  factor: string;
  internalWeight: number;
  score: number;
  evidenceMultiplier: number;
  contribution: number;
  reason: string;
}

export interface DataRepairItem {
  branch: string;
  missingField: string;
  requiredFormat: string;
  preferredSource: string;
  owner: "user" | "accountant" | "lawyer" | "industry analyst" | "document AI";
  scoreImpact: string;
  nextAction: string;
}

export interface RiskGateReview {
  severity: RiskGateSeverity;
  title: string;
  condition: string;
  evidenceNeeded: string;
}

export interface DueDiligenceReview {
  assetName: string;
  overallScore: number;
  decision: string;
  executiveSummary: string;
  branchReviews: BranchReview[];
  conditionsToBuy: string[];
  conditionsToAvoid: string[];
  missingData: string[];
  theoryExplanations: Array<{ claim: string; theory: string; mechanism: string; numericExample: string; limitations: string }>;
  scenarios: ScenarioReview[];
  sourceLedger: SourceLedgerEntry[];
  calculationLedger: CalculationLedgerEntry[];
  factorScorecards: FactorScorecardEntry[];
  redTeam: { strongestCounterThesis: string; supportingEvidence: string[]; decisionIfTrue: string; probability: number };
  dataRepairPlan: DataRepairItem[];
  riskGates: RiskGateReview[];
  doubleCountingWarnings: string[];
  psychologyAssessment: { psyScore: number; activeBiases: string[]; blockingGates: string[] };
  modelLimitations: string[];
  coveragePercent: number;
}

export type ReviewValidation = {
  review: DueDiligenceReview | null;
  errors: string[];
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function score(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(100, number(value, fallback)));
}

function branchId(value: unknown): DecisionBranchId | null {
  return ASSET_DECISION_BRANCHES.some((branch) => branch.id === value) ? value as DecisionBranchId : null;
}

function parseBranchReviews(value: unknown, warnings: string[]) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<DecisionBranchId>();
  const reviews: BranchReview[] = [];
  value.forEach((entry) => {
    if (!isRecord(entry)) return;
    const id = branchId(entry.id);
    if (!id || seen.has(id)) {
      if (id) warnings.push(`Nhánh ${id} bị lặp và đã được bỏ qua.`);
      return;
    }
    seen.add(id);
    const evidenceStatus: EvidenceStatus = entry.evidenceStatus === "verified" || entry.evidenceStatus === "missing"
      ? entry.evidenceStatus
      : "estimated";
    reviews.push({
      id,
      score: score(entry.score),
      confidence: score(entry.confidence, evidenceStatus === "missing" ? 0 : 50),
      evidenceStatus,
      verdict: text(entry.verdict),
      evidence: textList(entry.evidence),
      risks: textList(entry.risks),
      action: text(entry.action),
    });
  });
  return reviews;
}

function parseSourceLedger(value: unknown): SourceLedgerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry): SourceLedgerEntry => ({
    claim: text(entry.claim),
    document: text(entry.document),
    excerpt: text(entry.excerpt),
    locator: text(entry.locator, text(entry.sourceLocator, "unknown")),
    asOf: text(entry.asOf, "unknown"),
    quality: entry.quality === "primary" || entry.quality === "secondary" ? entry.quality : "estimate",
    stance: entry.stance === "support" || entry.stance === "counter" || entry.stance === "conflict" ? entry.stance : "neutral",
  })).filter((entry) => entry.claim || entry.document || entry.excerpt);
}

function parseCalculations(value: unknown): CalculationLedgerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry): CalculationLedgerEntry => {
    const id = branchId(entry.branch) ?? "asset";
    const inputs = Array.isArray(entry.inputs) ? entry.inputs.filter(isRecord).map((input): CalculationLedgerEntry["inputs"][number] => ({
      name: text(input.name), value: text(input.value), unit: text(input.unit),
      sourceType: input.sourceType === "quoted" || input.sourceType === "calculated" ? input.sourceType : "assumption" as const,
    })) : [];
    return { branch: id, name: text(entry.name), formula: text(entry.formula), inputs, result: text(entry.result), sanityCheck: text(entry.sanityCheck) };
  }).filter((entry) => entry.name || entry.formula || entry.result);
}

function parseScenarios(value: unknown): ScenarioReview[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry): ScenarioReview => ({
    name: entry.name === "bull" || entry.name === "bear" ? entry.name : "base" as const,
    probability: score(entry.probability),
    trigger: text(entry.trigger),
    valuationImpact: text(entry.valuationImpact),
    action: text(entry.action),
  }));
}

export function parseDueDiligenceReview(raw: string): ReviewValidation {
  if (!raw.trim()) return { review: null, errors: [], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { review: null, errors: ["Kết quả AI phải là một JSON object."], warnings };
    data = parsed;
  } catch {
    return { review: null, errors: ["JSON chưa hợp lệ. Hãy dán nguyên khối JSON, không kèm markdown."], warnings };
  }

  const branchReviews = parseBranchReviews(data.branchReviews, warnings);
  if (!branchReviews.length) errors.push("JSON phải có branchReviews hợp lệ.");
  const connectedWeight = ASSET_DECISION_BRANCHES.reduce((sum, branch) => sum + (branchReviews.some((item) => item.id === branch.id) ? branch.weight : 0), 0);
  const weightedScore = ASSET_DECISION_BRANCHES.reduce((sum, branch) => sum + (branchReviews.find((item) => item.id === branch.id)?.score ?? 0) * branch.weight, 0);
  if (branchReviews.length < ASSET_DECISION_BRANCHES.length) warnings.push(`Mới có ${branchReviews.length}/${ASSET_DECISION_BRANCHES.length} nhánh hợp lệ.`);

  const scenarios = parseScenarios(data.scenarios);
  const probabilityTotal = scenarios.reduce((sum, item) => sum + item.probability, 0);
  if (scenarios.length && Math.abs(probabilityTotal - 100) > 1) warnings.push(`Tổng xác suất kịch bản là ${probabilityTotal.toFixed(1)}%, không phải 100%.`);
  const sourceLedger = parseSourceLedger(data.sourceLedger);
  if (!sourceLedger.length) warnings.push("AI chưa trả source ledger có thể kiểm toán.");
  if (sourceLedger.some((entry) => entry.locator === "unknown")) warnings.push("Một số nguồn chưa có locator/trang/bảng/API field.");
  const calculationLedger = parseCalculations(data.calculationLedger);

  const factorScorecards: FactorScorecardEntry[] = Array.isArray(data.factorScorecards) ? data.factorScorecards.filter(isRecord).map((entry) => ({
    branch: branchId(entry.branch) ?? "asset",
    factor: text(entry.factor),
    internalWeight: score(entry.internalWeight),
    score: score(entry.score),
    evidenceMultiplier: Math.max(0, Math.min(1, number(entry.evidenceMultiplier))),
    contribution: number(entry.contribution),
    reason: text(entry.reason),
  })).filter((entry) => entry.factor) : [];
  const dataRepairPlan: DataRepairItem[] = Array.isArray(data.dataRepairPlan) ? data.dataRepairPlan.filter(isRecord).map((entry): DataRepairItem => ({
    branch: text(entry.branch), missingField: text(entry.missingField), requiredFormat: text(entry.requiredFormat), preferredSource: text(entry.preferredSource),
    owner: entry.owner === "accountant" || entry.owner === "lawyer" || entry.owner === "industry analyst" || entry.owner === "document AI" ? entry.owner : "user",
    scoreImpact: text(entry.scoreImpact), nextAction: text(entry.nextAction),
  })).filter((entry) => entry.missingField) : [];
  const riskGates: RiskGateReview[] = Array.isArray(data.riskGates) ? data.riskGates.filter(isRecord).map((entry): RiskGateReview => ({
    severity: entry.severity === "hard-stop" ? "hard-stop" : "warning",
    title: text(entry.title), condition: text(entry.condition), evidenceNeeded: text(entry.evidenceNeeded),
  })).filter((entry) => entry.title) : [];
  const redTeamData = isRecord(data.redTeam) ? data.redTeam : {};
  const psychologyData = isRecord(data.psychologyAssessment) ? data.psychologyAssessment : {};
  const theoryExplanations = Array.isArray(data.theoryExplanations) ? data.theoryExplanations.filter(isRecord).map((entry) => ({
    claim: text(entry.claim), theory: text(entry.theory), mechanism: text(entry.mechanism), numericExample: text(entry.numericExample), limitations: text(entry.limitations),
  })).filter((entry) => entry.claim || entry.theory) : [];

  if (errors.length) return { review: null, errors, warnings };
  return {
    review: {
      assetName: text(data.assetName, "Tài sản đang phân tích"),
      overallScore: score(connectedWeight ? weightedScore / connectedWeight : data.overallScore),
      decision: text(data.decision, "NO-DECISION"),
      executiveSummary: text(data.executiveSummary),
      branchReviews,
      conditionsToBuy: textList(data.conditionsToBuy),
      conditionsToAvoid: textList(data.conditionsToAvoid),
      missingData: textList(data.missingData),
      theoryExplanations,
      scenarios,
      sourceLedger,
      calculationLedger,
      factorScorecards,
      redTeam: {
        strongestCounterThesis: text(redTeamData.strongestCounterThesis),
        supportingEvidence: textList(redTeamData.supportingEvidence),
        decisionIfTrue: text(redTeamData.decisionIfTrue),
        probability: score(redTeamData.probability),
      },
      dataRepairPlan,
      riskGates,
      doubleCountingWarnings: textList(data.doubleCountingWarnings),
      psychologyAssessment: {
        psyScore: score(psychologyData.psyScore),
        activeBiases: textList(psychologyData.activeBiases),
        blockingGates: textList(psychologyData.blockingGates),
      },
      modelLimitations: textList(data.modelLimitations),
      coveragePercent: connectedWeight,
    },
    errors,
    warnings,
  };
}
