import { NextRequest, NextResponse } from "next/server";
import { CLIENT_PHOTOS_BUCKET } from "@/lib/env";
import { cleanStoragePart, requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireInternalActor(request);
    const form = await request.formData();
    const file = form.get("file");
    const clientId = String(form.get("client_id") || "");
    if (!clientId) return NextResponse.json({ error: "Cliente obrigatorio." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Foto obrigatoria." }, { status: 400 });
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Use JPG, PNG ou WEBP." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Foto acima de 5MB." }, { status: 413 });

    const { data: client, error: clientError } = await admin.from("clients").select("id,company_id").eq("id", clientId).eq("company_id", actor.company_id).single();
    if (clientError || !client) return NextResponse.json({ error: "Cliente nao encontrado na empresa." }, { status: 404 });

    const storagePath = [String(actor.company_id), clientId, "profile", `${Date.now()}-${cleanStoragePart(file.name)}`].join("/");
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await admin.storage.from(CLIENT_PHOTOS_BUCKET).upload(storagePath, buffer, { upsert: true, contentType: file.type });
    if (upload.error) throw upload.error;

    const signed = await admin.storage.from(CLIENT_PHOTOS_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    const { data, error } = await admin
      .from("clients")
      .update({ photo_storage_path: storagePath, photo_url: signed.data?.signedUrl || null, updated_at: new Date().toISOString(), updated_by: actor.id })
      .eq("id", clientId)
      .eq("company_id", actor.company_id)
      .select()
      .single();
    if (error) throw error;

    await admin.from("audit_logs").insert({ company_id: actor.company_id, user_id: actor.id, user_role: actor.role, action: "client_photo_upload", entity: "clients", entity_id: clientId, record_table: "clients", record_id: clientId });
    return NextResponse.json({ ok: true, client: data, photo_url: signed.data?.signedUrl || null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao enviar foto." }, { status: 400 });
  }
}
