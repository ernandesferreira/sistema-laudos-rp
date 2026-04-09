import { laudosService } from "@/application/laudos/service";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
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
