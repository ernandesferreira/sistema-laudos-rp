import { laudosService } from "@/application/laudos/service";
import { asHttpError, fail, ok } from "@/lib/http";
import { updateTemplateSchema } from "@/application/laudos/schemas";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const template = await laudosService.getTemplateById(id);

    if (!template) {
      return fail("Template not found", 404);
    }

    return ok({ template });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = updateTemplateSchema.parse(body);

    const template = await laudosService.updateTemplate(id, input);

    if (!template) {
      return fail("Template not found", 404);
    }

    return ok({ template });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const deleted = await laudosService.deleteTemplate(id);

    if (!deleted) {
      return fail("Template not found", 404);
    }

    return ok({ success: true });
  } catch (error) {
    return asHttpError(error);
  }
}
