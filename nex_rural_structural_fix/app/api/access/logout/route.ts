import { NextRequest, NextResponse } from "next/server";
import { hashToken, readBearer, verifyAccessToken } from "@/lib/security/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  const token = readBearer(request.headers);
  if (admin && token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.sid) await admin.from("access_sessions").update({ revoked_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq("id", payload.sid).eq("session_token_hash", hashToken(token));
    } catch {}
  }
  return NextResponse.json({ ok: true });
}
