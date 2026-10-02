export type ResearchArtifact = { id:string; caseId:string; kind:string; status:string; revision:number; createdAt:string; payload:Record<string,unknown> };
const root = globalThis as typeof globalThis & { __researchArtifacts?: ResearchArtifact[]; __researchAudit?: Record<string,unknown>[] };
root.__researchArtifacts ??= []; root.__researchAudit ??= [];
export function artifacts() { return root.__researchArtifacts!; }
export function audit() { return root.__researchAudit!; }
export function createArtifact(caseId:string, kind:string, payload:Record<string,unknown>) { const item={id:`${kind}-${Date.now()}`,caseId,kind,status:'queued',revision:1,createdAt:new Date().toISOString(),payload}; artifacts().push(item); audit().push({id:`audit-${Date.now()}`,action:`CREATE_${kind.toUpperCase()}`,entityType:kind,entityId:item.id,caseId,timestamp:item.createdAt}); return item; }
