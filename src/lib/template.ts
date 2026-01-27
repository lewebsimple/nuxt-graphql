import { addServerTemplate, addTemplate } from "@nuxt/kit";

type UniversalTemplateContents = { ts: string; mjs: string; dts: string };

export type AddUniversalTemplateInput = {
  filename: string;
  getContents: () => UniversalTemplateContents | Promise<UniversalTemplateContents>;
  emitTs?: boolean;
};

export function addUniversalTemplate({ filename, getContents, emitTs }: AddUniversalTemplateInput): string {
  let modulePath: string;
  if (emitTs) {
    modulePath = addTemplate({ filename: `${filename}.ts`, getContents: async () => (await getContents()).ts, write: true }).dst;
  }
  else {
    modulePath = addTemplate({ filename: `${filename}.mjs`, getContents: async () => (await getContents()).mjs, write: true }).dst;
    addTemplate({ filename: `${filename}.d.ts`, getContents: async () => (await getContents()).dts });
  }
  addServerTemplate({ filename: `${filename}.mjs`, getContents: async () => (await getContents()).mjs });
  return modulePath;
}
