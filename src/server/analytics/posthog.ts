import 'server-only';
import { createAggregatePostHogPayload } from '@/features/analytics/posthog-payload';

export async function captureAggregatePostHogEvent(event: unknown, formStage?: unknown): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const payload = createAggregatePostHogPayload(event, formStage);
  if (!apiKey || !payload) return;

  try {
    await fetch('https://us.i.posthog.com/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, ...payload }),
      signal: AbortSignal.timeout(1_500),
    });
  } catch {
    // Analytics must not block GeoAlerta actions or expose request data in logs.
  }
}
