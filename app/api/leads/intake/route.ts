import { extractLead } from "@/lib/extract"

export async function POST(request: Request) {
  const body = await request.json();
  const lead = await extractLead(body.message);

  console.log(lead);

  return Response.json({ ok: true });
}