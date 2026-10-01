import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLiveRunProgress } from '@/server/queries/run-progress';

const RunProgressQuerySchema = z.object({
  runId: z.string().uuid().optional()
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = RunProgressQuerySchema.safeParse({
    runId: url.searchParams.get('runId') ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run progress query.' }, { status: 400 });
  }

  const progress = await getLiveRunProgress(parsed.data.runId);
  return NextResponse.json(progress, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
