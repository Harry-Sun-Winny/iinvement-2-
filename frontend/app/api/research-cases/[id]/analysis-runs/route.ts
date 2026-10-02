import { NextResponse } from 'next/server';
import { artifacts, createArtifact } from '@/app/api/research-cases/_lib/store';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return NextResponse.json({data:artifacts().filter(x=>x.caseId===id&&x.kind==='ANALYSIS_RUN')});}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const payload=await request.json().catch(()=>({}));return NextResponse.json({data:createArtifact(id,'ANALYSIS_RUN',payload)},{status:201});}