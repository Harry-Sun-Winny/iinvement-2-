import { describe, expect, it } from "vitest";
import { parseDueDiligenceReview } from "@/lib/due-diligence-review";
import { createDecisionPacket, deriveValidationStage, reviseDecisionPacket } from "@/lib/decision-packet";
import { INDUSTRY_DECISION_PROFILES } from "@/lib/industry-decision-profiles";

const branchReviews = ["macro", "asset", "behavior", "personal", "market", "legal"].map((id) => ({
  id,
  score: 70,
  confidence: 75,
  evidenceStatus: "verified",
  verdict: "Đạt có điều kiện",
  evidence: ["BCTC FY2025, trang 10"],
  risks: [],
  action: "Theo dõi",
}));

const fullReview = {
  assetName: "TEST",
  decision: "CHỜ",
  executiveSummary: "Tóm tắt kiểm định.",
  branchReviews,
  conditionsToBuy: ["Định giá đạt biên an toàn"],
  conditionsToAvoid: [],
  missingData: [],
  scenarios: [
    { name: "base", probability: 60, trigger: "Base", valuationImpact: "0%", action: "hold" },
    { name: "bull", probability: 20, trigger: "Bull", valuationImpact: "+20%", action: "add" },
    { name: "bear", probability: 20, trigger: "Bear", valuationImpact: "-25%", action: "reduce" },
  ],
  sourceLedger: [{ claim: "Revenue", document: "FY2025", excerpt: "100", locator: "page 10", asOf: "2025-12-31", quality: "primary", stance: "support" }],
  calculationLedger: [{ branch: "asset", name: "FCF", formula: "CFO-CAPEX", inputs: [], result: "10", sanityCheck: "reconciled" }],
  factorScorecards: [],
  redTeam: { strongestCounterThesis: "Margin falls", supportingEvidence: [], decisionIfTrue: "NO-TRADE", probability: 25 },
  dataRepairPlan: [],
  riskGates: [],
  doubleCountingWarnings: [],
  psychologyAssessment: { psyScore: 60, activeBiases: [], blockingGates: [] },
  modelLimitations: ["Public data only"],
};

describe("Decision Packet V3.2", () => {
  it("preserves the complete structured AI output", () => {
    const parsed = parseDueDiligenceReview(JSON.stringify(fullReview));
    expect(parsed.errors).toEqual([]);
    expect(parsed.review?.coveragePercent).toBe(100);
    expect(parsed.review?.sourceLedger[0].locator).toBe("page 10");
    expect(parsed.review?.calculationLedger[0].formula).toBe("CFO-CAPEX");
    expect(parsed.review?.redTeam.decisionIfTrue).toBe("NO-TRADE");
    expect(parsed.review?.modelLimitations).toEqual(["Public data only"]);
  });

  it("warns when scenario probabilities or provenance are invalid", () => {
    const parsed = parseDueDiligenceReview(JSON.stringify({
      ...fullReview,
      scenarios: fullReview.scenarios.map((scenario) => ({ ...scenario, probability: 20 })),
      sourceLedger: [{ claim: "Revenue", document: "FY2025", excerpt: "100", asOf: "2025-12-31", quality: "primary" }],
    }));
    expect(parsed.warnings.some((warning) => warning.includes("60.0%"))).toBe(true);
    expect(parsed.warnings.some((warning) => warning.includes("locator"))).toBe(true);
  });

  it("does not promote a packet with an unresolved hard stop", () => {
    const review = parseDueDiligenceReview(JSON.stringify({ ...fullReview, riskGates: [{ severity: "hard-stop", title: "Legal title", condition: "Unclear", evidenceNeeded: "Registry" }] })).review!;
    const draft = createDecisionPacket({ symbol: "TEST" });
    const reviewed = reviseDecisionPacket(draft, {
      evidence: { completeRows: 3, primarySources: 1, coveredBranches: 6, minimumSetMet: true },
      review,
    }, "REVIEW_SAVED", "test");
    expect(deriveValidationStage(reviewed)).toBe("RESEARCH");
  });

  it("activates the full 20-industry catalog", () => {
    expect(INDUSTRY_DECISION_PROFILES).toHaveLength(20);
    expect(new Set(INDUSTRY_DECISION_PROFILES.map((profile) => profile.id)).size).toBe(20);
  });
});

