export const otelTemplate = {
  config: `# OpenTelemetry Collector — read NDJSON from /run-input/input.log,
# parse, add an attribute, print via the debug exporter.
# Note: the debug exporter writes via the collector's internal logger,
# which goes to stderr. Look in the stderr pane below for your events.

receivers:
  filelog:
    include: [/run-input/input.log]
    start_at: beginning
    operators:
      - type: json_parser

processors:
  attributes/add_source:
    actions:
      - key: source
        value: otel-playground
        action: insert

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [attributes/add_source]
      exporters: [debug]
`,
  input: `{"level":"info","msg":"user signed in","user_id":42}
{"level":"warn","msg":"slow query","duration_ms":812}
{"level":"error","msg":"payment failed","order_id":"o_9x1"}
`,
};
