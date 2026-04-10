import { requireApiPermission } from "@/auth/guards";
import { getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { workflowService } from "@/application/laudos/workflowService";
import { AppError } from "@/lib/errors";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "submissions.workflow.execute");

    const { id } = await context.params;
    const body = await request.json();

    const identity = getAuthIdentityFromRequest(request);
    const user = await resolveAuthUser(identity);

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const workflow = await workflowService.executeSubmissionWorkflowStep(
      {
        submissionId: id,
        stepId: body.stepId,
        decision: body.decision,
        observations: body.observations,
      },
      user,
    );

    return ok({ workflow });
  } catch (error) {
    return asHttpError(error);
  }
}
