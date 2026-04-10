import { requireApiPermission } from "@/auth/guards";
import { reorderSectionsSchema } from "@/application/laudos/schemas";
import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "sections.manage");

    const { id } = await context.params;
    const body = await request.json();
    const input = reorderSectionsSchema.parse(body);

    const sections = await laudosService.reorderSections(id, input.sectionIds);
    return ok({ sections });
  } catch (error) {
    return asHttpError(error);
  }
}
