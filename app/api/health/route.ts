import { NextResponse } from "next/server";
import { hasSupabaseConfig, isDemoMode } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "Nex Rural",
    status: "ready",
    demo_mode: isDemoMode,
    supabase_configured: hasSupabaseConfig,
    timestamp: new Date().toISOString()
  });
}
