import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "O acesso antigo por código foi desativado. Use /api/access/client/login com nome completo e CPF.",
      next_endpoint: "/api/access/client/login"
    },
    { status: 410 }
  );
}
