import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
    throw new Error("Missing SUPABAE_URL or SUPABASE_SECRET_KEY in .env.local");
}

export const supabase = createClient(url, key);