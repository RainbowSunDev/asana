import { NextResponse } from 'next/server';

export async function GET() {
  console.log("run users sync jobs")
  
  return NextResponse.json({ ok: true });
}
