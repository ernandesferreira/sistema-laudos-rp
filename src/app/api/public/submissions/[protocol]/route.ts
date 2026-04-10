import { getFormattedSubmissionByProtocol } from "@/application/laudos/submissionService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ protocol: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { protocol } = await context.params;
    const submission = await getFormattedSubmissionByProtocol(protocol);

    return ok({
      submission,
    });
  } catch (error) {
    return asHttpError(error);
  }
}
