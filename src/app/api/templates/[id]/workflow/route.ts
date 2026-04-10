import { requireApiPermission } from "@/auth/guards";
import { workflowService } from "@/application/laudos/workflowService";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "workflows.read");

    const { id } = await context.params;
    const workflow = await workflowService.getTemplateWorkflowByTemplateId(id);

    if (!workflow) {
      return fail("Workflow not found for template", 404);
    }

    return ok({ workflow });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "workflows.manage");

    const { id } = await context.params;
    const body = await request.json();

    const workflow = await workflowService.upsertTemplateWorkflow({
      templateId: id,
      ...body,
    });

    return ok({ workflow });
  } catch (error) {
    return asHttpError(error);
  }
}
