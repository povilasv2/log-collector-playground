import type { CollectorId } from "../collectors";
import { vectorTemplate } from "./vector";
import { fluentBitTemplate } from "./fluent-bit";
import { fluentdTemplate } from "./fluentd";

export interface Template {
  config: string;
  input: string;
}

export const TEMPLATES: Record<CollectorId, Template> = {
  vector: vectorTemplate,
  "fluent-bit": fluentBitTemplate,
  fluentd: fluentdTemplate,
};
