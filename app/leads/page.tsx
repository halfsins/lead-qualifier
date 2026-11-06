import { connection } from "next/server";
import { supabase } from "@/lib/db";

const statusStyles: Record<string, string> = {
  qualified: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  received: "bg-amber-100 text-amber-800",
};

export default async function LeadsPage() {
  await connection(); // always load fresh data, never a snapshot from build time

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, company, budget_usd, score, status, summary, raw_message, notified_at, error")
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="p-8 text-red-600">Couldn't load leads: {error.message}</p>;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Leads</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-500/30">
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Lead</th>
            <th className="py-2 pr-4">Budget</th>
            <th className="py-2 pr-4">Summary</th>
            <th className="py-2 pr-4">Pinged</th>
            <th className="py-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-500/20 align-top">
              <td className="py-2 pr-4 font-semibold">{lead.score ?? "-"}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[lead.status]}`}>
                  {lead.status}
                </span>
              </td>
              <td className="py-2 pr-4">
                <div>{lead.name ?? lead.raw_message.slice(0, 40) + "..."}</div>
                <div className="text-gray-500">{lead.company}</div>
              </td>
              <td className="py-2 pr-4">
                {lead.budget_usd !== null ? `$${lead.budget_usd.toLocaleString()}` : "-"}
              </td>
              <td className="py-2 pr-4 max-w-md">{lead.summary ?? "-"}</td>
              <td className="py-2 pr-4">{lead.notified_at !== null ? "✓" : "-"}</td>
              <td className="py-2">{lead.error?.slice(0, 60) ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}