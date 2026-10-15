import { expect, test } from '@playwright/test';
import { createAggregatePostHogPayload } from '../../src/features/analytics/posthog-payload';
import { countPresenceConnections, isPresenceTrackSuccessful } from '../../src/features/analytics/presence';

test('PostHog receives only allowlisted aggregate events with no person or form data', () => {
  const payload = createAggregatePostHogPayload('citizen_form_started');

  expect(payload).toEqual({
    event: 'citizen_form_started',
    distinct_id: 'geoalerta:aggregate',
    properties: {
      $geoip_disable: true,
      $process_person_profile: false,
    },
  });
  expect(createAggregatePostHogPayload('unknown_event')).toBeNull();
});

test('PostHog stage metrics accept only fixed form stages', () => {
  expect(createAggregatePostHogPayload('citizen_form_stage_reached', 'location')).toEqual({
    event: 'citizen_form_stage_reached',
    distinct_id: 'geoalerta:aggregate',
    properties: {
      $geoip_disable: true,
      $process_person_profile: false,
      form_stage: 'location',
    },
  });
  expect(createAggregatePostHogPayload('citizen_form_stage_reached', 'citizen@example.com')).toBeNull();
  expect(createAggregatePostHogPayload('citizen_form_started', 'location')).toBeNull();
});

test('panel presence shows only the number of distinct connections', () => {
  expect(countPresenceConnections({
    'operator-a': [{ online: true }, { online: true }],
    'operator-b': [{ online: true }],
  })).toBe(2);
  expect(countPresenceConnections({})).toBe(0);
});

test('panel presence reports online only after the Realtime server accepts tracking', () => {
  expect(isPresenceTrackSuccessful('ok')).toBe(true);
  expect(isPresenceTrackSuccessful('error')).toBe(false);
  expect(isPresenceTrackSuccessful('timed out')).toBe(false);
});
