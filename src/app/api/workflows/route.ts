import { requireApiPermission } from "@/auth/guards";
import { workflowService } from "@/application/laudos/workflowService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "workflows.read");

    const workflows = await workflowService.listTemplateWorkflows();
    return ok({ workflows });
  } catch (error) {
    return asHttpError(error);
  }
}
