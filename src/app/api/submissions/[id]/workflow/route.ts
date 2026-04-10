import { requireApiPermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import { workflowService } from "@/application/laudos/workflowService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const authUser = await requireApiPermission(request, "submissions.read");

    const { id } = await context.params;
    await laudosService.getSubmissionById(id, authUser ?? undefined);
    const workflow = await workflowService.getSubmissionWorkflowBySubmissionId(id);

    return ok({ workflow });
  } catch (error) {
    return asHttpError(error);
  }
}
