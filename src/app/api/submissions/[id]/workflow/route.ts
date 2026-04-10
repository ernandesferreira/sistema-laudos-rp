import { requireApiPermission } from "@/auth/guards";
import { workflowService } from "@/application/laudos/workflowService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "submissions.details.read");

    const { id } = await context.params;
    const workflow = await workflowService.getSubmissionWorkflowBySubmissionId(id);

    return ok({ workflow });
  } catch (error) {
    return asHttpError(error);
  }
}
