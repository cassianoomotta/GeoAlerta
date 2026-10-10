import { captureAggregatePostHogEvent } from '@/server/analytics/posthog';

const publicEvents = new Set(['citizen_form_started', 'citizen_form_stage_reached', 'citizen_form_submission_failed']);
const formStages = new Set(['contact_details', 'occurrence_type', 'description', 'medical_need', 'address_reference', 'photo', 'location']);

export async function POST(request: Request) {
  let event: unknown;
  let formStage: unknown;
  try {
    const body = await request.json();
    event = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).event : null;
    formStage = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).formStage : undefined;
  } catch {
    return Response.json({ error: 'invalid_event' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (typeof event !== 'string' || !publicEvents.has(event)) {
    return Response.json({ error: 'invalid_event' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if ((event === 'citizen_form_stage_reached' && (typeof formStage !== 'string' || !formStages.has(formStage))) ||
    (event !== 'citizen_form_stage_reached' && formStage !== undefined)) {
    return Response.json({ error: 'invalid_event' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  await captureAggregatePostHogEvent(event, formStage);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
