import { requireApiPermission } from "@/auth/guards";
import { createFieldSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    await requireApiPermission(_, "fields.manage");

    const { id } = await context.params;
    const fields = await laudosService.listFieldsBySectionId(id);
    return ok({ fields });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "fields.manage");

    const { id } = await context.params;
    const body = await request.json();
    const input = createFieldSchema.parse({ ...body, sectionId: id });

    const field = await laudosService.createField(input);
    return ok({ field }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
