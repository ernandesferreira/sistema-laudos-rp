import { submissionPayloadSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const template = await laudosService.getTemplateBySlug(slug);

    if (!template || !template.isActive) {
      return fail("Template unavailable", 404);
    }

    const body = await request.json();
    const input = submissionPayloadSchema.parse(body);

    const requiredFieldNames = template.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.required)
      .map((field) => field.name);

    const missingRequired = requiredFieldNames.filter(
      (name) => input.answers[name] === undefined || input.answers[name] === "",
    );

    if (missingRequired.length > 0) {
      return fail("Required fields are missing", 422, { missingRequired });
    }

    const submission = await laudosService.createSubmission({
      templateId: template.id,
      submittedByName: input.submittedByName ?? null,
      submittedByContact: input.submittedByContact ?? null,
      answers: input.answers,
      meta: input.meta ?? null,
    });

    return ok({ submission }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
