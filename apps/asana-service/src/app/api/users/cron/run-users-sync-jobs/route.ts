import { NextResponse } from 'next/server';

export async function GET() {
  console.log("run users sync jobs")
  return new NextResponse(null, { status: 501, statusText: 'Not Implemented' });
}
