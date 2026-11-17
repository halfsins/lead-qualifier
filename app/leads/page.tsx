import { connection } from "next/server";
import { supabase } from "@/lib/db";

// "qualified" is the default state, so it stays quiet. "failed" is the row a
// human has to act on, so it is the loudest thing on the page.
const statusStyles: Record<string, string> = {
  qualified: "border border-line text-muted",
  failed: "bg-red-600 text-white dark:bg-red-500",
  received: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300",
};

// The database stores pipeline state. These are the words a person reads.
// "qualified" is a sales term of art, so it must not appear beside a score of 1.
const statusLabels: Record<string, string> = {
  qualified: "scored",
  received: "pending",
  failed: "failed",
};

export default async function LeadsPage() {
  await connection(); // always load fresh data, never a snapshot from build time

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, company, budget_usd, score, status, summary, raw_message, notified_at, error")
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-xl font-semibold">Leads unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          The database did not respond: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1.5 text-sm text-muted">
          {leads.length} {leads.length === 1 ? "lead" : "leads"}, highest score
          first. Anything scoring 7 or above is pushed to Slack.
        </p>
      </header>

      {leads.length === 0 ? (
        <p className="rounded-md border border-line px-4 py-6 text-sm text-muted">
          No leads yet. Post one to{" "}
          <code className="font-mono text-xs">/api/leads/intake</code> and it
          will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2.5 pr-4 text-right font-medium">Score</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Lead</th>
                <th className="py-2.5 pr-4 text-right font-medium">Budget</th>
                <th className="py-2.5 pr-4 font-medium">Summary</th>
                <th className="py-2.5 pr-4 font-medium">Pinged</th>
                <th className="py-2.5 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const hot = lead.score !== null && lead.score >= 7;
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-line align-top transition-colors hover:bg-rowhover"
                  >
                    <td
                      className={`py-3 pr-4 text-right font-mono tabular-nums ${
                        hot ? "font-semibold" : "text-muted"
                      }`}
                    >
                      {lead.score ?? "—"}
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusStyles[lead.status] ?? "border border-line text-muted"
                        }`}
                      >
                        {statusLabels[lead.status] ?? lead.status}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      {lead.name ? (
                        <div className="font-medium">{lead.name}</div>
                      ) : (
                        <div className="italic text-muted">
                          {lead.raw_message.slice(0, 40)}…
                        </div>
                      )}
                      {lead.company && (
                        <div className="text-xs text-muted">{lead.company}</div>
                      )}
                    </td>

                    <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                      {lead.budget_usd !== null
                        ? `$${lead.budget_usd.toLocaleString()}`
                        : <span className="text-muted">—</span>}
                    </td>

                    <td className="max-w-[52ch] py-3 pr-4 leading-relaxed">
                      {lead.summary ?? <span className="text-muted">—</span>}
                    </td>

                    <td className="py-3 pr-4 text-center">
                      {lead.notified_at !== null ? (
                        <span aria-label="Pushed to Slack">✓</span>
                      ) : (
                        <span className="sr-only">Not pushed</span>
                      )}
                    </td>

                    <td className="py-3">
                      {lead.error ? (
                        <span className="font-mono text-xs text-red-600 dark:text-red-400">
                          {lead.error.slice(0, 60)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}