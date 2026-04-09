import { createSectionSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const sections = await laudosService.listSectionsByTemplateId(id);
    return ok({ sections });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = createSectionSchema.parse({ ...body, templateId: id });

    const section = await laudosService.createSection(input);
    return ok({ section }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
