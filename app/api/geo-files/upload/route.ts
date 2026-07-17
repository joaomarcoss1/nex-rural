import { NextRequest, NextResponse } from "next/server";
import { cleanStoragePart, requireInternalActor } from "@/lib/security/api-auth";
import { requireAccessActor } from "@/lib/security/access";

export const runtime = "nodejs";
const GEO_BUCKET = "geo-files";
const allowed = new Set(["csv", "geojson", "json", "kml", "kmz", "zip", "shp", "dxf", "dwg", "pdf", "png", "jpg", "jpeg", "webp"]);

export async function POST(request: NextRequest) {
  try {
    let auth = null as Awaited<ReturnType<typeof requireInternalActor>> | null;
    let staffAuth = null as Awaited<ReturnType<typeof requireAccessActor>> | null;
    try { auth = await requireInternalActor(request); } catch { staffAuth = await requireAccessActor(request, "staff"); }
    const admin = auth?.admin || staffAuth!.admin;
    const actor = auth?.actor || { id: staffAuth!.actor.actor_id, role: staffAuth!.actor.role || "tecnico", company_id: staffAuth!.actor.company_id };
    const form = await request.formData();
    const file = form.get("file");
    const propertyId = String(form.get("property_id") || "");
    const clientId = String(form.get("client_id") || "");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    if (!propertyId || !clientId) return NextResponse.json({ error: "Cliente e imóvel obrigatórios." }, { status: 400 });
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.has(extension)) return NextResponse.json({ error: "Formato não permitido para arquivo técnico." }, { status: 400 });
    if (file.size > 80 * 1024 * 1024) return NextResponse.json({ error: "Arquivo técnico acima de 80 MB." }, { status: 400 });

    const { data: property, error: propertyError } = await admin.from("rural_properties").select("id,company_id,client_id,name").eq("id", propertyId).eq("client_id", clientId).single();
    if (propertyError || !property) return NextResponse.json({ error: "Imóvel não encontrado para este cliente." }, { status: 404 });
    if (actor.role !== "admin_master_global" && property.company_id !== actor.company_id) return NextResponse.json({ error: "Imóvel não pertence à empresa do usuário." }, { status: 403 });

    await admin.storage.createBucket(GEO_BUCKET, { public: false }).then(() => undefined, () => undefined);
    const safeName = cleanStoragePart(file.name);
    const path = `${property.company_id}/properties/${propertyId}/geo/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await admin.storage.from(GEO_BUCKET).upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) throw upload.error;
    const { data, error } = await admin.from("geo_files").insert({
      company_id: property.company_id,
      client_id: clientId,
      property_id: propertyId,
      name: file.name,
      original_filename: file.name,
      file_type: extension.toUpperCase(),
      category: extension === "csv" ? "Coordenadas" : ["zip", "shp"].includes(extension) ? "SHP compactado" : "Arquivo geoespacial",
      status: "Recebido",
      visible_on_portal: false,
      notes: extension === "csv" ? "CSV anexado. Use a importação de coordenadas para processar vértices." : "Anexo técnico salvo para conferência. Processamento automático disponível inicialmente para CSV.",
      storage_path: path,
      mime_type: file.type || null,
      extension,
      size: file.size,
      uploaded_by: actor.id,
      uploaded_at: new Date().toISOString()
    }).select().single();
    if (error) {
      await admin.storage.from(GEO_BUCKET).remove([path]).then(() => undefined, () => undefined);
      throw error;
    }
    await admin.from("audit_logs").insert({ company_id: property.company_id, user_id: actor.id, user_role: actor.role, action: "geo_file_upload", entity: "geo_files", entity_id: data.id, record_table: "geo_files", record_id: data.id, new_value: { file_type: extension, size: file.size }, user_agent: request.headers.get("user-agent") }).then(() => undefined, () => undefined);
    return NextResponse.json({ ok: true, geo_file: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao enviar arquivo técnico." }, { status: 400 });
  }
}
