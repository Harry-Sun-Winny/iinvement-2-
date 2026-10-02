import { NextResponse } from 'next/server';
import { audit, artifacts } from '@/app/api/research-cases/_lib/store';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return NextResponse.json({data:audit().filter(x=>x.caseId===id),lineage:artifacts().filter(x=>x.caseId===id)});}