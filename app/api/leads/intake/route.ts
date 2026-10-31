import { extractLead } from "@/lib/extract";
import { supabase } from "@/lib/db";
import { notifySlack } from "@/lib/notify";

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Save the raw lead first, before anything can go wrong.
  const { data: row, error } = await supabase
    .from("leads")
    .insert({ raw_message: body.message, email: body.email })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save raw lead:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  console.log("Saved raw lead. id:", row.id);

  // 2. Run the AI.
  const lead = await extractLead(body.message);

  // 3. Save the AI's results onto the same row.
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      name: lead.name,
      company: lead.company,
      budget_usd: lead.budgetUsd,
      timeline: lead.timeline,
      intent: lead.intent,
      score: lead.score,
      summary: lead.summary,
      status: "qualified",
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("Failed to save extracted lead:", updateError);
    return Response.json({ ok: false }, { status: 500 });
  }

  console.log("Qualified lead. id:", row.id, "score:", lead.score);

  if (lead.score >= 7) {
    await notifySlack(lead);

    const { error: notifyError } = await supabase
    .from("leads")
    .update({
      notified_at: new Date().toISOString()
    })
    .eq("id", row.id);
  
  if (notifyError) {
    console.error("Pinged Slack, but failed to record notified_at:", notifyError);
  }
  }


  return Response.json({ ok: true });
}