import { after } from 'next/server';
import { accessResponse, withSession } from '@/server/access/session';
import { captureAggregatePostHogEvent } from '@/server/analytics/posthog';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await withSession(async () => undefined);
    after(() => captureAggregatePostHogEvent('authenticated_panel_entry'));
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}
