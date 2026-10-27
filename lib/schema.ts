// lib/schema.ts
import { z } from "zod";

// System prompt: extraction only. Scoring happens in scoreLead() below.
export const extractionRules = `Extract facts from the lead message. Use only evidence in the message; never assume missing details. Do not judge how good the lead is.`;

export const leadSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("The person's name. null if not mentioned."),

  company: z
    .string()
    .nullable()
    .describe("The company they work for or represent. null if not mentioned."),

  budgetUsd: z
    .number()
    .nullable()
    .describe("Budget in whole US dollars. '5k' means 5000. null if no budget is mentioned."),

  budgetIsFirm: z
    .boolean()
    .describe("true if they state a budget plainly, like 'Budget is $15k'. Approximate amounts like 'around 5k' still count as firm. false if the budget is hedged or uncertain, like 'maybe 2k?' or 'not sure what this costs'. false if no budget is mentioned."),

  timeline: z
    .string()
    .nullable()
    .describe("The prospect's expected timeline for starting or buying. Preserve specific dates and durations (e.g. 'October 20, 2026', 'within 2 weeks', 'Q1 2027'). Interpret 'ASAP' or 'as soon as possible' as 'Immediate'. Do not infer a timeline from intent or budget. null if no timeline is stated."),

  urgent: z
    .boolean()
    .describe("true if the message expresses urgency, such as 'ASAP', 'urgent', or 'need this, this week'."),

  requestedNextStep: z
    .boolean()
    .describe("true if they ask for a concrete next step, such as a call, meeting, quote, or proposal."),

  isPotentialCustomer: z
    .boolean()
    .describe("false if the sender is not trying to buy AI services: sales pitches, vendor solicitations, job applications, spam. true otherwise."),

  needQuote: z
    .string()
    .nullable()
    .describe("Copy, word for word, the phrase from the message that describes what they want built or done. null if they never say what they want."),

  needSpecificity: z
    .enum(["specific", "broad", "unclear"])
    .describe(
      "Classify only the needQuote phrase. " +
      "specific: says what the AI should do and for whom (e.g. 'handle after-hours support for our law firm'). " +
      "broad: names only a product type (e.g. 'a chatbot', 'an AI tool', 'automation'), even if budget or urgency is mentioned elsewhere. " +
      "unclear: needQuote is null or too vague to identify any product or task."
    ),

  summary: z
    .string()
    .describe("One sentence describing the lead."),
});

export type LeadFeatures = z.infer<typeof leadSchema>;
export type Intent = "hot" | "warm" | "cold" | "spam";

export function scoreLead(l: LeadFeatures): { score: number; intent: Intent } {
  if (!l.isPotentialCustomer) return { score: 1, intent: "spam" };

  const hasBudget = l.budgetUsd !== null && l.budgetIsFirm;
  const hasTimeline = l.timeline !== null;
  const strongSignal = l.urgent || l.requestedNextStep;

  if (l.needSpecificity === "unclear") {
    return { score: hasBudget || hasTimeline ? 4 : 3, intent: "cold" };
  }

  if (l.needSpecificity === "broad") {
    return { score: hasBudget && hasTimeline ? 6 : 5, intent: "warm" };
  }

  if (hasBudget && hasTimeline) return { score: strongSignal ? 10 : 9, intent: "hot" };
  if (hasBudget || hasTimeline) return { score: strongSignal ? 8 : 7, intent: "warm" };

  return { score: 6, intent: "warm" };
}