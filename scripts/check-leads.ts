// scripts/check-leads.ts
import { testLeads } from "../lib/test-leads";
import { extractLead } from "../lib/extract";

async function main() {
  const rows = [];

  for (const testLead of testLeads) {
    const lead = await extractLead(testLead.message);
    rows.push({
      id: testLead.id,
      score: lead.score,
      intent: lead.intent,
      need: lead.needSpecificity,
      budget: lead.budgetUsd,
      timeline: lead.timeline,
      firm: lead.budgetIsFirm,
      target: `${testLead.min}-${testLead.max}`,
      pass: lead.score >= testLead.min && lead.score <= testLead.max ? "PASS" : "FAIL",
      quote: lead.needQuote
    });
  }

  console.table(rows);
}

main();