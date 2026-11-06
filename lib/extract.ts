import { generateText, Output } from "ai";                   // 1. new imports
import { openai } from "@ai-sdk/openai";
import { leadSchema, extractionRules, scoreLead } from "./schema";

export async function extractLead(message: string) {
  const { output } = await generateText({                    // 2 + 4. new function, result named output
    model: openai("gpt-4.1-mini"),
    output: Output.object({ schema: leadSchema }),           // 3. schema wrapped in Output.object
    system: extractionRules,
    prompt: `Extract the facts from this inbound sales lead:\n\n${message}`,
    temperature: 0,
    abortSignal: AbortSignal.timeout(15_000),                 // back to 15 seconds
  });

  const { score, intent } = scoreLead(output);                // 5. object → output
  return { ...output, score, intent };                        // 5. object → output
}