// lib/extract.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { leadSchema, extractionRules, scoreLead } from "./schema";

export async function extractLead(message: string) {
    
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: leadSchema,
    system: extractionRules,
    prompt: `Extract the facts from this inbound sales lead:\n\n${message}`,
    temperature: 0,
    abortSignal: AbortSignal.timeout(15_000),
  });

  const { score, intent } = scoreLead(object);
  return { ...object, score, intent };
}