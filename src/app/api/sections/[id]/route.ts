import { updateSectionSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = updateSectionSchema.parse(body);

    const section = await laudosService.updateSection(id, input);
    return ok({ section });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    await laudosService.deleteSection(id);
    return ok({ success: true });
  } catch (error) {
    return asHttpError(error);
  }
}
