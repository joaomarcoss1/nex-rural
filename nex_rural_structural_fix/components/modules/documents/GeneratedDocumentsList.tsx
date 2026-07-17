"use client";

import { ResponsiveDataTable, type ResponsiveRow } from "@/components/shared/ResponsiveDataTable";

export function GeneratedDocumentsList({ rows = [] }: { rows?: ResponsiveRow[] }) {
  return <ResponsiveDataTable rows={rows} columns={["title", "output_type", "status", "portal_visible", "generated_at"]} />;
}
