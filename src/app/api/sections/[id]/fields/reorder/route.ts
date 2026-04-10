import { requireApiPermission } from "@/auth/guards";
import { reorderFieldsSchema } from "@/application/laudos/schemas";
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
    const input = reorderFieldsSchema.parse(body);

    const fields = await laudosService.reorderFields(id, input.fieldIds);
    return ok({ fields });
  } catch (error) {
    return asHttpError(error);
  }
}
