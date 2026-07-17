import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { cleanStoragePart } from "@/lib/security/api-auth";
import { requireAccessActor } from "@/lib/security/access";

export const runtime = "nodejs";

const allowed = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx", "csv", "kml", "kmz", "geojson", "json", "zip", "dxf", "dwg", "txt"]);
const maxBytes = 50 * 1024 * 1024;

async function resolveActor(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  try {
    const access = await requireAccessActor(request, "staff");
    return { admin, actor: { id: access.actor.actor_id, company_id: access.actor.company_id, role: access.actor.role || "staff", full_name: access.actor.full_name || "Funcionário", type: "staff" } };
  } catch {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("Sessão obrigatória.");
    const { data: authUser, error: authError } = await admin.auth.getUser(token);
    if (authError || !authUser.user) throw new Error("Sessão inválida.");
    const { data: profile, error } = await admin.from("user_profiles").select("id,company_id,role,active,full_name").eq("id", authUser.user.id).single();
    if (error || !profile?.active) throw new Error("Usuário sem perfil ativo.");
    return { admin, actor: { id: profile.id, company_id: profile.company_id, role: profile.role, full_name: profile.full_name || authUser.user.email || "Usuário", type: "admin" } };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await resolveActor(request);
    const form = await request.formData();
    const file = form.get("file");
    const taskId = String(form.get("task_id") || "");
    const shareWithClient = String(form.get("share_with_client") || "false") === "true";
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    if (!taskId) return NextResponse.json({ error: "Tarefa obrigatória." }, { status: 400 });
    if (file.size > maxBytes) return NextResponse.json({ error: "Arquivo acima de 50MB." }, { status: 400 });
    const extension = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowed.has(extension)) return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 });

    const { data: task, error: taskError } = await admin.from("workflow_tasks").select("id,company_id,title").eq("id", taskId).single();
    if (taskError || !task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    if (actor.role !== "admin_master_global" && task.company_id !== actor.company_id) return NextResponse.json({ error: "Tarefa não pertence à sua empresa." }, { status: 403 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const path = `${task.company_id}/tasks/${task.id}/${Date.now()}-${cleanStoragePart(file.name)}`;
    const { error: uploadError } = await admin.storage.from("workflow-attachments").upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) throw uploadError;

    const { data: attachment, error } = await admin
      .from("workflow_task_attachments")
      .insert({
        company_id: task.company_id,
        task_id: task.id,
        file_name: file.name,
        file_type: extension,
        mime_type: file.type || null,
        size_bytes: file.size,
        storage_path: path,
        visibility: shareWithClient ? "Compartilhável com cliente" : "Interno",
        shared_with_client: shareWithClient,
        uploaded_by: actor.id,
        uploaded_by_name: actor.full_name
      })
      .select()
      .single();
    if (error) {
      await admin.storage.from("workflow-attachments").remove([path]).catch(() => undefined);
      throw error;
    }

    await admin.from("workflow_activity_logs").insert({ company_id: task.company_id, task_id: task.id, actor_id: actor.id, actor_name: actor.full_name, action: "attachment_uploaded", metadata: { file_name: file.name } }).then(() => undefined, () => undefined);
    return NextResponse.json({ ok: true, attachment: { id: attachment.id, file_name: attachment.file_name, file_type: attachment.file_type, size_bytes: attachment.size_bytes, visibility: attachment.visibility } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao enviar anexo." }, { status: 400 });
  }
}
