"use server";

import { requireActionPermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";

export async function publishTemplateAction(templateId: string) {
  await requireActionPermission("templates.publish");

  return laudosService.updateTemplate(templateId, {
    status: "PUBLISHED",
    isActive: true,
  });
}

export async function archiveTemplateAction(templateId: string) {
  await requireActionPermission("templates.archive");

  return laudosService.updateTemplate(templateId, {
    status: "ARCHIVED",
    isActive: false,
  });
}
