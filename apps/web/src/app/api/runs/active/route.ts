import { NextResponse } from 'next/server';
import { countLiveRuns } from '@/server/queries/run-progress';

export const dynamic = 'force-dynamic';

// How many scans are still running, so a supervisor can keep the app awake until they finish.
export async function GET() {
  return NextResponse.json({ active: await countLiveRuns() }, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
