import { requireApiPermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "submissions.details.read");

    const { id } = await context.params;
    const submission = await laudosService.getSubmissionById(id);

    if (!submission) {
      return fail("Submission not found", 404);
    }

    return ok({ submission });
  } catch (error) {
    return asHttpError(error);
  }
}
