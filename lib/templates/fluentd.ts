export const fluentdTemplate = {
  config: `# Fluentd — tail /run-input/input.log as JSON, emit to stdout.
# Fluentd has no stdin input in core, so the playground bind-mounts
# your input data as a file. The run will hit the wall-clock timeout
# (~10s) since tail keeps watching — output is printed as it's parsed.

<source>
  @type tail
  path /run-input/input.log
  pos_file /tmp/input.log.pos
  tag app
  read_from_head true
  <parse>
    @type json
  </parse>
</source>

<filter app.**>
  @type record_transformer
  <record>
    source fluentd-playground
  </record>
</filter>

<match app.**>
  @type stdout
</match>
`,
  input: `{"level":"info","msg":"user signed in","user_id":42}
{"level":"warn","msg":"slow query","duration_ms":812}
{"level":"error","msg":"payment failed","order_id":"o_9x1"}
`,
};
