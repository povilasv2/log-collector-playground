export type CollectorId = "vector" | "fluent-bit" | "fluentd";

export type InputMode = "stdin" | "file";

export interface CollectorSpec {
  id: CollectorId;
  displayName: string;
  image: string;
  configFilename: string;
  command: string[];
  monacoLanguage: string;
  docsUrl: string;
  // "stdin" → the input bytes are piped to the container via stdin and the
  // collector uses a stdin-style source. The process exits on EOF.
  // "file"  → input is bind-mounted at /run-input/input.log. The collector tails
  // the file and has to be killed at the wall-clock timeout.
  inputMode: InputMode;
}

export const COLLECTORS: Record<CollectorId, CollectorSpec> = {
  vector: {
    id: "vector",
    displayName: "Vector",
    image: "timberio/vector:0.54.0-alpine",
    configFilename: "config.yaml",
    command: ["--config", "/run-input/config.yaml"],
    monacoLanguage: "yaml",
    docsUrl: "https://vector.dev/docs/",
    inputMode: "stdin",
  },
  "fluent-bit": {
    id: "fluent-bit",
    displayName: "Fluent Bit",
    image: "fluent/fluent-bit:3.1.7",
    configFilename: "config.conf",
    command: ["/fluent-bit/bin/fluent-bit", "-c", "/run-input/config.conf"],
    monacoLanguage: "ini",
    docsUrl: "https://docs.fluentbit.io/",
    inputMode: "file",
  },
  fluentd: {
    id: "fluentd",
    displayName: "Fluentd",
    image: "fluent/fluentd:v1.17-debian-1",
    configFilename: "config.conf",
    command: ["fluentd", "-c", "/run-input/config.conf"],
    monacoLanguage: "xml",
    docsUrl: "https://docs.fluentd.org/",
    inputMode: "file",
  },
};

export const COLLECTOR_IDS = Object.keys(COLLECTORS) as CollectorId[];

export function isCollectorId(v: string): v is CollectorId {
  return (COLLECTOR_IDS as string[]).includes(v);
}
