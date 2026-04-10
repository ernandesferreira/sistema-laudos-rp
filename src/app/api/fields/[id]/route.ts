import { requireApiPermission } from "@/auth/guards";
import { updateFieldSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "fields.manage");

    const { id } = await context.params;
    const body = await request.json();
    const input = updateFieldSchema.parse(body);

    const field = await laudosService.updateField(id, input);
    return ok({ field });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requireApiPermission(_, "fields.manage");

    const { id } = await context.params;
    await laudosService.deleteField(id);
    return ok({ success: true });
  } catch (error) {
    return asHttpError(error);
  }
}
