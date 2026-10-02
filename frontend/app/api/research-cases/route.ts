import { NextResponse } from "next/server";
import type { ResearchCase } from "@/lib/research-case";
const store = globalThis as typeof globalThis & { __researchCases?: Map<string, ResearchCase> };
store.__researchCases ??= new Map([['case-1042', { id:'case-1042', assetId:'FPT', portfolioId:'main', status:'policy-review', currentRevision:14, ownerId:'nguyen-minh', updatedAt:'2026-07-23T10:42:00+07:00', evidenceSnapshotId:'ev-snapshot-24', analysisRunId:'run-18', scoreRunId:'score-18', policyRunId:'policy-7' }]]);
export async function GET() { return NextResponse.json({ data: [...store.__researchCases!.values()] }); }
export async function POST(request: Request) { const body = await request.json(); if (!body?.assetId || !body?.ownerId) return NextResponse.json({ error:{ code:'VALIDATION_ERROR', message:'assetId and ownerId are required' } }, { status:400 }); const now = new Date().toISOString(); const item: ResearchCase = { id: `case-${Date.now()}`, assetId: body.assetId, portfolioId: body.portfolioId, status:'draft', currentRevision:1, ownerId:body.ownerId, updatedAt:now }; store.__researchCases!.set(item.id,item); return NextResponse.json({ data:item }, { status:201 }); }
