export const fluentBitTemplate = {
  config: `# Fluent Bit — tail /run-input/input.log as JSON, emit to stdout.
# Exit_On_Eof makes the process terminate once the file is consumed.

[SERVICE]
    Flush        1
    Daemon       Off
    Log_Level    info
    Parsers_File /fluent-bit/etc/parsers.conf

[INPUT]
    Name         tail
    Path         /run-input/input.log
    Parser       json
    Tag          app
    Read_from_Head  true
    Exit_On_Eof  true

[FILTER]
    Name         modify
    Match        *
    Add          source fluent-bit-playground

[OUTPUT]
    Name         stdout
    Match        *
    Format       json_lines
`,
  input: `{"level":"info","msg":"user signed in","user_id":42}
{"level":"warn","msg":"slow query","duration_ms":812}
{"level":"error","msg":"payment failed","order_id":"o_9x1"}
`,
};
