type SlackLead = {
  name: string | null;
  company: string | null;
  budgetUsd: number | null;
  score: number;
  summary: string;
};

export async function notifySlack(lead: SlackLead) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new Error("Missing SLACK_WEBHOOK_URL in .env.local");

  const budget = lead.budgetUsd !== null ? `$${lead.budgetUsd}` : "not stated";

  const text = [
    `*New lead, score ${lead.score}/10*`,
    `*Name:* ${lead.name ?? "unknown"}`,
    `*Company:* ${lead.company ?? "unknown"}`,
    `*Budget:* ${budget}`,
    `*Summary:* ${lead.summary}`,
  ].join("\n");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Slack returned ${res.status}: ${await res.text()}`);
  }
}