const aggregateEvents = new Set([
  'citizen_form_started',
  'citizen_form_stage_reached',
  'citizen_form_submission_failed',
  'citizen_occurrence_completed',
  'authenticated_panel_entry',
]);
const formStages = new Set([
  'contact_details',
  'occurrence_type',
  'description',
  'medical_need',
  'address_reference',
  'photo',
  'location',
]);

export function createAggregatePostHogPayload(event: unknown, formStage?: unknown) {
  if (typeof event !== 'string' || !aggregateEvents.has(event)) return null;
  if (event === 'citizen_form_stage_reached' && (typeof formStage !== 'string' || !formStages.has(formStage))) return null;
  if (event !== 'citizen_form_stage_reached' && formStage !== undefined) return null;

  const properties: Record<string, boolean | string> = {
    $geoip_disable: true,
    $process_person_profile: false,
  };
  if (event === 'citizen_form_stage_reached') properties.form_stage = formStage as string;
  return {
    event,
    distinct_id: 'geoalerta:aggregate',
    properties,
  };
}
