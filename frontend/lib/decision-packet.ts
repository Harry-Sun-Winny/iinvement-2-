import type { DueDiligenceReview } from "@/lib/due-diligence-review";

export const DECISION_PACKET_SCHEMA_VERSION = "3.2" as const;
export const DECISION_PACKET_STORAGE_KEY = "decision_packets_v3_2";
export const ACTIVE_DECISION_PACKET_KEY = "active_decision_packet_v3_2";

export type DecisionPacketStage = "DRAFT" | "EVIDENCE_READY" | "REVIEWED" | "POLICY_READY" | "RETIRED";
export type ValidationStage = "RESEARCH" | "OOS_VALIDATED" | "SHADOW" | "PRODUCTION";

export interface DecisionPacketAuditEvent {
  id: string;
  at: string;
  type: "CREATED" | "REVIEW_SAVED" | "POLICY_UPDATED" | "EVIDENCE_UPDATED" | "RETIRED";
  actor: "user" | "system" | "ai";
  summary: string;
  revision: number;
}

export interface DecisionPacket {
  schemaVersion: typeof DECISION_PACKET_SCHEMA_VERSION;
  packetId: string;
  revision: number;
  stage: DecisionPacketStage;
  asset: {
    name: string;
    symbol: string;
    assetClass: string;
    industryId: string;
    jurisdiction: string;
    accountingBasis: string;
    baseCurrency: string;
    horizon: string;
  };
  scope: {
    analysisAsOf: string;
    knownAt: string;
    portfolioId: string;
  };
  evidence: {
    completeRows: number;
    primarySources: number;
    coveredBranches: number;
    minimumSetMet: boolean;
  };
  review: DueDiligenceReview | null;
  policy: {
    qualityScore: number | null;
    confidence: number;
    validationStage: ValidationStage;
    action: string;
    legalGate: "clear" | "warning" | "hard-stop";
    portfolioFit: number | null;
    macroScore: number | null;
  };
  governance: {
    owner: string;
    validator: string;
    validationApprovedAt: string;
    modelVersion: string;
    limitations: string[];
  };
  auditTrail: DecisionPacketAuditEvent[];
  createdAt: string;
  updatedAt: string;
}

function now() {
  return new Date().toISOString();
}

function event(type: DecisionPacketAuditEvent["type"], summary: string, revision: number, actor: DecisionPacketAuditEvent["actor"] = "system"): DecisionPacketAuditEvent {
  return { id: crypto.randomUUID(), at: now(), type, actor, summary, revision };
}

export function createDecisionPacket(input: Partial<DecisionPacket["asset"]> & { symbol: string }): DecisionPacket {
  const createdAt = now();
  return {
    schemaVersion: DECISION_PACKET_SCHEMA_VERSION,
    packetId: crypto.randomUUID(),
    revision: 1,
    stage: "DRAFT",
    asset: {
      name: input.name ?? input.symbol,
      symbol: input.symbol.trim().toUpperCase(),
      assetClass: input.assetClass ?? "stock",
      industryId: input.industryId ?? "",
      jurisdiction: input.jurisdiction ?? "",
      accountingBasis: input.accountingBasis ?? "",
      baseCurrency: input.baseCurrency ?? "",
      horizon: input.horizon ?? "",
    },
    scope: { analysisAsOf: "", knownAt: createdAt, portfolioId: "" },
    evidence: { completeRows: 0, primarySources: 0, coveredBranches: 0, minimumSetMet: false },
    review: null,
    policy: { qualityScore: null, confidence: 0, validationStage: "RESEARCH", action: "NO-DECISION", legalGate: "clear", portfolioFit: null, macroScore: null },
    governance: { owner: "", validator: "", validationApprovedAt: "", modelVersion: "", limitations: [] },
    auditTrail: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function reviseDecisionPacket(packet: DecisionPacket, patch: Partial<DecisionPacket>, type: DecisionPacketAuditEvent["type"], summary: string, actor: DecisionPacketAuditEvent["actor"] = "system"): DecisionPacket {
  const revision = packet.revision + 1;
  return {
    ...packet,
    ...patch,
    revision,
    updatedAt: now(),
    auditTrail: [...packet.auditTrail, event(type, summary, revision, actor)],
  };
}

export function deriveValidationStage(packet: DecisionPacket): ValidationStage {
  if (!packet.evidence.minimumSetMet || !packet.review) return "RESEARCH";
  const hasHardStop = packet.review.riskGates.some((gate) => gate.severity === "hard-stop");
  const completeReview = packet.review.coveragePercent === 100 && packet.review.sourceLedger.length > 0 && packet.review.calculationLedger.length > 0;
  if (!completeReview || hasHardStop) return "RESEARCH";
  if (!packet.governance.validator || !packet.governance.validationApprovedAt) return "OOS_VALIDATED";
  return packet.policy.validationStage === "PRODUCTION" ? "PRODUCTION" : "SHADOW";
}

export function loadDecisionPackets(): DecisionPacket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DECISION_PACKET_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is DecisionPacket => Boolean(item && typeof item === "object" && (item as DecisionPacket).schemaVersion === DECISION_PACKET_SCHEMA_VERSION)) : [];
  } catch {
    return [];
  }
}

export function persistDecisionPacket(packet: DecisionPacket) {
  if (typeof window === "undefined") return;
  const packets = loadDecisionPackets();
  const next = [packet, ...packets.filter((item) => item.packetId !== packet.packetId)].slice(0, 50);
  window.localStorage.setItem(DECISION_PACKET_STORAGE_KEY, JSON.stringify(next));
  window.localStorage.setItem(ACTIVE_DECISION_PACKET_KEY, packet.packetId);
}

export function loadActiveDecisionPacket(symbol?: string) {
  const packets = loadDecisionPackets();
  if (symbol) return packets.find((packet) => packet.asset.symbol === symbol.trim().toUpperCase()) ?? null;
  if (typeof window === "undefined") return null;
  const activeId = window.localStorage.getItem(ACTIVE_DECISION_PACKET_KEY);
  return packets.find((packet) => packet.packetId === activeId) ?? packets[0] ?? null;
}

