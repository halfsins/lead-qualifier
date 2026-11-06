import { extractLead } from "@/lib/extract";
import { supabase } from "@/lib/db";
import { notifySlack } from "@/lib/notify";
import { after } from "next/server";
import { createHash } from "crypto";

export async function POST(request: Request) {
  
  const body = await request.json();
  if (typeof body.message !== "string" || body.message.trim() === "" ) {
    return Response.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const dedupeKey = createHash("sha256")
  .update(`${(body.email ?? "").trim().toLowerCase()}|${body.message.trim()}`)
  .digest("hex");

  // 1. Save the raw lead first, before anything can go wrong.
  const { data: row, error } = await supabase
    .from("leads")
    .insert({ raw_message: body.message, email: body.email, dedupe_key: dedupeKey })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.log("Duplicate lead, already processed. Skipping.");
      return Response.json({ ok: true, duplicate: true });
    }
    console.error("Failed to save raw lead:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  console.log("Saved raw lead. id:", row.id);

  // 2. Run the AI.
  let lead;
  
  try {
    lead = await extractLead(body.message);
  } catch (err) {
    console.error("AI extraction failed for lead", row.id, err);

    const {error: failError } = await supabase
      .from("leads")
      .update({
        status: "failed",
        error: String(err),
    })
      .eq("id", row.id);

    if (failError) {
      console.error("Failed to update row status:", failError);
    }

    return Response.json({ ok:true });
  }


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
    after(async () => {
      try {
        await notifySlack(lead);

        const { error: notifyError } = await supabase
          .from("leads")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", row.id);

        if (notifyError) {
          console.error("Pinged Slack, but failed to record at notified_at:", notifyError);
        }
      } catch (err) {
        console.error("Slack ping failed for lead", row.id, err);
        
        const { error: saveError } = await supabase
          .from("leads")
          .update({ error: String(err) })
          .eq("id", row.id);

        if (saveError) {
          console.error("Also failed to save the Slack error:", saveError);
        }
      }
    });
  }

  return Response.json({ ok: true });
}