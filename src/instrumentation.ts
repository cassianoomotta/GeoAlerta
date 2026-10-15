import type { Logger } from '@opentelemetry/api-logs';

declare global {
  var __posthogLogger: Logger | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || globalThis.__posthogLogger) {
    return;
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return;

  const [apiLogsModule, exporterModule, resourcesModule, logsModule] = await Promise.all([
    import('@opentelemetry/api-logs'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/sdk-logs'),
  ]);

  const exporter = new exporterModule.OTLPLogExporter({
    url: 'https://us.i.posthog.com/i/v1/logs',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const loggerProvider = new logsModule.LoggerProvider({
    resource: resourcesModule.resourceFromAttributes({
      'service.name': 'geoalerta',
    }),
    processors: [new logsModule.SimpleLogRecordProcessor({ exporter })],
  });

  globalThis.__posthogLogger = loggerProvider.getLogger('geoalerta');
  globalThis.__posthogLogger.emit({
    severityNumber: apiLogsModule.SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'PostHog logging initialized',
    attributes: { runtime: 'nodejs' },
  });
}
