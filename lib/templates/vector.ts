export const vectorTemplate = {
  config: `# Vector — read NDJSON from stdin, parse, emit to stdout.
# The playground pipes your input data to the container's stdin.

sources:
  in:
    type: stdin
    decoding:
      codec: json

transforms:
  enrich:
    type: remap
    inputs: [in]
    source: |
      .received_at = now()

sinks:
  out:
    type: console
    inputs: [enrich]
    encoding:
      codec: json
`,
  input: `{"level":"info","msg":"user signed in","user_id":42}
{"level":"warn","msg":"slow query","duration_ms":812}
{"level":"error","msg":"payment failed","order_id":"o_9x1"}
`,
};
