type SlackLead = {
  name: string | null;
  company: string | null;
  budgetUsd: number | null;
  score: number;
  summary: string;
};

const RETRY_DELAYS_MS = [1000, 2000, 4000];

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

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await sendToSlack(url, text);
      return; // delivered, done
    } catch (err) {
      const outOfRetries = attempt === RETRY_DELAYS_MS.length;
      if (outOfRetries) throw err; // give up: let the route record the failure

      const wait = RETRY_DELAYS_MS[attempt];
      console.warn(`Slack attempt ${attempt + 1} failed, retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
}

async function sendToSlack(url: string, text: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const reply = await res.text();
  if (!res.ok || reply !== "ok") {
    throw new Error(`Slack returned ${res.status}: ${reply.slice(0, 200)}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}