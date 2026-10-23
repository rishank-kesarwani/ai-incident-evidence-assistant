import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'UP',
    application: 'AI Incident Evidence & Runbook Assistant (Frontend)',
    timestamp: new Date().toISOString(),
  });
}
