import { NextRequest, NextResponse } from "next/server";
import { DOCUMENT_BUCKET } from "@/lib/env";
import { readBearerToken, verifyPortalToken } from "@/lib/security/portal-token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "csv", "kml", "geojson"]);

function cleanPart(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  try {
    const portal = verifyPortalToken(readBearerToken(request.headers));
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });

    const maxBytes = Number(process.env.PORTAL_UPLOAD_MAX_BYTES || 20 * 1024 * 1024);
    if (file.size > maxBytes) return NextResponse.json({ error: "Arquivo acima do limite permitido." }, { status: 413 });

    const extension = extensionFor(file.name);
    if (!allowedExtensions.has(extension)) return NextResponse.json({ error: "Formato de arquivo nao permitido." }, { status: 400 });

    const propertyId = String(form.get("property_id") || "");
    const serviceId = String(form.get("service_id") || "");
    if (propertyId) {
      const { data: property } = await admin.from("rural_properties").select("id").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("id", propertyId).single();
      if (!property) return NextResponse.json({ error: "Imovel nao pertence ao cliente do portal." }, { status: 403 });
    }
    if (serviceId) {
      const { data: service } = await admin.from("services").select("id").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("id", serviceId).single();
      if (!service) return NextResponse.json({ error: "Servico nao pertence ao cliente do portal." }, { status: 403 });
    }

    const category = cleanPart(String(form.get("category") || "Documento enviado pelo cliente"));
    const storagePath = [
      portal.company_id,
      portal.client_id,
      propertyId || "sem-imovel",
      serviceId || "sem-servico",
      category,
      "portal",
      `${Date.now()}-${cleanPart(file.name)}`
    ].join("/");

    const upload = await admin.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (upload.error) throw upload.error;

    const { data, error } = await admin
      .from("documents")
      .insert({
        company_id: portal.company_id,
        client_id: portal.client_id,
        property_id: propertyId || null,
        service_id: serviceId || null,
        name: file.name,
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        extension,
        size: file.size,
        category,
        storage_path: storagePath,
        version: 1,
        status: "Recebido pelo cliente",
        visible_on_portal: true,
        uploaded_by: `portal-${portal.client_id}`
      })
      .select()
      .single();
    if (error) throw error;

    await admin.from("audit_logs").insert({
      company_id: portal.company_id,
      user_id: null,
      user_role: "cliente",
      action: "portal_document_upload",
      entity: "documents",
      entity_id: data.id,
      record_table: "documents",
      record_id: data.id,
      new_value: { name: file.name, size: file.size, client_id: portal.client_id },
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: data.id,
        name: data.name,
        category: data.category,
        status: data.status,
        created_at: data.created_at,
        can_download: true
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no envio do arquivo." }, { status: 400 });
  }
}
