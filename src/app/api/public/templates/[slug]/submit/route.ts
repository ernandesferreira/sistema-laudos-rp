import { createPublicSubmission } from "@/application/laudos/submissionService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const result = await createPublicSubmission({
      slug,
      payload: body,
    });

    return ok(
      {
        submission: {
          id: result.submissionId,
          submittedAt: result.submittedAt,
          template: result.template,
        },
        protocol: result.protocol,
      },
      { status: 201 },
    );
  } catch (error) {
    return asHttpError(error);
  }
}
